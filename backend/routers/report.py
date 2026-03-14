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

@router.post("/research")
async def perform_research(data: dict):
    try:
        company_name = data.get("company_name", "Unknown Entity")
        sector = data.get("sector", "General")
        
        # Single query = 1 credit only
        combined_query = f"{company_name} {sector} India litigation promoter fraud SEBI credit rating ICRA NCLT news 2024 2025"
        
        search_result = tavily_client.search(
            query=combined_query,
            max_results=10,
            search_depth="advanced"
        )
        
        findings = [
            {
                "title": r.get("title", ""),
                "snippet": r.get("content", "")[:300],
                "url": r.get("url", "")
            }
            for r in search_result.get("results", [])
        ]
        
        context = "Relevant Web Findings:\n" + "\n".join([f"Title: {f['title']}\nSnippet: {f['snippet']}" for f in findings])
        
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": """You are a senior Indian credit analyst. 
                Based on the search results, return ONLY this exact JSON format. 
                
                CRITICAL for Financials: All financial values MUST be PURE numeric strings (INR Crores).
                
                {
                  "company_name": "",
                  "headquarters": "",
                  "founded_year": "",
                  "sector": "",
                  "revenue": "numeric string",
                  "pat": "numeric string",
                  "total_debt": "numeric string",
                  "net_worth": "numeric string",
                  "de_ratio": "",
                  "roe": "",
                  "revenue_growth": "",
                  "revenue_history": [
                    {"year": "2024", "revenue_cr": ""},
                    {"year": "2023", "revenue_cr": ""},
                    {"year": "2022", "revenue_cr": ""}
                  ],
                  "credit_decision": "APPROVE or REJECT or REFER TO COMMITTEE",
                  "risk_level": "LOW or MEDIUM or HIGH",
                  "reasoning_engine": "Provide a 3-sentence logical base explaining WHY the verdict was given, triangulating search data.",
                  "swot": {
                    "strengths": ["point1", "point2"],
                    "weaknesses": ["point1", "point2"],
                    "opportunities": ["point1", "point2"],
                    "threats": ["point1", "point2"]
                  },
                  "market_sentiment": "Positive/Neutral/Cautious",
                  "company_news": ["Headlines 1", "Headline 2", "Headline 3"],
                  "sector_outlook": "one sentence",
                  "research_summary": "two sentences"
                }
                Use ONLY data from search results. No markdown."""},
                {"role": "user", "content": f"Company: {company_name}\n\nSearch data:\n{context[:4000]}"}
            ],
            max_tokens=1500,
            temperature=0.1
        )
        
        import re, json
        text = response.choices[0].message.content
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            final_data = json.loads(match.group())
            # Inject raw findings for frontend to display links
            final_data["findings"] = findings
            final_data["sources_analyzed"] = len(findings)
            return final_data
            
        return {"error": "parsing failed", "raw": text[:500]}

        
    except Exception as e:
        print(f"ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-cam")
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

        # Call Groq for professional CAM content as JSON (Replacing Anthropic)
        prompt = f"""Generate a comprehensive CAM report as JSON for: {payload.get('entity', {})}. 
        Web findings: {web_findings}. 
        Return JSON with exactly these fields: verdict, score, five_cs, risk_alerts, positive_indicators, web_intelligence, recommended_structure, reasoning.
        Do not include markdown formatting or extra text."""

        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are a senior credit analyst. Generate a comprehensive CAM report as JSON."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=3000,
            temperature=0.2
        )
        
        # Parse JSON response
        try:
            cam_data = json.loads(response.choices[0].message.content)
            print("CAM RESPONSE FIELDS:", list(cam_data.keys()))
            cam_markdown = f"# Credit Appraisal Memo: {entity_name}\n\n"
            cam_markdown += f"## Verdict: {cam_data.get('verdict')}\n"
            cam_markdown += f"## Score: {cam_data.get('score')}\n\n"
            cam_markdown += "### Web Intelligence Findings\n" + cam_data.get('web_intelligence', 'No findings') + "\n\n"
            cam_markdown += "### Reasoning\n" + cam_data.get('reasoning', '')
        except Exception as e:
            print(f"Error parsing Groq JSON: {e}")
            cam_markdown = response.choices[0].message.content
        print("CAM RESPONSE GENERATED. SYSTEM PROMPT USED: Senior Credit Officer Triangulation")
        # Since it's markdown, we don't have keys, but we can log the input payload keys
        print("CAM INPUT PAYLOAD FIELDS:", list(payload.keys()))
        
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
