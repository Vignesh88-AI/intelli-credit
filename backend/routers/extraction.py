from fastapi import APIRouter, HTTPException, Form
import os
import pdfplumber
import json
import pytesseract
from groq import Groq
from typing import List, Dict, Any

router = APIRouter(prefix="/api")
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

DOC_TYPE_LABELS = {
    "annual_report": "Annual Reports",
    "alm": "ALM Statement",
    "shareholding": "Shareholding Pattern",
    "borrowing_profile": "Borrowing Profile",
    "portfolio_cuts": "Portfolio Cuts"
}

GENERAL_EXTRACTION_PROMPT = """You are a senior Indian credit analyst. 
Extract financial metrics from the provided text.
CRITICAL: 
- Identify values in INR Crores (Cr) or Lakhs (L). Convert everything to Crores if possible.
- Look for GST details (GSTR-2A vs 3B mismatches).
- Check for NCLT/IBC insolvency mentions.
- Use Indian accounting terminology (e.g., Sundry Debtors, WC limits).

Return ONLY valid JSON with these keys if found:
{
  "revenue": "numeric value",
  "pat": "numeric value",
  "total_debt": "numeric value",
  "net_worth": "numeric value",
  "gnpa_percent": "numeric value",
  "car_percent": "numeric value",
  "promoter_holding": "percentage",
  "gst_mismatch": "brief description if any",
  "nclt_status": "brief description if any"
}
"""

ALM_PROMPT = """You are a financial document analyst. Extract the following fields from this ALM (Asset-Liability Management) statement. Return ONLY valid JSON, no explanation.

Required fields:
{
  "total_assets": "extract total assets value in Cr",
  "total_liabilities": "extract total liabilities in Cr",
  "short_term_assets": "assets maturing within 1 year",
  "long_term_assets": "assets maturing beyond 1 year",
  "short_term_liabilities": "liabilities due within 1 year",
  "long_term_liabilities": "liabilities due beyond 1 year",
  "liquidity_gap": "difference between short term assets and liabilities"
}

If a field is not found, use null.
"""

SHAREHOLDING_PROMPT = """You are a financial document analyst. Extract shareholding data. Return ONLY valid JSON.

Required fields:
{
  "promoter_holding": "promoter shareholding percentage",
  "fii_holding": "FII/FPI shareholding percentage",
  "dii_holding": "DII/mutual fund shareholding percentage",
  "public_holding": "public/retail shareholding percentage",
  "pledged_shares": "percentage of promoter shares pledged",
  "total_shares": "total number of shares outstanding"
}

Note: If this is a private limited company with no public shareholders, 
set public_holding to "0% (Private Company - No public float)".
If a field is not found, use null.
"""

BORROWING_PROMPT = """Extract borrowing data. Return ONLY valid JSON.
{
  "total_debt": "total outstanding borrowings in Cr",
  "ncd_outstanding": "NCD outstanding amount in Cr",
  "bank_loans": "bank term loan outstanding in Cr",
  "average_cost_of_funds": "weighted average interest rate %",
  "credit_rating_long_term": "current long term credit rating e.g. ICRA A, CARE BBB+",
  "rating_outlook": "rating outlook e.g. Stable, Negative, Watch Negative",
  "gnpa_covenant_threshold": "maximum GNPA allowed per covenant %",
  "debt_equity_ratio": "actual current debt to equity ratio"
}
NOTE: Do NOT put the covenant threshold value in gnpa_percent. 
If a field is not found use null.
"""

PORTFOLIO_CUTS_PROMPT = """Extract loan portfolio performance data. Return ONLY valid JSON.
{
  "total_aum": "Total Assets Under Management in Cr",
  "gnpa_percent": "Gross Non-Performing Assets percentage",
  "nnpa_percent": "Net Non-Performing Assets percentage",
  "collection_efficiency": "Average collection efficiency percentage",
  "ptp_30_plus": "Portfolio at Risk (30+ DPD) percentage",
  "ptp_90_plus": "Portfolio at Risk (90+ DPD) percentage",
  "top_3_states_concentration": "Percentage of portfolio in top 3 states"
}
If a field is not found use null.
"""

