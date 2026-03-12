from fastapi import APIRouter, HTTPException, Form, Response
import os
import json
import anthropic
from groq import Groq
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
import io

router = APIRouter(prefix="/api")
anthropic_client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

@router.post("/research")
async def perform_research(company_name: str = Form(...), sector: str = Form(...)):
    print(f"Researching: {company_name}")
    try:
        # Using groq_client initialized at module level (from env var)
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are a credit analyst. Return ONLY a JSON object with these fields filled with real data about the company: company_name, sector, headquarters, founded_year, revenue, pat, total_debt, net_worth, revenue_growth, de_ratio, roe, credit_decision (APPROVE/REJECT/REFER TO COMMITTEE), risk_level (LOW/MEDIUM/HIGH), positive_signals (array), risk_flags (array), latest_news (array), sector_outlook, research_summary. No markdown, no backticks, just JSON."},
                {"role": "user", "content": f"Research Indian company: {company_name}"}
            ],
            max_tokens=2000,
            temperature=0.3
        )
        text = response.choices[0].message.content
        print("GROQ RESPONSE:", text[:300])
        import re
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            return json.loads(match.group())
        raise HTTPException(status_code=500, detail="No JSON found")
    except Exception as e:
        print(f"ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-report")
async def generate_report(data: str = Form(...)):
    try:
        payload = json.loads(data)
        entity_name = payload.get('entity', {}).get('companyName', 'Entity')
        
        # Call Claude for professional CAM content
        data_context = str(data)[:15000] # Standard slicing to ensure Pyre is happy
        prompt = f"""You are a Lead Credit Officer at a top-tier Indian bank (SBI/HDFC/ICICI). 
        Generate a professional Credit Appraisal Memo (CAM) for: {entity_name}
        Sector: {payload.get('entity', {}).get('sector', 'General')}
        Data Summary: {data_context}
        
        The report must be formal, detailed, and analytical. 
        Focus on: Debt Serviceability, Promoter Pedigree, Sectoral Tailwinds, and Risk Mitigation.
        Return in professional Markdown with clear headings."""

        message = anthropic_client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=4000,
            messages=[{"role": "user", "content": prompt}]
        )
        
        cam_markdown = message.content[0].text
        
        # Generate Styled PDF with ReportLab
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        styles = getSampleStyleSheet()
        
        # Custom Styles for Premium Look
        title_style = ParagraphStyle(
            'GoldTitle',
            parent=styles['Title'],
            textColor=colors.HexColor("#f0a500"),
            fontSize=24,
            spaceAfter=30
        )
        body_style = styles['Normal']
        h1_style = ParagraphStyle(
            'H1',
            parent=styles['Heading1'],
            textColor=colors.HexColor("#0a1628"),
            fontSize=16,
            spaceBefore=12,
            spaceAfter=12
        )

        elements = []
        elements.append(Paragraph("VERIDEX® PRIVATE APPRAISAL", title_style))
        elements.append(Paragraph(f"Company: {entity_name}", styles['Heading2']))
        elements.append(Spacer(1, 24))
        
        # Parse markdown into ReportLab
        for line in cam_markdown.split('\n'):
            line = line.strip()
            if not line:
                continue
            if line.startswith('#'):
                clean_h = line.replace('#', '').strip()
                elements.append(Paragraph(clean_h, h1_style))
            else:
                elements.append(Paragraph(line, body_style))
                elements.append(Spacer(1, 8))
            
        doc.build(elements)
        buffer.seek(0)
        
        return Response(
            content=buffer.getvalue(), 
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=CAM_{entity_name.replace(' ', '_')}.pdf"}
        )
        
    except Exception as e:
        print(f"Error generating report: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
