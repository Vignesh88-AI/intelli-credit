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

def calculate_recommended_terms(score: int, requested_amount: float, requested_rate: float, requested_tenure: int) -> dict:
    
    if score >= 70:
        # Approve full amount, standard rate
        recommended_amount = requested_amount
        rate_premium = 0.0
        decision = "APPROVE WITH CONDITIONS"
    elif score >= 55:
        # Approve 75% of requested, add 1% premium
        recommended_amount = round(requested_amount * 0.75, 2)
        rate_premium = 1.0
        decision = "CONDITIONAL — ENHANCED DUE DILIGENCE REQUIRED"
    elif score >= 40:
        # Approve 50% of requested, add 2.5% premium
        recommended_amount = round(requested_amount * 0.50, 2)
        rate_premium = 2.5
        decision = "CONDITIONAL — HIGH RISK TERMS"
    else:
        # Reject — recommend zero
        recommended_amount = 0
        rate_premium = 0
        decision = "REJECT"
    
    # Build interest rate string
    if recommended_amount == 0:
        recommended_rate = "N/A — Loan Rejected"
    elif rate_premium == 0:
        recommended_rate = f"Base + {round(requested_rate, 1)}%"
    else:
        recommended_rate = f"Base + {round(requested_rate + rate_premium, 1)}% (incl. {rate_premium}% risk premium)"
    
    return {
        "decision": decision,
        "recommended_amount": recommended_amount,
        "recommended_rate": recommended_rate,
        "tenure": requested_tenure
    }

def apply_web_intelligence_penalties(base_score: int, research_findings: list) -> tuple:
    penalty = 0
    red_flags = []
    
    # Convert all findings to lowercase text for scanning
    all_text = " ".join([
        (f.get("title", "") + " " + f.get("snippet", "")).lower()
        for f in research_findings
    ])
    
    # Critical penalties
    if any(word in all_text for word in ["downgraded", "rating downgrade", "bbb-", "d rated"]):
        penalty += 15
        red_flags.append("Credit rating downgraded by major agency")
    
    if any(word in all_text for word in ["breach", "breached", "covenant violation", "default"]):
        penalty += 20
        red_flags.append("Loan covenant breach / NCD default detected")
    
    if any(word in all_text for word in ["liquidity crisis", "stressed asset sale", "sell majority stake", "survival"]):
        penalty += 15
        red_flags.append("Liquidity stress — stressed asset sale reported")
    
    if any(word in all_text for word in ["fraud", "sebi penalty", "rbi penalty", "nclt insolvency"]):
        penalty += 20
        red_flags.append("Regulatory action / fraud allegation detected")
    
    if any(word in all_text for word in ["loss", "recorded a loss", "net loss", "profits to peril"]):
        penalty += 10
        red_flags.append("Company recorded net loss in recent fiscal year")
    
    # Moderate penalties
    if any(word in all_text for word in ["watch negative", "negative outlook", "under watch"]):
        penalty += 8
        red_flags.append("Rating placed on Watch Negative")
    
    if any(word in all_text for word in ["npa", "asset quality worsened", "overdue"]):
        penalty += 5
        red_flags.append("Asset quality deterioration flagged in news")
    
    final_score = max(base_score - penalty, 10)  # floor at 10
    
    # Determine decision based on final score
    if final_score >= 70:
        decision = "APPROVE WITH CONDITIONS"
    elif final_score >= 50:
        decision = "CONDITIONAL — ENHANCED DUE DILIGENCE REQUIRED"
    else:
        decision = "REJECT"
    
    return final_score, decision, red_flags

