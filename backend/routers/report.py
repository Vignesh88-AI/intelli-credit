from fastapi import APIRouter, HTTPException, Form, Response
from typing import Optional
import os
import json
from groq import Groq
from tavily import TavilyClient
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
import io
from docx import Document
from docx.shared import Inches, Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH

router = APIRouter(prefix="/api")
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
tavily_client = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))

def calculate_5cs_score(data):
    # Extract or default scores
    character = min(20, int(data.get('character_score', 14)))
    capacity = min(25, int(data.get('capacity_score', 18)))
    capital = min(20, int(data.get('capital_score', 14)))
    collateral = min(20, int(data.get('collateral_score', 14)))
    conditions = min(15, int(data.get('conditions_score', 11)))
    total = character + capacity + capital + collateral + conditions
    
    if total >= 80: grade = "A"; decision = "APPROVE"
    elif total >= 65: grade = "B"; decision = "APPROVE WITH CONDITIONS"
    elif total >= 50: grade = "C"; decision = "REFER TO CREDIT COMMITTEE"
    else: grade = "D"; decision = "REJECT"
    
    return total, grade, decision

@router.post("/research")
async def perform_research(
    company_name: str = Form(...), 
    sector: str = Form(...),
    is_deep_research: Optional[str] = Form(None)
):
    print(f"Researching: {company_name}")
    if not groq_client:
        raise HTTPException(status_code=500, detail="Groq client not initialized. Check GROQ_API_KEY.")
    
    try:
        # 1. Fetch real-time data using Tavily
        search_results = tavily_client.search(
            query=f"{company_name} India revenue financials 2024 headquarters promoter background",
            max_results=5
        )
        context = str(search_results)
        
        # 2. Use Groq to structure and score
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are a credit analyst. Extract data from the provided search results and return ONLY a JSON object. Fields: company_name, sector, headquarters, founded_year, revenue, pat, total_debt, net_worth, de_ratio, roe, positive_signals (array), risk_flags (array), latest_news (array), sector_outlook, research_summary, character_score (out of 20), capacity_score (out of 25), capital_score (out of 20), collateral_score (out of 20), conditions_score (out of 15). No markdown, no backticks."},
                {"role": "user", "content": f"Search results: {context}\n\nStructure this into JSON for: {company_name}"}
            ],
            max_tokens=2000,
            temperature=0.2
        )
        
        text = response.choices[0].message.content
        import re
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            data = json.loads(match.group())
            
            # 3. Apply 5 Cs Scoring
            total, grade, decision = calculate_5cs_score(data)
            data['total_score'] = total
            data['credit_grade'] = grade
            data['credit_decision'] = decision
            
            return data
        raise HTTPException(status_code=500, detail="No JSON found in AI response")
    except Exception as e:
        print(f"ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-report")
async def generate_report(data: str = Form(...)):
    try:
        payload = json.loads(data)
        entity_name = payload.get('entity', {}).get('companyName', 'Entity')
        
        # Call Groq for professional CAM content (Replacing Claude)
        data_context = str(data)[:15000]
        prompt = f"""You are a Lead Credit Officer at a top-tier Indian bank (SBI/HDFC/ICICI). 
        Generate a professional Credit Appraisal Memo (CAM) for: {entity_name}
        Sector: {payload.get('entity', {}).get('sector', 'General')}
        Data Summary: {data_context}
        
        The report must be formal, detailed, and analytical. 
        Focus on: Debt Serviceability, Promoter Pedigree, Sectoral Tailwinds, and Risk Mitigation.
        Return in professional Markdown with clear headings."""

        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            max_tokens=4000,
            messages=[
                {"role": "system", "content": "You are a senior credit officer expert in Indian corporate lending. Generate formal CAM reports in Markdown."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.5
        )
        
        cam_markdown = response.choices[0].message.content
        
        # Generate DOCX with python-docx
        doc = Document()
        
        # Add a professional header
        section = doc.sections[0]
        header = section.header
        header_para = header.paragraphs[0]
        header_para.text = "VERIDEX® PRIVATE APPRAISAL - CONFIDENTIAL"
        header_para.alignment = WD_ALIGN_PARAGRAPH.RIGHT

        # Title
        title = doc.add_heading("Credit Appraisal Memo (CAM)", 0)
        title.alignment = WD_ALIGN_PARAGRAPH.CENTER

        doc.add_paragraph(f"Target Entity: {entity_name}")
        doc.add_paragraph(f"Report Date: {os.popen('date /t').read().strip() if os.name == 'nt' else os.popen('date').read().strip()}")
        doc.add_page_break()

        # Parse markdown-ish content from Groq into DOCX
        for line in cam_markdown.split('\n'):
            line = line.strip()
            if not line: continue
            
            if line.startswith('###'):
                doc.add_heading(line.replace('###', '').strip(), level=3)
            elif line.startswith('##'):
                doc.add_heading(line.replace('##', '').strip(), level=2)
            elif line.startswith('#'):
                doc.add_heading(line.replace('#', '').strip(), level=1)
            elif line.startswith('- ') or line.startswith('* '):
                doc.add_paragraph(line[2:], style='List Bullet')
            else:
                doc.add_paragraph(line)

        buffer = io.BytesIO()
        doc.save(buffer)
        buffer.seek(0)
        
        return Response(
            content=buffer.getvalue(), 
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f"attachment; filename=CAM_{entity_name.replace(' ', '_')}.docx"}
        )
        
    except Exception as e:
        print(f"Error generating report: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
