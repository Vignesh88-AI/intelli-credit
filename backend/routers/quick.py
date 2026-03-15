from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Response
import uuid
from uuid import uuid4
import os
import json
import asyncio
import re
from typing import Dict, List
from .report import calculate_universal_score, generate_swot, tavily_client, groq_client, cached_tavily_search
import io
from datetime import datetime

try:
    import pytesseract
    from pdf2image import convert_from_bytes
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False

router = APIRouter(prefix="/api/quick")

# Global session store
quick_session = {}

MAX_PAGES = 15

def robust_json_parser(text: str) -> dict:
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
    elif filename.endswith(('.xlsx', '.xls')):
        import pandas as pd
        df_dict = pd.read_excel(io.BytesIO(contents), sheet_name=None)
        text = ""
        for sheet, df in df_dict.items():
            text += f"Sheet: {sheet}\n{df.to_string()}\n\n"
        return text
    try:
        return contents.decode('utf-8')
    except:
        return ""

def extract_any_document(text: str, company_name: str, client) -> dict:
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

@router.post("/upload")
async def quick_upload(file: UploadFile = File(...), session_id: str = Form(...)):
    contents = await file.read()
    text = extract_text_from_file(contents, file.filename)
    quick_session[session_id] = {"text": text, "filename": file.filename}
    return {
        "filename": file.filename, 
        "characters_extracted": len(text), 
        "preview": text[:300]
    }

@router.post("/analyze")
async def quick_analyze(company_name: str = Form(...), session_id: str = Form(...)):
    if session_id not in quick_session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    text = quick_session[session_id]["text"]
    extracted = extract_any_document(text, company_name, groq_client)
    
    quick_session[session_id]["extracted"] = extracted
    quick_session[session_id]["company_name"] = company_name
    
    annual = extracted.get("annual_report", {})
    borrowing = extracted.get("borrowing_profile", {})
    portfolio = extracted.get("portfolio_cuts", {})
    alm = extracted.get("alm_statement", {})
    shareholding = extracted.get("shareholding_pattern", {})
    
    financials = {
        "Revenue": annual.get("revenue"),
        "Profit": annual.get("pat"),
        "EBITDA": annual.get("ebitda"),
        "Total Debt": annual.get("total_debt") or borrowing.get("total_debt"),
        "Net Worth": annual.get("net_worth"),
        "Total Assets": annual.get("total_assets") or alm.get("total_assets"),
        "GNPA %": annual.get("gnpa_percent") or portfolio.get("gnpa_percent"),
        "CAR %": annual.get("car_percent"),
        "Collection Efficiency": portfolio.get("collection_efficiency"),
        "Credit Rating": borrowing.get("credit_rating_long_term"),
        "Rating Outlook": borrowing.get("rating_outlook"),
        "Promoter Holding": shareholding.get("promoter_holding"),
    }
    
    # Remove null values
    financials = {k: v for k, v in financials.items() if v is not None}
    quick_session[session_id]["financials"] = financials
    
    return {"company": company_name, "financials": financials}

@router.post("/score")
async def quick_score(
    session_id: str = Form(...), 
    loan_amount: str = Form("50"), 
    tenure: str = Form("36"), 
    interest_rate: str = Form("11.5"), 
    sector: str = Form("NBFC")
):
    if session_id not in quick_session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    session = quick_session[session_id]
    extracted = session.get("extracted", {})
    company_name = session.get("company_name", "Unknown Company")
    
    entity_data = {
        "company_name": company_name,
        "sector": sector,
        "loan_amount": float(loan_amount),
        "interest_rate": float(interest_rate),
        "tenure": int(tenure)
    }
    
    scoring = calculate_universal_score(company_name, extracted, [], entity_data)
    swot = generate_swot(company_name, extracted, [])
    scoring["swot"] = swot
    
    quick_session[session_id]["scoring"] = scoring
    quick_session[session_id]["entity_data"] = entity_data
    
    return scoring

