from fastapi import APIRouter, HTTPException, Form, Response
import os
import json
import anthropic
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
import io

router = APIRouter(prefix="/api")
client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

@router.post("/research")
async def perform_research(company_name: str = Form(...), sector: str = Form(...)):
    print(f"DEBUG: Starting research for {company_name} in {sector}")
    api_key = os.getenv("ANTHROPIC_API_KEY")
    print(f"DEBUG: ANTHROPIC_API_KEY present: {bool(api_key)}")
    
    # Mock data fallback as requested
    mock_research_data = {
        "company_news": ["No recent adverse news found"],
        "promoter_risk": "Low - No negative findings",
        "sector_outlook": "Positive - NBFC sector growing",
        "legal_flags": [],
        "macro_factors": ["RBI supportive of NBFC growth"],
        "overall_sentiment": "Positive"
    }

    try:
        if not api_key:
            print("DEBUG: No API key found, returning mock data early")
            return mock_research_data

        # Prompt for research findings
        system_msg = "You are a credit risk researcher. Extract financial sentiment and return ONLY valid JSON."
        user_msg = f"""Identify and analyze for {company_name} in the {sector} sector:
        1. Recent news - fraud, defaults, legal cases
        2. Promoter background
        3. Sector outlook in India (RBI regs, headwinds)
        4. MCA filings or court cases
        5. Macroeconomic factors
        Return findings as JSON with keys: 
        company_news[], promoter_risk, sector_outlook, legal_flags[], 
        macro_factors[], overall_sentiment (Positive/Neutral/Negative) 
        Return ONLY valid JSON."""

        print("DEBUG: Calling Anthropic API...")
        message = client.messages.create(
            model="claude-3-5-sonnet-20240620",
            max_tokens=2000,
            system=system_msg,
            messages=[{"role": "user", "content": user_msg}]
        )
        
        response_text = message.content[0].text
        print(f"DEBUG: Received response: {response_text[:100]}...")
        
        # Robust parsing
        try:
            return json.loads(response_text)
        except json.JSONDecodeError:
            print("DEBUG: JSON decode failed, attempting regex extraction")
            import re
            match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if match:
                return json.loads(match.group())
            print("DEBUG: Regex extraction failed, returning mock data")
            return mock_research_data
            
    except Exception as e:
        print(f"DEBUG: Exception in perform_research: {str(e)}")
        # If anything fails, return mock data instead of 500
        return mock_research_data

@router.post("/generate-report")
async def generate_report(data: str = Form(...)): # Accepting all data as a JSON string
    try:
        payload = json.loads(data)
        
        # Call Claude for CAM content
        data_str = str(data)
        data_context = data_str[0:15000]
        prompt = f"""You are a Senior Credit Officer at an Indian bank. Generate a complete 
        Credit Appraisal Memo (CAM) for this loan application based on this data: {data_context}
        
        Sections: Executive Summary, Company Background, Financial Analysis, 5Cs Assessment, 
        SWOT Analysis, Secondary Research Findings, Risk Factors, Financial Ratios, FINAL DECISION.
        
        Be specific about Indian context (GSTR, CIBIL, RBI). Return markdown."""

        message = client.messages.create(
            model="claude-3-5-sonnet-20240620",
            max_tokens=4000,
            messages=[{"role": "user", "content": prompt}]
        )
        
        cam_markdown = message.content[0].text
        
        # Generate PDF with ReportLab
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        styles = getSampleStyleSheet()
        elements = []
        
        elements.append(Paragraph("INTELLI-CREDIT APPRAISAL MEMO", styles['Title']))
        elements.append(Spacer(1, 12))
        
        # Simple parsing of markdown into ReportLab paragraphs (simplified for now)
        for line in cam_markdown.split('\n'):
            if line.startswith('#'):
                elements.append(Paragraph(line.replace('#', '').strip(), styles['Heading1']))
            elif line.strip():
                elements.append(Paragraph(line.strip(), styles['Normal']))
            elements.append(Spacer(1, 6))
            
        doc.build(elements)
        buffer.seek(0)
        
        return Response(content=buffer.getvalue(), media_type="application/pdf")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