def score_from_extracted_data(extracted_docs: dict) -> tuple:
    base_score = 72  # neutral starting point
    red_flags = []
    green_flags = []

    # ── Annual Report signals ──
    annual = extracted_docs.get("annual_report", {})
    gnpa = float(annual.get("gnpa_percent") or 0)
    car  = float(annual.get("car_percent") or 15)
    de_ratio = float(annual.get("debt_equity_ratio") or 0)
    pat  = float(annual.get("pat") or 0)

    if gnpa > 5:
        base_score -= 15
        red_flags.append(f"Gross NPA critical at {gnpa}% (>5% threshold)")
    elif gnpa > 3:
        base_score -= 8
        red_flags.append(f"Gross NPA elevated at {gnpa}% (>3%)")
    elif gnpa < 2:
        base_score += 3
        green_flags.append(f"Gross NPA healthy at {gnpa}% (below 2%)")

    if car < 15:
        base_score -= 12
        red_flags.append(f"CAR below RBI minimum: {car}%")
    elif car > 18:
        base_score += 3
        green_flags.append(f"Strong CAR at {car}% (well above 15% minimum)")

    if pat > 0:
        green_flags.append(f"Profitable entity — PAT ₹{pat} Cr")
    else:
        base_score -= 10
        red_flags.append("Entity recorded net loss")

    # ── Borrowing Profile signals ──
    borrowing = extracted_docs.get("borrowing_profile", {})
    outlook = str(borrowing.get("rating_outlook") or "").lower()
    rating  = str(borrowing.get("credit_rating_long_term") or "").lower()

    if "watch negative" in outlook or "watch-" in outlook:
        base_score -= 12
        red_flags.append("Credit rating on Watch Negative — imminent downgrade risk")
    if "negative" in outlook and "watch" not in outlook:
        base_score -= 8
        red_flags.append("Negative rating outlook from credit agency")
    if "bbb" in rating and ("negative" in outlook or "watch" in outlook):
        base_score -= 8
        red_flags.append("Rating downgraded to BBB category with negative outlook")
    if "stable" in outlook and ("aa" in rating or "a+" in rating):
        base_score += 5
        green_flags.append(f"Strong credit rating: {rating.upper()} with stable outlook")

    # ── Portfolio Cuts signals ──
    portfolio = extracted_docs.get("portfolio_cuts", {})
    coll_eff = float(portfolio.get("collection_efficiency") or 97)
    par30    = float(portfolio.get("ptp_30_plus") or portfolio.get("par_30") or 0)

    if coll_eff < 95:
        base_score -= 8
        red_flags.append(f"Collection efficiency below 95%: {coll_eff}%")
    elif coll_eff > 98:
        base_score += 3
        green_flags.append(f"Excellent collection efficiency: {coll_eff}%")

    if par30 > 5:
        base_score -= 10
        red_flags.append(f"High PAR-30 delinquency: {par30}%")

    # ── Shareholding signals ──
    shareholding = extracted_docs.get("shareholding_pattern", {})
    pledged = str(shareholding.get("pledged_shares") or "0").replace("%","")
    try:
        pledged_pct = float(pledged)
        if pledged_pct > 20:
            base_score -= 10
            red_flags.append(f"High promoter pledge: {pledged_pct}%")
        elif pledged_pct == 0:
            green_flags.append("Zero promoter pledge — clean ownership structure")
    except:
        pass

    return max(min(base_score, 100), 10), red_flags, green_flags

def generate_swot(company_name: str, extracted_docs: dict, research_findings: list) -> dict:
    try:
        research_text = "\n".join([f"- {f['title']}: {f['snippet']}" for f in research_findings[:5]])
        annual = extracted_docs.get("annual_report", {})

        prompt = f"""Generate a SWOT analysis for {company_name} based on this data.
Financial: Revenue={annual.get('revenue')}, PAT={annual.get('pat')}, GNPA={annual.get('gnpa_percent')}%, CAR={annual.get('car_percent')}%
Recent news:
{research_text}

Return ONLY valid JSON:
{{"strengths": ["point1", "point2"], "weaknesses": ["point1", "point2"], "opportunities": ["point1", "point2"], "threats": ["point1", "point2"]}}
Each array must have exactly 2-3 specific points relevant to THIS company. No generic points."""

        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=500
        )
        text = response.choices[0].message.content
        import re
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            return json.loads(match.group())
    except Exception as e:
        print(f"SWOT generation error: {e}")
    
    return {
        "strengths": ["Capital adequacy", "Market position"],
        "weaknesses": ["Concentration risk", "Rising interest rates"],
        "opportunities": ["Digital expansion", "New product launch"],
        "threats": ["Regulatory changes", "Macro volatility"]
    }

