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
        
        # PERSIST RESULT FOR DOWNLOAD
        quick_reports[report_id] = {
            "company_name": company_name,
            "scoring": scoring,
            "extracted": extracted,
            "findings": findings,
            "entity_data": entity_data
        }
        
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

@router.get("/quick-report/{report_id}")
async def get_quick_report(report_id: str):
    """Generate CAM DOCX for a quick appraisal result."""
    from fastapi import Response
    from docx import Document
    from docx.shared import Pt, RGBColor, Inches
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.oxml.ns import qn
    from docx.oxml import OxmlElement
    from datetime import datetime
    import io
    
    if report_id not in quick_reports:
        raise HTTPException(status_code=404, detail="Report not found. Please run the appraisal again.")
    
    data = quick_reports[report_id]
    company_name = data.get("company_name", "Unknown")
    scoring = data.get("scoring", {})
    extracted = data.get("extracted", {})
    findings = data.get("findings", [])
    entity_data = data.get("entity_data", {})
    
    annual = extracted.get("annual_report", {})
    
    doc = Document()
    section = doc.sections[0]
    section.left_margin = Inches(1)
    section.right_margin = Inches(1)
    
    def add_heading(text, level=1, color=(26,58,107)):
        p = doc.add_heading(text, level=level)
        for run in p.runs:
            run.font.color.rgb = RGBColor(*color)
        return p
    
    def add_kv(label, value):
        p = doc.add_paragraph()
        r1 = p.add_run(f"{label}: ")
        r1.bold = True
        r1.font.size = Pt(11)
        r2 = p.add_run(str(value) if value and value != "null" else "N/A")
        r2.font.size = Pt(11)
    
    # COVER
    title = doc.add_heading("Quick Credit Appraisal Memo", 0)
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    sub = doc.add_paragraph("VERIDEX® — CONFIDENTIAL")
    sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    doc.add_paragraph()
    add_kv("Entity", company_name)
    add_kv("Sector", entity_data.get("sector", "N/A"))
    add_kv("Loan Amount Requested", f"INR {entity_data.get('loan_amount', 'N/A')} Cr")
    add_kv("Report Date", datetime.now().strftime("%d %B %Y"))
    add_kv("Generated By", "VERIDEX AI Quick Appraisal Engine")
    doc.add_page_break()
    
    # VERDICT
    add_heading("1. Credit Decision", 1)
    add_kv("Decision", scoring.get("decision", "N/A"))
    add_kv("Intelli-Score", f"{scoring.get('score', 0)}/95")
    add_kv("Recommended Limit", f"INR {scoring.get('recommended_amount', 'N/A')} Cr")
    add_kv("Recommended Rate", scoring.get("recommended_rate", "N/A"))
    doc.add_paragraph()
    p = doc.add_paragraph()
    p.add_run("Reasoning: ").bold = True
    p.add_run(scoring.get("reasoning", ""))
    
    # FINANCIALS
    add_heading("2. Financial Summary", 1)
    fin_data = [
        ("Revenue", annual.get("revenue"), "Cr"),
        ("Net Profit (PAT)", annual.get("pat"), "Cr"),
        ("EBITDA", annual.get("ebitda"), "Cr"),
        ("Total Debt", annual.get("total_debt") or extracted.get("borrowing_profile", {}).get("total_debt"), "Cr"),
        ("Net Worth", annual.get("net_worth"), "Cr"),
        ("Total Assets", annual.get("total_assets") or extracted.get("alm_statement", {}).get("total_assets"), "Cr"),
        ("GNPA %", annual.get("gnpa_percent") or extracted.get("portfolio_cuts", {}).get("gnpa_percent"), "%"),
        ("CAR %", annual.get("car_percent"), "%"),
        ("Collection Efficiency", extracted.get("portfolio_cuts", {}).get("collection_efficiency"), "%"),
        ("Credit Rating", extracted.get("borrowing_profile", {}).get("credit_rating_long_term"), ""),
        ("Rating Outlook", extracted.get("borrowing_profile", {}).get("rating_outlook"), ""),
        ("Promoter Holding", extracted.get("shareholding_pattern", {}).get("promoter_holding"), "%"),
    ]
    table = doc.add_table(rows=1, cols=3)
    table.style = "Table Grid"
    hdr = table.rows[0].cells
    for i, h in enumerate(["Metric", "Value", "Unit"]):
        hdr[i].text = h
        hdr[i].paragraphs[0].runs[0].bold = True
    for metric, val, unit in fin_data:
        row = table.add_row().cells
        row[0].text = metric
        row[1].text = str(val) if val and val != "null" else "N/A"
        row[2].text = unit
    doc.add_paragraph()
    
    # 5Cs
    add_heading("3. Five Cs Analysis", 1)
    five_cs = scoring.get("five_cs", {})
    for c, data_c in five_cs.items():
        add_kv(c.capitalize(), f"{data_c.get('score', 0)} pts — {data_c.get('notes', '')}")
    
    # RED FLAGS
    add_heading("4. Risk Alerts", 1)
    for flag in scoring.get("red_flags", []):
        p = doc.add_paragraph(style="List Bullet")
        p.add_run(f"⚠ {flag}").font.color.rgb = RGBColor(180, 0, 0)
    
    # GREEN FLAGS
    add_heading("Positive Indicators", 2)
    for flag in scoring.get("green_flags", []):
        p = doc.add_paragraph(style="List Bullet")
        p.add_run(f"✓ {flag}").font.color.rgb = RGBColor(0, 128, 0)
    
    # SWOT
    swot = scoring.get("swot", {})
    if swot:
        add_heading("5. SWOT Analysis", 1)
        for quad, items in swot.items():
            add_kv(quad.upper(), ", ".join(items) if items else "N/A")
    
    # WEB INTEL
    add_heading("6. Web Intelligence", 1)
    if findings:
        for f in findings[:5]:
            p = doc.add_paragraph()
            p.add_run(f.get("title", "")).bold = True
            doc.add_paragraph(f.get("snippet", ""))
    else:
        doc.add_paragraph("No adverse findings in secondary research.")
    
    buffer = io.BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    
    return Response(
        content=buffer.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename=QuickCAM_{company_name.replace(' ','_')}.docx"}
    )
