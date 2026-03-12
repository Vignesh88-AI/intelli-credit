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
    print(f"Researching: {company_name}") # User requested print statement
    print(f"DEBUG: Starting real-time web research for {company_name} in {sector}")
    
    try:
        response = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=2000,
            tools=[{
                "type": "web_search_20250305",
                "name": "web_search"
            }],
            messages=[{
                "role": "user",
                "content": f"""You are a credit research analyst. Use web search to research the given Indian company. Return a JSON object with these exact fields:
                {{
                  "company_name": "{company_name}",
                  "sector": "{sector}",
                  "headquarters": "",
                  "founded_year": "",
                  "revenue": "",
                  "pat": "",
                  "total_debt": "",
                  "net_worth": "",
                  "revenue_growth": "",
                  "de_ratio": "",
                  "roe": "",
                  "credit_decision": "APPROVE or REJECT or REFER TO COMMITTEE",
                  "risk_level": "LOW or MEDIUM or HIGH",
                  "positive_signals": ["signal1", "signal2"],
                  "risk_flags": ["flag1", "flag2"],
                  "latest_news": ["news1", "news2"],
                  "sector_outlook": "",
                  "research_summary": ""
                }}
                Use real web search results only. Return ONLY the JSON."""
            }]
        )
        
        # Extract text from response blocks
        full_text = ""
        for block in response.content:
            if hasattr(block, 'text'):
                full_text += block.text
        
        print('Claude raw response:', full_text[:500])
        
        # Parse JSON from response
        import re
        # Look for the first '{' and the last '}' to handle potential preamble or postamble
        json_match = re.search(r'(\{.*\})', full_text, re.DOTALL)
        if json_match:
            try:
                result = json.loads(json_match.group(1))
                return result
            except json.JSONDecodeError as je:
                print(f"DEBUG: JSONDecodeError: {str(je)} for text: {json_match.group(1)}")
                raise HTTPException(status_code=500, detail=f"JSON Parsing Failed. Raw Response: {full_text[:500]}")
        
        raise HTTPException(status_code=500, detail=f"No JSON block found in Claude response. Raw: {full_text[:500]}")

    except Exception as e:
        print(f"DEBUG: Exception in perform_research: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
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

        message = client.messages.create(
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