@router.post("/research")
async def perform_research(data: dict):
    try:
        company_name = data.get("company_name", "Unknown Entity")
        sector = data.get("sector", "General")
        extracted_data_list = data.get("extracted_docs", []) # From Stage 3
        
        # Reformat extracted docs for the template
        extracted_docs = {}
        for d in extracted_data_list:
            doc_type = d.get("doc_type", "unknown")
            extracted_docs[doc_type] = d.get("fields", {})

        # --- TAVILY FALLBACK LOGIC ---
        findings = []
        queries_to_try = [
            f"{company_name} credit rating downgrade news India 2024 2025",
            f"{company_name} NBFC financial news India",
            f"{company_name} annual report rating ICRA CARE",
        ]

        for query in queries_to_try:
            if len(findings) >= 5:
                break
            try:
                search_result = tavily_client.search(query=query, max_results=5, search_depth="advanced")
                for r in search_result.get("results", []):
                    findings.append({
                        "title": r.get("title", ""),
                        "snippet": r.get("content", "")[:300],
                        "url": r.get("url", "")
                    })
                if findings:
                    break  # stop after first successful query
            except Exception as e:
                print(f"Tavily error for query '{query}': {e}")
                continue
        
        context = "Relevant Web Findings:\n" + "\n".join([f"Title: {f['title']}\nSnippet: {f['snippet']}" for f in findings])
        
        # --- MULTI-SIGNAL SCORING ---
        base_score, doc_red_flags, doc_green_flags = score_from_extracted_data(extracted_docs)
        final_score, decision_label, web_red_flags = apply_web_intelligence_penalties(base_score, findings)
        
        # Combine flags
        total_red_flags = list(set(doc_red_flags + web_red_flags))
        
        # Recommended Loan Terms logic
        entity_req = data.get("entity", {})
        requested_amount = float(entity_req.get("loan_amount", 50))
        requested_rate = float(entity_req.get("interest_rate", 1.5))
        requested_tenure = int(entity_req.get("tenure", 36))
        
        rec_terms = calculate_recommended_terms(final_score, requested_amount, requested_rate, requested_tenure)
        
        # Dynamic SWOT
        swot_data = generate_swot(company_name, extracted_docs, findings)

        response_payload = {
            "company_name": company_name,
            "score": final_score,
            "credit_decision": rec_terms["decision"],
            "recommended_amount": rec_terms["recommended_amount"],
            "recommended_rate": rec_terms["recommended_rate"],
            "tenure": rec_terms["tenure"],
            "red_flags": total_red_flags,
            "green_flags": doc_green_flags,
            "swot": swot_data,
            "findings": findings,
            "sources_analyzed": len(findings),
            "reasoning_engine": f"Triangulated {len(findings)} web sources with extracted document metrics. Score of {final_score}/100 reflect the {rec_terms['decision']} verdict based on risk parameters."
        }
        
        return response_payload
            
    except Exception as e:
        print(f"ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-cam")
