from fastapi import APIRouter, HTTPException, Form
import os, json, re, time, io
from typing import List
from .report import call_gemini, robust_json_parse as _robust_parse

try:
    import pytesseract
    from pdf2image import convert_from_bytes
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False

try:
    import pdfplumber
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False

router = APIRouter(prefix="/api")

DOC_TYPE_LABELS = {
    "annual_report": "Annual Reports",
    "alm": "ALM Statement",
    "shareholding": "Shareholding Pattern",
    "borrowing_profile": "Borrowing Profile",
    "portfolio_cuts": "Portfolio Cuts"
}

CONFIDENCE_MAP = {
    "annual_report": 94, "alm": 91, "shareholding": 96,
    "borrowing_profile": 89, "portfolio_cuts": 88, "general": 72
}

def robust_json_parser(text):
    """Use the robust parser from report.py."""
    return _robust_parse(text)

# ─── CHUNKED PAGE EXTRACTION ───────────────────────────────────────────────
def extract_pdf_chunked(path: str, doc_type: str, max_chars: int = 28000) -> str:
    """Extract text from large PDFs using smart chunked sampling."""
    if not PDF_AVAILABLE:
        return ""
    
    PRIORITY_KEYWORDS = [
        "Statement of Profit", "Balance Sheet", "Financial Highlights",
        "Key Ratios", "Cash Flow", "Audit", "P&L", "Profit & Loss",
        "Asset Quality", "Borrowings", "Liabilities", "Capital Adequacy",
        "Net Worth", "Total Income", "Revenue", "GNPA", "CAR", "NPA"
    ]

    with pdfplumber.open(path) as pdf:
        total_pages = len(pdf.pages)
        
        # Determine pages to read
        if total_pages <= 40:
            pages_to_read = list(range(total_pages))
        elif doc_type == "annual_report":
            # Smart sampling for large docs: first 25 + last 20 + every 4th in middle
            start = list(range(25))
            end   = list(range(max(25, total_pages - 20), total_pages))
            mid   = [p for p in range(25, total_pages - 20) if (p - 25) % 4 == 0]
            pages_to_read = sorted(set(start + mid + end))
        else:
            pages_to_read = list(range(min(total_pages, 50)))

        priority_blocks = []
        other_blocks    = []
        note_added      = False

        for idx in pages_to_read:
            page = pdf.pages[idx]
            text = page.extract_text() or ""
            
            if not text.strip() and OCR_AVAILABLE:
                try:
                    img = page.to_image(resolution=150).original
                    text = pytesseract.image_to_string(img)
                except: text = ""
            
            if len(text.strip()) < 30:
                continue

            has_priority = any(kw.lower() in text.lower() for kw in PRIORITY_KEYWORDS)
            if has_priority:
                priority_blocks.append(f"[Page {idx+1}]\n{text}")
            else:
                other_blocks.append(f"[Page {idx+1}]\n{text}")

        if total_pages > 40 and not note_added:
            priority_blocks.insert(0, f"[Note: {total_pages}-page document. Analyzed {len(pages_to_read)} sampled pages.]")

        combined = "\n\n".join(priority_blocks + other_blocks)
        return combined[:max_chars]

PROMPTS = {
    "annual_report": """You are a senior Indian credit analyst. Extract ALL financial metrics.
CRITICAL:
- All values must be in INR Crores. Convert if needed: 1 Cr = 100 Lakhs. USD billions × 8300 = INR Cr.
- Never mix units. If source has USD, convert to INR Crores.
- Extract multi-year data if available.
Return ONLY valid JSON:
{
  "revenue": null, "revenue_fy24": null, "revenue_fy23": null,
  "pat": null, "pbt": null, "ebitda": null,
  "net_profit_margin": null, "total_debt": null, "net_worth": null,
  "total_assets": null, "interest_paid": null, "dscr": null,
  "interest_coverage": null, "cash_from_operations": null,
  "gnpa_percent": null, "car_percent": null, "promoter_holding": null,
  "revenue_growth_pct": null, "auditor_remarks": null
}
Use null for not found. NO invented values.""",

    "alm": """Extract ALM data. Return ONLY valid JSON (all INR Crores):
{
  "total_assets": null, "total_liabilities": null,
  "short_term_assets": null, "long_term_assets": null,
  "short_term_liabilities": null, "long_term_liabilities": null,
  "liquidity_gap": null
}""",

    "shareholding": """Extract shareholding data. Return ONLY valid JSON:
{
  "promoter_holding": null, "fii_holding": null, "dii_holding": null,
  "public_holding": null, "pledged_shares": null, "total_shares": null
}""",

    "borrowing_profile": """Extract borrowing data (all INR Crores). Return ONLY valid JSON:
{
  "total_debt": null, "ncd_outstanding": null, "bank_loans": null,
  "average_cost_of_funds": null, "credit_rating_long_term": null,
  "rating_outlook": null, "gnpa_covenant_threshold": null,
  "debt_equity_ratio": null
}""",

    "portfolio_cuts": """Extract loan portfolio performance data. Return ONLY valid JSON:
{
  "total_aum": null, "gnpa_percent": null, "nnpa_percent": null,
  "collection_efficiency": null, "ptp_30_plus": null,
  "ptp_90_plus": null, "top_3_states_concentration": null
}"""
}

