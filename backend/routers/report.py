from fastapi import APIRouter, HTTPException, Form, Response
from typing import Optional
import os
import json
import anthropic
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
anthropic_client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

@router.post("/research")
async def perform_research(company_name: str = Form(...), sector: str = Form(...)):
    try:
        from tavily import TavilyClient
        tavily = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))
        
        results = tavily.search(
            query=f"{company_name} India headquarters revenue financials credit risk 2024",
            max_results=3,
            search_depth="basic"
        )
        
        context = "\n".join([r.get("content", "") for r in results.get("results", [])])
        
        from groq import Groq
        groq = Groq(api_key=os.getenv("GROQ_API_KEY"))
        
        response = groq.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": """You are a senior credit analyst. 
                Based on the search results, return ONLY this exact JSON format. 
                
                CRITICAL: All financial values (revenue, pat, total_debt, net_worth) MUST be PURE numeric strings representing amount in **INR Crores**. 
                - DO NOT include the year (e.g., "2024") inside these value fields.
                - DO NOT include words like "Cr", "Billion", or "Crores".
                - Example: If revenue is 50 billion (~5000 Cr), return "5000". If it is 200 Cr, return "200".
                
                {
                  "company_name": "",
                  "headquarters": "",
                  "founded_year": "",
                  "sector": "",
                  "revenue": "pure number string",
                  "pat": "pure number string",
                  "total_debt": "pure number string",
                  "net_worth": "pure number string",
                  "de_ratio": "",
                  "roe": "",
                  "revenue_growth": "percentage",
                  "revenue_history": [
                    {"year": "2024", "revenue_cr": "pure number string"},
                    {"year": "2023", "revenue_cr": "pure number string"},
                    {"year": "2022", "revenue_cr": "pure number string"}
                  ],
                  "credit_decision": "APPROVE or REJECT or REFER TO COMMITTEE",
                  "risk_level": "LOW or MEDIUM or HIGH",
                  "positive_signals": ["point1", "point2", "point3"],
                  "risk_flags": ["flag1", "flag2"],
                  "latest_news": ["news1", "news2"],
                  "sector_outlook": "one sentence",
                  "research_summary": "two sentences"
                }
                Find at least 3 years of revenue history if possible. Use ONLY data from search results. No markdown."""},
                {"role": "user", "content": f"Company: {company_name}\n\nSearch data:\n{context[:3000]}"}
            ],
            max_tokens=1500,
            temperature=0.1
        )
        
        import re, json
        text = response.choices[0].message.content
        print("GROQ:", text[:300])
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            return json.loads(match.group())
        return {"error": "parsing failed", "raw": text[:500]}
        
    except Exception as e:
        print(f"ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-report")
async def generate_report(data: str = Form(...)):
    try:
        payload = json.loads(data)
        entity_name = payload.get('entity', {}).get('companyName', 'Entity')
        
        # Fetch Web Intelligence Findings
        web_data = tavily_client.search(
            query=f"{entity_name} India news legal NCLT court case 2024 2025",
            max_results=3,
            search_depth="basic"
        )
        web_findings = "\n".join([
            r.get("content", "")[:200] 
            for r in web_data.get("results", [])
        ])

        # Call Anthropic for professional CAM content
        data_context = str(data)[:15000]
        prompt = f"""You are a Lead Credit Officer at a top-tier Indian bank (SBI/HDFC/ICICI). 
        Generate a professional Credit Appraisal Memo (CAM) for: {entity_name}
        Sector: {payload.get('entity', {}).get('sector', 'General')}
        Data Summary: {data_context}
        
        Web Intelligence Findings:
        {web_findings}
        
        The report must be formal, detailed, and analytical. 
        Focus on: Debt Serviceability, Promoter Pedigree, Sectoral Tailwinds, and Risk Mitigation.
        Populate the "Web Intelligence Findings" section using the provided web data.
        Return in professional Markdown with clear headings."""

        response = anthropic_client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=4000,
            system="You are a senior credit officer expert in Indian corporate lending. Generate formal CAM reports in Markdown.",
            messages=[
                {"role": "user", "content": prompt}
            ],
            temperature=0.5
        )
        
        cam_markdown = response.content[0].text
        
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