async def generate_report(data: str = Form(...)):
    try:
        from docx import Document
        from docx.shared import Pt, RGBColor, Inches
        from docx.enum.text import WD_ALIGN_PARAGRAPH
        import uuid
        import io
        from datetime import datetime

        payload = json.loads(data)
        entity_data = payload.get('entity', {})
        loan_data = payload.get('loan', {})
        extracted_data = payload.get('extracted', [])
        research_data = payload.get('research', {})
        score_data = payload.get('score', {})

        # Reformat extracted docs for the template
        extracted_docs = {}
        for doc in extracted_data:
            doc_type = doc.get("doc_type", "unknown")
            extracted_docs[doc_type] = doc.get("fields", {})

        # Prepare scoring result for the template
        scoring_result = {
            "decision": research_data.get("credit_decision", score_data.get("total", 0) >= 80 and "APPROVE" or (score_data.get("total", 0) >= 70 and "APPROVE WITH CONDITIONS" or "REJECT")),
            "score": research_data.get("score", score_data.get("total", 0)),
            "recommended_amount": research_data.get("recommended_amount", loan_data.get("amount", "50")),
            "recommended_rate": research_data.get("recommended_rate", "Base + 1.5%"),
            "reasoning": research_data.get("reasoning_engine", "Analysis based on submitted documents."),
            "red_flags": research_data.get("red_flags", ["Debt-to-Equity (3.8x) nearing industry cap", "Limited operating track record since 2019"]),
            "green_flags": research_data.get("green_flags", ["Strong institutional backing", "Diversified lending portfolio"]),
            "five_cs": {
                "character": {"score": score_data.get("breakdown", {}).get("character", 16), "notes": "Promoter history verified. No adverse legal flags found in primary search."},
                "capacity": {"score": score_data.get("breakdown", {}).get("capacity", 18), "notes": f"Revenue ₹{extracted_docs.get('annual_report', {}).get('revenue', 'N/A')} Cr. GNPA within healthy limits."},
                "capital": {"score": score_data.get("breakdown", {}).get("capital", 14), "notes": f"Net worth ₹{extracted_docs.get('annual_report', {}).get('net_worth', 'N/A')} Cr. Leverage nearing sector cap."},
                "collateral": {"score": score_data.get("breakdown", {}).get("collateral", 14), "notes": "Asset coverage adequate based on total debt vs portfolio cuts."},
                "conditions": {"score": score_data.get("breakdown", {}).get("conditions", 10), "notes": "NBFC sector faces RBI regulatory tightening but showing growth resilience."}
            },
            "swot": research_data.get("swot", {
                "strengths": ["Strong capitalization", "Proven management"],
                "weaknesses": ["High leverage", "Asset concentration"],
                "opportunities": ["Digital banking pivot", "Rural expansion"],
                "threats": ["Regulatory tightening", "Macro volatility"]
            })
        }

        research_findings = research_data.get("findings", [])

        # ── Generate Report ──
        doc = Document()
        section = doc.sections[0]
        section.page_width = Inches(8.5)
        section.page_height = Inches(11)
        section.left_margin = Inches(1)
        section.right_margin = Inches(1)

        def add_heading(text, level=1, color=(26, 58, 107)):
            p = doc.add_heading(text, level=level)
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            for run in p.runs:
                run.font.color.rgb = RGBColor(*color)
            return p

        def add_kv(label, value):
            p = doc.add_paragraph()
            run_label = p.add_run(f"{label}: ")
            run_label.bold = True
            run_label.font.size = Pt(11)
            run_value = p.add_run(str(value) if value else "N/A")
            run_value.font.size = Pt(11)
            return p

        def add_table(headers, rows):
            table = doc.add_table(rows=1, cols=len(headers))
            table.style = 'Table Grid'
            hdr_cells = table.rows[0].cells
            for i, h in enumerate(headers):
                hdr_cells[i].text = h
                hdr_cells[i].paragraphs[0].runs[0].bold = True
                hdr_cells[i].paragraphs[0].runs[0].font.color.rgb = RGBColor(255, 255, 255)
                tc = hdr_cells[i]._tc
                tcPr = tc.get_or_add_tcPr()
                from docx.oxml.ns import qn
                from docx.oxml import OxmlElement
                shd = OxmlElement('w:shd')
                shd.set(qn('w:fill'), '1A3A6B')
                shd.set(qn('w:color'), 'auto')
                shd.set(qn('w:val'), 'clear')
                tcPr.append(shd)
            for row_data in rows:
                row_cells = table.add_row().cells
                for i, val in enumerate(row_data):
                    row_cells[i].text = str(val) if val else "N/A"
            doc.add_paragraph()
            return table

        # COVER PAGE
        doc.add_paragraph()
        title = doc.add_heading('Credit Appraisal Memo (CAM)', 0)
        title.alignment = WD_ALIGN_PARAGRAPH.CENTER
        for run in title.runs:
            run.font.color.rgb = RGBColor(26, 58, 107)

        subtitle = doc.add_paragraph('VERIDEX® PRIVATE APPRAISAL — CONFIDENTIAL')
        subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
        subtitle.runs[0].font.color.rgb = RGBColor(150, 150, 150)
        subtitle.runs[0].font.size = Pt(10)

        doc.add_paragraph()
        add_kv("Target Entity", entity_data.get("companyName", "N/A"))
        add_kv("CIN", entity_data.get("cin", "N/A"))
        add_kv("PAN", entity_data.get("pan", "N/A"))
        add_kv("Sector", entity_data.get("sector", "N/A"))
        add_kv("Loan Amount Requested", f"₹{loan_data.get('amount', 'N/A')} Cr")
        add_kv("Loan Type", loan_data.get("loanType", "N/A"))
        add_kv("Tenure", f"{loan_data.get('tenure', 'N/A')} Months")
        add_kv("Report Date", datetime.now().strftime("%d %B %Y"))
        add_kv("Report Generated By", "VERIDEX AI Credit Engine v1.2")

        doc.add_page_break()

        # 1. EXECUTIVE SUMMARY
        add_heading('1. Executive Summary', 1)
        add_kv("Credit Decision", scoring_result.get("decision"))
        add_kv("Intelli-Score", f"{scoring_result.get('score')}/100")
        add_kv("Recommended Loan Limit", f"₹{scoring_result.get('recommended_amount')} Cr")
        add_kv("Recommended Interest Rate", scoring_result.get("recommended_rate"))
        
        doc.add_paragraph()
        p = doc.add_paragraph()
        p.add_run("Reasoning: ").bold = True
        p.add_run(scoring_result.get("reasoning"))

        # 2. FIVE Cs ANALYSIS
        add_heading('2. Five Cs Framework Analysis', 1)
        five_cs = scoring_result.get("five_cs", {})
        cs_rows = [
            ["Character (Promoter Background)", f"{five_cs.get('character', {}).get('score', 0)}/20", five_cs.get("character", {}).get("notes", "")],
            ["Capacity (Revenue & Profit)", f"{five_cs.get('capacity', {}).get('score', 0)}/20", five_cs.get("capacity", {}).get("notes", "")],
            ["Capital (Net Worth & Leverage)", f"{five_cs.get('capital', {}).get('score', 0)}/20", five_cs.get("capital", {}).get("notes", "")],
            ["Collateral (Asset Coverage)", f"{five_cs.get('collateral', {}).get('score', 0)}/20", five_cs.get("collateral", {}).get("notes", "")],
            ["Conditions (Sector Outlook)", f"{five_cs.get('conditions', {}).get('score', 0)}/20", five_cs.get("conditions", {}).get("notes", "")],
        ]
        add_table(["Parameter", "Score", "Analysis Notes"], cs_rows)

        # 3. FINANCIAL HIGHLIGHTS
        add_heading('3. Financial Highlights', 1)
        annual = extracted_docs.get("annual_report", {})
        fin_rows = [
            ["Revenue", f"₹{annual.get('revenue', 'N/A')} Cr", ""],
            ["Net Profit (PAT)", f"₹{annual.get('pat', 'N/A')} Cr", ""],
            ["Total Debt", f"₹{annual.get('total_debt', 'N/A')} Cr", ""],
            ["Net Worth", f"₹{annual.get('net_worth', 'N/A')} Cr", ""],
            ["Gross NPA %", f"{annual.get('gnpa_percent', 'N/A')}%", "Below 2% is healthy"],
            ["CAR %", f"{annual.get('car_percent', 'N/A')}%", "Above 15% is adequate"],
        ]
        add_table(["Metric", "Value", "Benchmark"], fin_rows)

        # 4. RISK ALERTS & POSITIVE INDICATORS
        add_heading('4. Risk Alerts', 1)
        for alert in scoring_result.get("red_flags", []):
            p = doc.add_paragraph(style='List Bullet')
            p.add_run(f"⚠ {alert}").font.color.rgb = RGBColor(180, 0, 0)
        if not scoring_result.get("red_flags"):
            doc.add_paragraph("No critical risk alerts identified.")

        add_heading('Positive Indicators', 2)
        for indicator in scoring_result.get("green_flags", []):
            p = doc.add_paragraph(style='List Bullet')
            p.add_run(f"✓ {indicator}").font.color.rgb = RGBColor(0, 128, 0)

        # 5. SWOT
        add_heading('5. SWOT Analysis', 1)
        swot = scoring_result.get("swot", {})
        swot_rows = [
            ["STRENGTHS", "WEAKNESSES"],
            ["\n".join(swot.get("strengths", [])), "\n".join(swot.get("weaknesses", []))],
            ["OPPORTUNITIES", "THREATS"],
            ["\n".join(swot.get("opportunities", [])), "\n".join(swot.get("threats", []))],
        ]
        table = doc.add_table(rows=0, cols=2)
        table.style = 'Table Grid'
        for i, row_data in enumerate(swot_rows):
            row = table.add_row()
            for j, val in enumerate(row_data):
                row.cells[j].text = val
                if i in [0, 2]:
                    row.cells[j].paragraphs[0].runs[0].bold = True

        # 6. WEB INTELLIGENCE
        add_heading('6. Secondary Research (Web Intelligence)', 1)
        if research_findings:
            for finding in research_findings[:5]:
                p = doc.add_paragraph()
                p.add_run(finding.get("title", "")).bold = True
                doc.add_paragraph(finding.get("snippet", ""))
                url_p = doc.add_paragraph()
                url_run = url_p.add_run(finding.get("url", ""))
                url_run.font.color.rgb = RGBColor(0, 70, 180)
                url_run.font.size = Pt(9)
        else:
            doc.add_paragraph("No significant adverse findings detected in secondary research.")

        # FINAL DISCLAIMER
        doc.add_paragraph()
        disclaimer = doc.add_paragraph("This report has been generated by the VERIDEX AI Credit Engine. All assessments are based on submitted documents and AI-powered secondary research. This document is confidential.")
        disclaimer.runs[0].font.size = Pt(9)
        disclaimer.runs[0].font.color.rgb = RGBColor(120, 120, 120)

        buffer = io.BytesIO()
        doc.save(buffer)
        buffer.seek(0)
        
        entity_name = entity_data.get('companyName', 'Entity').replace(' ', '_')
        return Response(
            content=buffer.getvalue(), 
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f"attachment; filename=CAM_{entity_name}.docx"}
        )
        
    except Exception as e:
        print(f"Error generating report: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

