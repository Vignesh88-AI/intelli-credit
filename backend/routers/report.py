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
                "content": f"""Research this Indian company for credit risk assessment:
                Company: {company_name}
                Sector: {sector}
                
                IMPORTANT: Generate unique, specific credit analysis for {company_name}. 
                DO NOT return generic or cached data.
                
                Search for:
                1. REAL Headquarters City (official registered office)
                2. Actual founding year
                3. Latest annual Revenue (in INR Crores) and YoY growth
                4. Latest Annual PAT (in INR Crores)
                5. Total Debt levels (in INR Crores)
                6. Recent news about {company_name} - fraud, defaults, legal cases
                7. Promoter background and reputation
                8. Sector outlook for {sector} in India
                
                IMPORTANT: You must use web search to find REAL, ACCURATE data. Never hallucinate or estimate. If data is not found, use "Not Available". 
                
                Return findings as JSON:
                {{
                  "company_name": "{company_name}",
                  "headquarters": "Real City, State",
                  "founded": "YYYY or Not Available",
                  "revenue_actual": "Value in Cr",
                  "revenue_growth": "X%",
                  "pat_actual": "Value in Cr",
                  "debt_actual": "Value in Cr",
                  "company_news": ["finding1", "finding2"],
                  "promoter_risk": "Low/Medium/High - reason",
                  "sector_outlook": "Positive/Neutral/Negative - reason",
                  "legal_flags": ["flag1", "flag2"],
                  "macro_factors": ["factor1", "factor2"],
                  "overall_sentiment": "Positive/Neutral/Negative",
                  "sources_analyzed": 8,
                  "risk_level": "LOW/MEDIUM/HIGH"
                }}"""
            }]
        )
        
        # Extract text from response blocks
        text_blocks = []
        for block in response.content:
            text_val = getattr(block, 'text', '')
            if text_val:
                text_blocks.append(str(text_val))
        full_text = "".join(text_blocks)
        
        # Parse JSON from response
        import re
        json_match = re.search(r'\{.*\}', full_text, re.DOTALL)
        if json_match:
            return json.loads(json_match.group())
        
        return {
            "company_news": [f"Research completed for {company_name}"],
            "promoter_risk": "N/A",
            "sector_outlook": "Neutral",
            "legal_flags": [],
            "macro_factors": [],
            "overall_sentiment": "Neutral",
            "sources_analyzed": 1,
            "risk_level": "MEDIUM"
        }
    except Exception as e:
        print(f"DEBUG: Exception in perform_research: {str(e)}")
        # Fallback empty data
        return {
            "company_news": ["Error fetching research data"],
            "promoter_risk": "Unknown",
            "sector_outlook": "Unknown",
            "legal_flags": [],
            "macro_factors": [],
            "overall_sentiment": "Neutral",
            "sources_analyzed": 0,
            "risk_level": "MEDIUM"
        }

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