@router.post("/extract")
async def extract_data(file_paths: List[str] = Form(...), doc_types: List[str] = Form(...)):
    try:
        results = []
        for i, path in enumerate(file_paths):
            if not os.path.exists(path):
                continue
                
            try:
                # Extract text logic...
                text = ""
                if path.lower().endswith(".pdf"):
                    with pdfplumber.open(path) as pdf:
                        for page in pdf.pages:
                            text += page.extract_text() or ""
                
                if not text.strip():
                    # OCR fallback
                    with pdfplumber.open(path) as pdf:
                        for page in pdf.pages:
                            im = page.to_image(resolution=300).original
                            text += pytesseract.image_to_string(im)
                
                if not text.strip():
                    results.append({"file_path": path, "status": "error", "message": "No text found", "fields": {}})
                    continue

                # Select prompt based on doc type
                raw_type = doc_types[i].lower()
                detected_type = "general"
                
                if "alm" in raw_type:
                    detected_type = "alm"
                elif "shareholding" in raw_type:
                    detected_type = "shareholding"
                elif "annual" in raw_type or "report" in raw_type:
                    detected_type = "annual_report"
                elif "borrowing" in raw_type:
                    detected_type = "borrowing_profile"
                elif "portfolio" in raw_type:
                    detected_type = "portfolio_cuts"

                system_prompt = GENERAL_EXTRACTION_PROMPT
                if detected_type == "alm":
                    system_prompt = ALM_PROMPT
                elif detected_type == "shareholding":
                    system_prompt = SHAREHOLDING_PROMPT
                elif detected_type == "annual_report":
                    system_prompt = GENERAL_EXTRACTION_PROMPT
                elif detected_type == "borrowing_profile":
                    system_prompt = BORROWING_PROMPT
                elif detected_type == "portfolio_cuts":
                    system_prompt = PORTFOLIO_CUTS_PROMPT

                # Groq call for extraction
                response = client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": f"Extract financial fields from this text:\n\n{text[:15000]}"}
                    ],
                    max_tokens=1500,
                    temperature=0.1
                )
                
                response_text = response.choices[0].message.content
                extracted_json = {}
                try:
                    import re
                    match = re.search(r'\{.*\}', response_text, re.DOTALL)
                    if match:
                        extracted_json = json.loads(match.group())
                except:
                    pass

                results.append({
                    "file_path": path,
                    "original_type": doc_types[i],
                    "doc_type": detected_type,
                    "detected_type": detected_type,
                    "doc_type_label": DOC_TYPE_LABELS.get(detected_type, doc_types[i]),
                    "fields": extracted_json,
                    "status": "success"
                })
                
            except Exception as e:
                results.append({"file_path": path, "status": "error", "message": str(e), "fields": {}})
                
        return {"extractions": results}
    except Exception as e:
        return {"extractions": [], "error": str(e)}

@router.post("/analyze")
async def analyze_financials(data: str = Form(...)):
    """Deep AI Financial Analysis including GST reconciliation and NCLT checks."""
    try:
        payload = json.loads(data)
        # Combine all extracted text or fields for a holistic analysis
        prompt = f"Perform a deep financial analysis for this entity based on extracted data: {json.dumps(payload)}. focus on GST reconciliation (2A vs 3B), NCLT status, and CIBIL signal awareness. Return a JSON summary with 'verdict', 'risk_alerts', and 'positive_indicators'."
        
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are a senior credit officer specialized in Indian SME lending."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=2000,
            temperature=0.2
        )
        
        import re
        match = re.search(r'\{.*\}', response.choices[0].message.content, re.DOTALL)
        if match:
            return json.loads(match.group())
        return {"analysis": response.choices[0].message.content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/score")
async def calculate_credit_score(data: str = Form(...)):
    """Calculate Credit Score using 5 Cs Framework."""
    try:
        payload = json.loads(data)
        prompt = f"Based on this financial data: {json.dumps(payload)}, calculate a credit score (0-100) using the 5 Cs framework (Character, Capacity, Capital, Collateral, Conditions). Return JSON: {{'total_score': N, 'breakdown': {{'character': x, 'capacity': y, ...}}, 'risk_level': 'LOW|MEDIUM|HIGH'}}"
        
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are a credit scoring engine."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1000,
            temperature=0.1
        )
        
        import re
        match = re.search(r'\{.*\}', response.choices[0].message.content, re.DOTALL)
        if match:
            return json.loads(match.group())
        return {"score_data": response.choices[0].message.content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