@router.post("/extract")
async def extract_data(
    file_paths: List[str] = Form(...),
    doc_types:  List[str] = Form(...),
    custom_schema: str = Form(None),
    user_notes:    str = Form(None)
):
    results = []
    for i, path in enumerate(file_paths):
        # Resolve file path
        if not os.path.exists(path):
            base = os.path.basename(path)
            alts = [f"/tmp/uploads/{base}", f"/tmp/{base}"]
            found = next((a for a in alts if os.path.exists(a)), None)
            if not found:
                results.append({"file_path": path, "status": "error",
                                 "message": f"File not found: {path}", "fields": {}})
                continue
            path = found

        try:
            raw_type = doc_types[i].lower()
            detected_type = "general"
            if "alm" in raw_type: detected_type = "alm"
            elif "shareholding" in raw_type: detected_type = "shareholding"
            elif "annual" in raw_type or "report" in raw_type: detected_type = "annual_report"
            elif "borrowing" in raw_type: detected_type = "borrowing_profile"
            elif "portfolio" in raw_type: detected_type = "portfolio_cuts"

            # Extract text
            if path.lower().endswith(".pdf"):
                final_text = extract_pdf_chunked(path, detected_type)
            elif path.lower().endswith((".xlsx",".xls")):
                import pandas as pd
                dfs = pd.read_excel(path, sheet_name=None)
                final_text = "\n\n".join([f"Sheet: {sh}\n{df.to_string()}" for sh, df in dfs.items()])[:28000]
            else:
                with open(path, "r", errors="ignore") as f:
                    final_text = f.read()[:28000]

            if not final_text.strip():
                results.append({"file_path": path, "status": "error",
                                 "message": "No text could be extracted", "fields": {}})
                continue

            # Build system prompt
            if custom_schema:
                try:
                    schema_obj = json.loads(custom_schema)
                    field_names = ", ".join(schema_obj.keys())
                    system_prompt = (f"Extract ONLY these fields: {field_names}. "
                                     f"Return ONLY valid JSON with exactly these keys. "
                                     f"All financial values in INR Crores. Use null for not found.")
                except:
                    system_prompt = PROMPTS.get(detected_type, PROMPTS["annual_report"])
            else:
                system_prompt = PROMPTS.get(detected_type, PROMPTS["annual_report"])

            user_content = f"Extract from this document:\n\n{final_text}"
            if user_notes:
                user_content += f"\n\nCredit Officer Notes: {user_notes}"

            extracted_json = {}
            for attempt in range(3):
                try:
                    sp = system_prompt
                    if attempt > 0: sp += "\nSTRICT: Return ONLY the JSON object. No extra text."
                    response_text = call_gemini(
                        sp, user_content,
                        temperature=0.05 if attempt > 0 else 0.1,
                        max_tokens=2500
                    )
                    extracted_json = robust_json_parser(response_text)
                    if extracted_json: break
                except Exception as ge:
                    print(f"Groq attempt {attempt+1} failed: {ge}")
                    time.sleep(1)

            results.append({
                "file_path": path,
                "original_type": doc_types[i],
                "doc_type": detected_type,
                "detected_type": detected_type,
                "doc_type_label": DOC_TYPE_LABELS.get(detected_type, doc_types[i]),
                "confidence": CONFIDENCE_MAP.get(detected_type, 75),
                "fields": extracted_json,
                "status": "success"
            })

        except Exception as e:
            results.append({"file_path": path, "status": "error", "message": str(e), "fields": {}})

    return {"extractions": results}

@router.post("/analyze")
async def analyze_financials(data: str = Form(...)):
    try:
        payload = json.loads(data)
        text = call_gemini(
            "You are a senior credit officer specialised in Indian SME lending.",
            f"Analyze: {json.dumps(payload)}. Return JSON: {{verdict, risk_alerts, positive_indicators}}",
            temperature=0.2, max_tokens=2000
        )
        m = re.search(r'\{.*\}', text, re.DOTALL)
        return json.loads(m.group()) if m else {"verdict": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/score")
async def calculate_credit_score(data: str = Form(...)):
    try:
        from .report import calculate_universal_score, get_decision
        payload = json.loads(data)
        
        # Extract doc structure from flat payload
        extracted_docs = {
            "annual_report": payload,
            "borrowing_profile": payload,
            "shareholding_pattern": payload,
            "portfolio_cuts": payload,
            "alm_statement": payload
        }
        entity_data = {
            "company_name": payload.get("company_name", "Unknown"),
            "sector": payload.get("sector", "NBFC"),
            "loan_amount": float(payload.get("loan_amount", 50)),
            "interest_rate": float(payload.get("interest_rate", 11.5)),
            "tenure": int(payload.get("tenure", 36))
        }
        return calculate_universal_score(payload.get("company_name","Unknown"), extracted_docs, [], entity_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
