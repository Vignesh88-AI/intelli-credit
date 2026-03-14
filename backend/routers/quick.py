from fastapi import APIRouter, UploadFile, File, Form, HTTPException
import uuid
import os
import json
import asyncio
import re
from typing import Dict, List
from .report import calculate_universal_score, generate_swot, tavily_client, groq_client, cached_tavily_search
import io

try:
    import pytesseract
    from pdf2image import convert_from_bytes
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False

router = APIRouter(prefix="/api")

# Temporary in-memory storage for quick reports
quick_reports = {}

MAX_PAGES = 15

def robust_json_parser(text: str) -> dict:
    """Strip markdown fences and parse JSON with regex fallback."""
    if not text: return {}
    clean_text = text.replace("```json", "").replace("```", "").strip()
    try:
        return json.loads(clean_text)
    except:
        pass
    try:
        match = re.search(r'\{.*\}', clean_text, re.DOTALL)
        if match:
            return json.loads(match.group())
    except:
        pass
    return {}

def extract_text_from_file(contents: bytes, filename: str) -> str:
    if filename.endswith('.pdf'):
        import pdfplumber
        text = ""
        with pdfplumber.open(io.BytesIO(contents)) as pdf:
            total_pages = len(pdf.pages)
            # For quick appraisal, we still cap it or follow similar logic to extraction.py
            # But here we'll keep it simple: first 15 pages.
            pages_to_read = pdf.pages[:MAX_PAGES]
            
            for page in pages_to_read:
                page_text = page.extract_text() or ""
                if page_text and len(page_text.strip()) > 50:
                    text += page_text + "\n"
                elif OCR_AVAILABLE:
                    try:
                        img = page.to_image(resolution=150).original
                        ocr_text = pytesseract.image_to_string(img)
                        text += ocr_text + "\n"
                    except:
                        text += "[Scanned page — OCR failed]\n"
                else:
                    text += "[Scanned page — OCR not available]\n"
        return text.strip()
    elif filename.endswith('.docx'):
        from docx import Document
        doc = Document(io.BytesIO(contents))
        return "\n".join([p.text for p in doc.paragraphs])
    try:
        return contents.decode('utf-8')
    except:
        return ""

def extract_any_document(text: str, company_name: str, client) -> dict:
    # Use 20,000 characters for context as requested
    prompt = f"""You are a senior Indian credit analyst. Extract ALL financial data from this {company_name} document. 
Look for: revenue/total income, PAT/net profit, total debt/borrowings, net worth/equity, GNPA%, CAR%, promoter holding%, pledged shares%, credit rating, rating outlook, total AUM, collection efficiency. 
Convert all values to INR Crores. 

Return ONLY valid JSON matching this EXACT schema — use null for not found:
{{
  "annual_report": {{
    "revenue": null, "pat": null, "pbt": null, "ebitda": null, "total_debt": null, "net_worth": null, 
    "total_assets": null, "gnpa_percent": null, "car_percent": null, "interest_coverage": null, 
    "cash_from_operations": null, "auditor_remarks": null
  }},
  "borrowing_profile": {{
    "total_debt": null, "credit_rating_long_term": null, "rating_outlook": null, "average_cost_of_funds": null
  }},
  "shareholding_pattern": {{
    "promoter_holding": null, "pledged_shares": null, "fii_holding": null
  }},
  "portfolio_cuts": {{
    "gnpa_percent": null, "nnpa_percent": null, "collection_efficiency": null, "total_aum": null
  }},
  "alm_statement": {{
    "total_assets": null, "total_liabilities": null, "liquidity_gap": null
  }}
}}

Document Text:
{text[:20000]}"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1,
        max_tokens=2048
    )
    return robust_json_parser(response.choices[0].message.content)

@router.post("/quick-appraisal")
async def quick_appraisal(
    file: UploadFile = File(...),
    company_name: str = Form(...),
    sector: str = Form("NBFC"),
    loan_amount: str = Form("50"),
    tenure: str = Form("36"),
    interest_rate: str = Form("11.5")
):
    try:
        # 1. Extract text from uploaded file
        contents = await file.read()
        text = extract_text_from_file(contents, file.filename)

        # 2. Run AI extraction
        extracted = extract_any_document(text, company_name, groq_client)

        # 3. Run parallel web research (2 queries as requested)
        loop = asyncio.get_event_loop()
        queries = [
            f"{company_name} India financial results 2024 financials revenue profit",
            f"{company_name} India credit rating news risk 2024 2025"
        ]
        
        async def fetch_search(query):
            return await loop.run_in_executor(
                None, 
                lambda: cached_tavily_search(query=query, max_results=3)
            )
            
        search_responses = await asyncio.gather(*(fetch_search(q) for q in queries))
        
        # Flatten and deduplicate findings
        unique_findings = {}
        for resp in search_responses:
            for r in resp.get("results", []):
                url = r.get("url")
                if url and url not in unique_findings:
                    unique_findings[url] = {
                        "title": r.get("title", "No Title"),
                        "snippet": r.get("content", "")[:300],
                        "url": url
                    }
        findings = list(unique_findings.values())

        # 4. Run universal scoring
        entity_data = {
            "company_name": company_name,
            "sector": sector,
            "loan_amount": float(loan_amount),
            "interest_rate": float(interest_rate),
            "tenure": int(tenure)
        }
        
        # Scoring expects the dict with keys like 'annual_report', 'borrowing_profile', etc.
        scoring = calculate_universal_score(
            company_name,
            extracted,
            findings,
            entity_data
        )

        # 5. Result - flattened structure for frontend
        report_id = str(uuid.uuid4())[:8]
        
        return {
            "scoring": scoring,
            "extracted": extracted, # This is the dict with doc categories
            "findings": findings,
            "report_id": report_id
        }
    except Exception as e:
        print(f"Quick Appraisal Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