@router.post("/research")
async def quick_research(session_id: str = Form(...)):
    if session_id not in quick_session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    session = quick_session[session_id]
    company_name = session.get("company_name")
    
    # Run 2 cached_tavily_search calls
    loop = asyncio.get_event_loop()
    q1 = f"{company_name} India fraud litigation NCLT default NPA 2024 2025"
    q2 = f"{company_name} India financial news credit rating 2024 2025"
    
    results = await asyncio.gather(
        loop.run_in_executor(None, lambda: cached_tavily_search(query=q1, max_results=3)),
        loop.run_in_executor(None, lambda: cached_tavily_search(query=q2, max_results=2))
    )
    
    all_results = []
    seen_urls = set()
    for res in results:
        for r in res.get("results", []):
            if r.get("url") not in seen_urls:
                all_results.append(r)
                seen_urls.add(r.get("url"))
                
    findings_text = "\n".join([f"- {r.get('title')}: {r.get('content')}" for r in all_results])
    
    prompt = f"""You are a credit risk analyst. Based on these web search results about {company_name}, provide:
1. RISK LEVEL: (LOW / MEDIUM / HIGH / CRITICAL)
2. KEY FINDINGS: List the most important findings (max 5 bullet points using * prefix)
3. SUMMARY: 2-3 sentence overall assessment

Search Results: {findings_text[:5000]}

Be factual. Only report what is actually in the results. Format exactly as shown."""

    response = groq_client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
        max_tokens=1000
    )
    groq_response_text = response.choices[0].message.content
    
    # Extract risk level
    risk_level = "MEDIUM" # Default
    if "RISK LEVEL: LOW" in groq_response_text.upper(): risk_level = "LOW"
    elif "RISK LEVEL: MEDIUM" in groq_response_text.upper(): risk_level = "MEDIUM"
    elif "RISK LEVEL: HIGH" in groq_response_text.upper(): risk_level = "HIGH"
    elif "RISK LEVEL: CRITICAL" in groq_response_text.upper(): risk_level = "CRITICAL"
    
    # Update scoring based on risk
    scoring = session.get("scoring", {})
    if risk_level == "CRITICAL":
        scoring["score"] = max(0, scoring.get("score", 0) - 20)
    elif risk_level == "HIGH":
        scoring["score"] = max(0, scoring.get("score", 0) - 10)
    
    report_id = str(uuid4())[:8]
    quick_session[session_id]["research"] = {
        "risk_level": risk_level,
        "summary": groq_response_text,
        "sources": len(all_results),
        "report_id": report_id,
        "findings": all_results
    }
    
    return {
        "risk_level": risk_level, 
        "summary": groq_response_text, 
        "sources": len(all_results), 
        "report_id": report_id
    }

@router.get("/report/{report_id}")
async def get_quick_report(report_id: str):
    # Lookup session by scanning quick_session for matching report_id
    session_found = None
    for sid, data in quick_session.items():
        if data.get("research", {}).get("report_id") == report_id:
            session_found = data
            break
            
    if not session_found:
        raise HTTPException(status_code=404, detail="Report not found")
        
    from docx import Document
    from docx.shared import Pt, RGBColor, Inches
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    
    data = session_found
    company_name = data.get("company_name", "Unknown")
    scoring = data.get("scoring", {})
    extracted = data.get("extracted", {})
    research = data.get("research", {})
    findings = research.get("findings", [])
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
        r2 = p.add_run(str(value) if value is not None and value != "null" else "N/A")
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
    add_kv("Intelli-Score", f"{scoring.get('score', 0)}/100")
    add_kv("Recommended Limit", f"INR {scoring.get('recommended_amount', 'N/A')} Cr")
    add_kv("Recommended Rate", scoring.get("recommended_rate", "N/A"))
    doc.add_paragraph()
    p = doc.add_paragraph()
    p.add_run("Reasoning: ").bold = True
    p.add_run(scoring.get("reasoning", ""))
    
    # FINANCIALS
    add_heading("2. Financial Summary", 1)
    financials = data.get("financials", {})
    table = doc.add_table(rows=len(financials) + 1, cols=2)
    table.style = "Table Grid"
    hdr = table.rows[0].cells
    hdr[0].text = "Metric"
    hdr[1].text = "Value"
    hdr[0].paragraphs[0].runs[0].bold = True
    hdr[1].paragraphs[0].runs[0].bold = True
    
    for i, (k, v) in enumerate(financials.items()):
        row = table.rows[i+1].cells
        row[0].text = k
        row[1].text = str(v)
    doc.add_paragraph()
    
    # 5Cs
    add_heading("3. Five Cs Analysis", 1)
    five_cs = scoring.get("five_cs", {})
    for c, score_val in five_cs.items():
        if isinstance(score_val, dict):
             add_kv(c.capitalize(), f"{score_val.get('score', 0)} pts — {score_val.get('notes', '')}")
        else:
             add_kv(c.capitalize(), f"{score_val} pts")
    
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
    add_kv("Risk Level", research.get("risk_level", "N/A"))
    doc.add_paragraph(research.get("summary", ""))
    
    if findings:
        add_heading("Research Sources", 2)
        for f in findings[:5]:
            p = doc.add_paragraph()
            p.add_run(f.get("title", "")).bold = True
            doc.add_paragraph(f.get("content") or f.get("snippet") or "")
    
    buffer = io.BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    
    return Response(
        content=buffer.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename=QuickCAM_{company_name.replace(' ','_')}.docx"}
    )
