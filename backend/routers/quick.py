from fastapi import APIRouter, UploadFile, File, Form, HTTPException
import uuid
import os
import json
from typing import Dict
from .report import calculate_universal_score, generate_swot
# Import helper functions from main or common utils if they exist
# For now, I'll assume I can import or redefine needed logic.
# Actually, I should check report.py for helpers like do_research or similar.
import sys
from .report import tavily_client, groq_client
import io

try:
    import pytesseract
    from pdf2image import convert_from_bytes
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False

router = APIRouter(prefix="/api")

# Temporary in-memory storage for quick reports (would be Redis/DB in prod)
quick_reports = {}

MAX_PAGES = 15

def extract_text_from_file(contents: bytes, filename: str) -> str:
    import io
    if filename.endswith('.pdf'):
        import pdfplumber
        text = ""
        with pdfplumber.open(io.BytesIO(contents)) as pdf:
            total_pages = len(pdf.pages)
            if total_pages > MAX_PAGES:
                text += f"[Note: Document has {total_pages} pages. Analyzing first {MAX_PAGES} only.]\n\n"
            
            for page in pdf.pages[:MAX_PAGES]:
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
    # Fallback for text-based or others
    try:
        return contents.decode('utf-8')
    except:
        return ""

def extract_any_document(text: str, company_name: str, client) -> dict:
    prompt = f"""Extract all available financial metrics from this document about {company_name}.
Return ONLY valid JSON with any fields you can find:
{{
  "annual_report": {{
    "revenue": null, "pat": null, "total_debt": null, "net_worth": null,
    "gnpa_percent": null, "car_percent": null
  }},
  "borrowing_profile": {{
    "total_debt": null, "credit_rating_long_term": null, "rating_outlook": null
  }},
  "portfolio_cuts": {{
    "gnpa_percent": null, "collection_efficiency": null, "total_aum": null
  }},
  "shareholding_pattern": {{
    "promoter_holding": null, "pledged_shares": null
  }},
  "alm_statement": {{
    "total_assets": null, "total_liabilities": null, "liquidity_gap": null
  }}
}}
Fill in whatever you can find. Use null for anything not found. Document:
{text[:4000]}"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1,
        max_tokens=1000
    )
    import json
    text_resp = response.choices[0].message.content.replace("```json","").replace("```","").strip()
    return json.loads(text_resp)

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

        # 2. Run AI extraction on whatever doc type it is
        extracted = extract_any_document(text, company_name, groq_client)

        # 3. Run web research (strictly 1 credit Tavily call)
        findings = []
        try:
            search_query = f"{company_name} India financial results 2024 financials revenue profit"
            search_result = tavily_client.search(query=search_query, max_results=3, search_depth="basic")
            for r in search_result.get("results", []):
                findings.append({
                    "title": r.get("title", ""),
                    "snippet": r.get("content", "")[:300],
                    "url": r.get("url", "")
                })
        except Exception as se:
            print(f"Tavily search failed in quick-appraisal: {se}")

        # 4. Run universal scoring
        entity_data = {
            "company_name": company_name,
            "sector": sector,
            "loan_amount": float(loan_amount),
            "interest_rate": float(interest_rate),
            "tenure": int(tenure)
        }
        scoring = calculate_universal_score(
            company_name,
            extracted,
            findings,
            entity_data
        )

        # 5. Result
        report_id = str(uuid.uuid4())[:8]
        # In a real app, we'd generate the file here and store it.
        # For the hackathon, we'll return the same scoring as enough.
        
        return {
            "scoring": scoring,
            "extracted": extracted,
            "findings": findings,
            "report_id": report_id
        }
    except Exception as e:
        print(f"Quick Appraisal Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
