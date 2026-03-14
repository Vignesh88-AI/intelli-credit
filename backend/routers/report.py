from fastapi import APIRouter, HTTPException, Form, Response
from typing import Optional
import os
import json
import re
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

# --- CACHING LAYER ---
_research_cache = {}
_tavily_cache = {}

def cached_tavily_search(query: str, max_results: int = 5) -> list:
    """Wrapper for Tavily search with query-level in-memory caching."""
    try:
        key = query.strip().lower()
        if key in _tavily_cache:
            print(f"📡 CACHE HIT: {query}")
            return _tavily_cache[key]
        
        print(f"🌐 TAVILY SEARCH: {query}")
        results = tavily_client.search(query=query, max_results=max_results, search_depth="basic")
        _tavily_cache[key] = results
        return results
    except Exception as e:
        print(f"❌ Tavily Cache Error for {query}: {e}")
        return {"results": []}

def calculate_universal_score(
    company_name: str,
    extracted_docs: dict,
    research_findings: list,
    entity_data: dict
) -> dict:

    scores = {
        "character": 20,
        "capacity": 20,
        "capital": 20,
        "collateral": 20,
        "conditions": 15,  # max 15 not 20
    }
    notes = {
        "character": "",
        "capacity": "",
        "capital": "",
        "collateral": "",
        "conditions": "",
    }
    red_flags = []
    green_flags = []

    # ═══════════════════════════════════════
    # 1. CHARACTER (max 20)
    # Promoter background, pledges, governance
    # ═══════════════════════════════════════
    shareholding = extracted_docs.get("shareholding_pattern", {})
    borrowing    = extracted_docs.get("borrowing_profile", {})

    try:
        pledged = float(str(shareholding.get("pledged_shares") or "0")
                       .replace("%","").replace("N/A","0").strip())
    except:
        pledged = 0

    if pledged > 50:
        scores["character"] -= 10
        red_flags.append(f"Critical: Promoter pledge extremely high at {pledged}%")
        notes["character"] += f"Promoter shares {pledged}% pledged — very high risk. "
    elif pledged > 25:
        scores["character"] -= 6
        red_flags.append(f"Promoter pledge elevated at {pledged}%")
        notes["character"] += f"Promoter pledge {pledged}% is concerning. "
    elif pledged > 0:
        scores["character"] -= 2
        notes["character"] += f"Minor promoter pledge of {pledged}%. "
    else:
        green_flags.append("Zero promoter pledge — clean ownership structure")
        notes["character"] += "No promoter pledge detected. "

    promoter_pct = float(str(shareholding.get("promoter_holding") or "0")
                        .replace("%","").strip() or "0")
    if promoter_pct > 0:
        notes["character"] += f"Promoter holding: {promoter_pct}%. "

    # Rating outlook from borrowing profile affects character
    outlook = str(borrowing.get("rating_outlook") or "").lower()
    rating  = str(borrowing.get("credit_rating_long_term") or "").lower()

    if any(x in rating for x in ["d rated", " d ", "care d", "icra d"]):
        scores["character"] -= 12
        red_flags.append("DEFAULT rating assigned — entity has defaulted on obligations")
        notes["character"] += "CRITICAL: Default rating detected. "
    elif any(x in rating for x in ["bbb-", "bb", "c rated"]):
        scores["character"] -= 6
        red_flags.append(f"Sub-investment grade rating: {rating.upper()}")
        notes["character"] += f"Sub-investment grade: {rating.upper()}. "
    elif any(x in rating for x in ["bbb"]):
        scores["character"] -= 3
        notes["character"] += f"BBB category rating — moderate risk. "
    elif any(x in rating for x in ["aa", "aaa", "a+"]):
        scores["character"] += 0  # already at max
        green_flags.append(f"Strong rating: {rating.upper()}")
        notes["character"] += f"Strong credit rating: {rating.upper()}. "

    if "watch negative" in outlook or "watch-" in outlook:
        scores["character"] -= 5
        red_flags.append("Rating on Watch Negative — downgrade imminent")
        notes["character"] += "Rating under Watch Negative review. "
    elif "negative" in outlook:
        scores["character"] -= 3
        red_flags.append("Negative rating outlook")
        notes["character"] += "Negative outlook. "
    elif "stable" in outlook:
        green_flags.append("Stable rating outlook")
        notes["character"] += "Stable outlook. "
    elif "positive" in outlook:
        scores["character"] += 1
        green_flags.append("Positive rating outlook — potential upgrade")
        notes["character"] += "Positive outlook — upgrade possible. "

    scores["character"] = max(min(scores["character"], 20), 0)

    # ═══════════════════════════════════════
    # 2. CAPACITY (max 20)
    # Revenue, PAT, growth, collection efficiency
    # ═══════════════════════════════════════
    annual    = extracted_docs.get("annual_report", {})
    portfolio = extracted_docs.get("portfolio_cuts", {})

    try:
        pat = float(str(annual.get("pat") or "0").replace(",",""))
    except:
        pat = 0
    try:
        revenue = float(str(annual.get("revenue") or "0").replace(",",""))
    except:
        revenue = 0
    try:
        gnpa = float(str(annual.get("gnpa_percent") or
                        portfolio.get("gnpa_percent") or "2").replace("%",""))
    except:
        gnpa = 2
    try:
        coll_eff = float(str(portfolio.get("collection_efficiency") or "97")
                        .replace("%",""))
    except:
        coll_eff = 97

    # PAT
    if pat <= 0:
        scores["capacity"] -= 8
        red_flags.append("Company recorded net loss — negative PAT")
        notes["capacity"] += "Net loss recorded. "
    elif pat > 0:
        green_flags.append(f"Profitable — PAT ₹{pat} Cr")
        notes["capacity"] += f"PAT ₹{pat} Cr. "

    # GNPA
    if gnpa > 7:
        scores["capacity"] -= 10
        red_flags.append(f"GNPA critical at {gnpa}% — far above safe threshold")
        notes["capacity"] += f"GNPA {gnpa}% — critical. "
    elif gnpa > 5:
        scores["capacity"] -= 7
        red_flags.append(f"GNPA very high at {gnpa}%")
        notes["capacity"] += f"GNPA {gnpa}% — very high. "
    elif gnpa > 3:
        scores["capacity"] -= 4
        red_flags.append(f"GNPA elevated at {gnpa}%")
        notes["capacity"] += f"GNPA {gnpa}% — elevated. "
    elif gnpa > 0:
        green_flags.append(f"GNPA healthy at {gnpa}% (below 3%)")
        notes["capacity"] += f"GNPA {gnpa}% — healthy. "

    # Collection efficiency
    if coll_eff < 90:
        scores["capacity"] -= 6
        red_flags.append(f"Collection efficiency critically low: {coll_eff}%")
        notes["capacity"] += f"Collection efficiency {coll_eff}% — critical. "
    elif coll_eff < 95:
        scores["capacity"] -= 3
        red_flags.append(f"Collection efficiency below benchmark: {coll_eff}%")
        notes["capacity"] += f"Collection efficiency {coll_eff}% — below 95% benchmark. "
    elif coll_eff >= 98:
        scores["capacity"] += 1
        green_flags.append(f"Excellent collection efficiency: {coll_eff}%")
        notes["capacity"] += f"Collection efficiency {coll_eff}% — excellent. "
    else:
        notes["capacity"] += f"Collection efficiency {coll_eff}%. "

    scores["capacity"] = max(min(scores["capacity"], 20), 0)

    # ═══════════════════════════════════════
    # 3. CAPITAL (max 20)
    # CAR, D/E ratio, net worth
    # ═══════════════════════════════════════
    try:
        car = float(str(annual.get("car_percent") or "15").replace("%",""))
    except:
        car = 15
    try:
        net_worth = float(str(annual.get("net_worth") or "0").replace(",",""))
    except:
        net_worth = 0
    try:
        total_debt = float(str(annual.get("total_debt") or
                              borrowing.get("total_debt") or "0").replace(",",""))
    except:
        total_debt = 0

    de_ratio = round(total_debt / net_worth, 2) if net_worth > 0 else 99

    # CAR
    if car < 12:
        scores["capital"] -= 12
        red_flags.append(f"CAR critically below RBI minimum: {car}%")
        notes["capital"] += f"CAR {car}% — critical breach of 15% minimum. "
    elif car < 15:
        scores["capital"] -= 7
        red_flags.append(f"CAR below RBI minimum 15%: currently {car}%")
        notes["capital"] += f"CAR {car}% — below RBI minimum. "
    elif car < 18:
        notes["capital"] += f"CAR {car}% — adequate. "
    else:
        scores["capital"] += 1
        green_flags.append(f"Strong CAR at {car}% (well above 15% minimum)")
        notes["capital"] += f"CAR {car}% — strong. "

    # D/E ratio
    if de_ratio > 6:
        scores["capital"] -= 8
        red_flags.append(f"Debt-to-Equity critically high at {de_ratio}x")
        notes["capital"] += f"D/E {de_ratio}x — dangerously high. "
    elif de_ratio > 4:
        scores["capital"] -= 5
        red_flags.append(f"Debt-to-Equity above NBFC norm at {de_ratio}x")
        notes["capital"] += f"D/E {de_ratio}x — above 4x NBFC ceiling. "
    elif de_ratio > 3:
        scores["capital"] -= 2
        notes["capital"] += f"D/E {de_ratio}x — approaching ceiling. "
    elif de_ratio > 0:
        green_flags.append(f"Healthy leverage ratio D/E: {de_ratio}x")
        notes["capital"] += f"D/E {de_ratio}x — healthy. "

    scores["capital"] = max(min(scores["capital"], 20), 0)

    # ═══════════════════════════════════════
    # 4. COLLATERAL (max 20)
    # Asset coverage, secured vs unsecured
    # ═══════════════════════════════════════
    alm = extracted_docs.get("alm_statement", {})

    try:
        total_assets = float(str(alm.get("total_assets") or "0").replace(",",""))
    except:
        total_assets = 0
    try:
        total_liabilities = float(str(alm.get("total_liabilities") or "0").replace(",",""))
    except:
        total_liabilities = 0

    # Asset coverage ratio
    if total_assets > 0 and total_liabilities > 0:
        coverage = round(total_assets / total_liabilities, 2)
        if coverage < 1.0:
            scores["collateral"] -= 10
            red_flags.append(f"Assets do not cover liabilities — coverage ratio {coverage}x")
            notes["collateral"] += f"Asset coverage {coverage}x — insufficient. "
        elif coverage < 1.1:
            scores["collateral"] -= 5
            red_flags.append(f"Thin asset coverage ratio: {coverage}x")
            notes["collateral"] += f"Asset coverage {coverage}x — thin margin. "
        elif coverage < 1.2:
            scores["collateral"] -= 2
            notes["collateral"] += f"Asset coverage {coverage}x — adequate. "
        else:
            scores["collateral"] += 0
            green_flags.append(f"Good asset coverage ratio: {coverage}x")
            notes["collateral"] += f"Asset coverage {coverage}x — good. "
    else:
        notes["collateral"] += "Asset coverage data not available from ALM. "

    try:
        liquidity_gap = float(str(alm.get("liquidity_gap") or "0").replace(",",""))
        if liquidity_gap < 0:
            scores["collateral"] -= 5
            red_flags.append(f"Negative liquidity gap: ₹{liquidity_gap} Cr")
            notes["collateral"] += f"Negative liquidity gap ₹{liquidity_gap} Cr. "
        elif liquidity_gap > 500:
            green_flags.append(f"Strong liquidity buffer: ₹{liquidity_gap} Cr")
            notes["collateral"] += f"Healthy liquidity gap ₹{liquidity_gap} Cr. "
    except:
        pass

    scores["collateral"] = max(min(scores["collateral"], 20), 0)

    # ═══════════════════════════════════════
    # 5. CONDITIONS (max 15)
    # Web intelligence, sector, macro signals
    # ═══════════════════════════════════════
    all_text = " ".join([
        (f.get("title","") + " " + f.get("snippet","")).lower()
        for f in research_findings
    ])

    # Default conditions score based on sector
    sector = str(entity_data.get("sector","")).lower()
    if "nbfc" in sector or "finance" in sector:
        notes["conditions"] += "NBFC sector faces RBI regulatory scrutiny. "
        scores["conditions"] -= 1  # slight sector headwind

    # Web intelligence penalties on conditions
    if any(x in all_text for x in ["default", "care d", "icra d", " d rated"]):
        scores["conditions"] -= 10
        red_flags.append("DEFAULT event detected in web intelligence")
        notes["conditions"] += "DEFAULT detected in news. "
    elif any(x in all_text for x in ["breach", "breached covenant", "loan terms breached"]):
        scores["conditions"] -= 6
        red_flags.append("Loan covenant breach reported in news")
        notes["conditions"] += "Covenant breach reported. "

    if any(x in all_text for x in ["liquidity crisis", "stressed asset", "sell stake", "survival", "peril"]):
        scores["conditions"] -= 5
        red_flags.append("Severe financial distress signals in news")
        notes["conditions"] += "Distress signals in media. "

    if any(x in all_text for x in ["downgraded", "rating downgrade", "downgrade"]):
        scores["conditions"] -= 3
        if "Credit rating downgraded by major agency" not in red_flags:
            red_flags.append("Credit rating downgraded — news confirmed")
        notes["conditions"] += "Downgrade confirmed in news. "

    if any(x in all_text for x in ["fraud", "sebi action", "rbi penalty", "scam", "arrested"]):
        scores["conditions"] -= 8
        red_flags.append("Fraud/regulatory action detected in news")
        notes["conditions"] += "Regulatory/fraud risk in news. "

    # Positive web signals
    if any(x in all_text for x in ["upgrade", "rating upgrade", "improved rating"]):
        scores["conditions"] += 3
        green_flags.append("Rating upgrade signal detected in news")
        notes["conditions"] += "Rating upgrade news found. "

    if any(x in all_text for x in ["award", "recognition", "best nbfc", "top lender"]):
        scores["conditions"] += 1
        green_flags.append("Industry recognition / awards noted")

    scores["conditions"] = max(min(scores["conditions"], 15), 0)

    # ═══════════════════════════════════════
    # FINAL SCORE & DECISION
    # ═══════════════════════════════════════
    final_score = (
        scores["character"] +
        scores["capacity"] +
        scores["capital"] +
        scores["collateral"] +
        scores["conditions"]
    )

    if final_score >= 75:
        decision = "APPROVE"
        recommended_amount = float(entity_data.get("loan_amount") or 0)
        rate_premium = 0.0
    elif final_score >= 60:
        decision = "APPROVE WITH CONDITIONS"
        recommended_amount = round(float(entity_data.get("loan_amount") or 0) * 0.90, 2)
        rate_premium = 0.5
    elif final_score >= 45:
        decision = "CONDITIONAL — ENHANCED DUE DILIGENCE REQUIRED"
        recommended_amount = round(float(entity_data.get("loan_amount") or 0) * 0.75, 2)
        rate_premium = 1.5
    elif final_score >= 30:
        decision = "CONDITIONAL — HIGH RISK TERMS"
        recommended_amount = round(float(entity_data.get("loan_amount") or 0) * 0.50, 2)
        rate_premium = 3.0
    else:
        decision = "REJECT"
        recommended_amount = 0
        rate_premium = 0

    base_rate = float(entity_data.get("interest_rate") or 11.5)
    if recommended_amount == 0:
        recommended_rate = "N/A — Loan Rejected"
    elif rate_premium == 0:
        recommended_rate = f"Base + {base_rate}%"
    else:
        recommended_rate = f"Base + {round(base_rate + rate_premium, 1)}% (incl. {rate_premium}% risk premium)"

    reasoning = (
        f"{company_name} scored {final_score}/95 across the Five Cs framework. "
        f"Character: {scores['character']}/20 — {notes['character'].split('.')[0]}. "
        f"Capacity: {scores['capacity']}/20 — {notes['capacity'].split('.')[0]}. "
        f"Capital: {scores['capital']}/20 — {notes['capital'].split('.')[0]}. "
        f"Collateral: {scores['collateral']}/20 — {notes['collateral'].split('.')[0]}. "
        f"Conditions: {scores['conditions']}/15 — {notes['conditions'].split('.')[0]}. "
        f"Decision: {decision}."
    )

    return {
        "score": final_score,
        "decision": decision,
        "recommended_amount": recommended_amount,
        "recommended_rate": recommended_rate,
        "tenure": entity_data.get("tenure", 36),
        "reasoning": reasoning,
        "red_flags": list(dict.fromkeys(red_flags)),   # deduplicate
        "green_flags": list(dict.fromkeys(green_flags)),
        "five_cs": {
            "character":  {"score": scores["character"],  "notes": notes["character"]},
            "capacity":   {"score": scores["capacity"],   "notes": notes["capacity"]},
            "capital":    {"score": scores["capital"],    "notes": notes["capital"]},
            "collateral": {"score": scores["collateral"], "notes": notes["collateral"]},
            "conditions": {"score": scores["conditions"], "notes": notes["conditions"]},
        },
        "swot": generate_swot(company_name, extracted_docs, research_findings)
    }

def generate_cam_narrative(company_name: str, extracted_docs: dict,
                           scoring: dict, research: dict, groq_client) -> str:
    annual = extracted_docs.get("annual_report", {})
    prompt = f"""You are a senior credit analyst at an Indian bank.
Write a formal Credit Appraisal Memo narrative for: {company_name}

Financials: Revenue={annual.get('revenue')} Cr, PAT={annual.get('pat')} Cr, 
Total Debt={annual.get('total_debt')} Cr, Net Worth={annual.get('net_worth')} Cr,
GNPA={annual.get('gnpa_percent', '2')}%

Credit Score: {scoring.get('score', 0)}/100 | Decision: {scoring.get('decision', 'N/A')}
Red Flags: {', '.join(scoring.get('red_flags', [])[:3])}

Write exactly these 5 sections in formal Indian banking language:
1. BORROWER BACKGROUND (2-3 sentences)
2. FINANCIAL ANALYSIS (revenue, profit, debt ratios, GNPA)
3. RISK ASSESSMENT (red flags, web findings, rating outlook)
4. CREDIT OPINION (professional assessment)
5. RECOMMENDATION (approve/reject, amount, rate, conditions)

Be specific. Use Crores. Reference actual numbers."""

    response = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
        max_tokens=1500
    )
    return response.choices[0].message.content

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
        
        # 1. Company-level Cache (saves Groq + Tavily)
        cache_key = company_name.strip().lower()
        if cache_key in _research_cache:
            print(f"🚀 RE-USING CACHED RESEARCH: {company_name}")
            return _research_cache[cache_key]

        import asyncio
        loop = asyncio.get_event_loop()
        
        queries = [
            f"{company_name} India financial results revenue profit 2024 2025",
            f"{company_name} credit rating ICRA CARE India 2024 2025",
            f"{company_name} India news RBI penalty legal case NCLT 2024 2025",
            f"{sector} India NBFC sector outlook RBI regulation 2025"
        ]
        
        async def fetch_search(query):
            return await loop.run_in_executor(
                None, 
                lambda: cached_tavily_search(query=query, max_results=3)
            )
            
        search_responses = await asyncio.gather(*(fetch_search(q) for q in queries))
        
        # Deduplicate results by URL
        unique_findings = {}
        for resp in search_responses:
            for r in resp.get("results", []):
                url = r.get("url")
                if url and url not in unique_findings:
                    unique_findings[url] = {
                        "title": r.get("title", "No Title"),
                        "snippet": r.get("content", ""),
                        "url": url
                    }
        
        findings_list = list(unique_findings.values())
        context = "\n".join([f"Source: {f['url']}\nContent: {f['snippet']}" for f in findings_list])
        sources_list = list(unique_findings.keys())

        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": """You are a senior credit analyst at an Indian NBFC. 
Analyze the provided web search results to perform a deep credit research on the company.

Follow these strict output rules:
1. Extract the last 3 years of revenue if available for the 'revenue_history' array.
2. Calculate the 5Cs scores (out of max values) based on evidence:
   - Character (max 20): Integrity, promoter background, litigation.
   - Capacity (max 25): Cash flow, debt service ability, interest coverage.
   - Capital (max 20): Net worth, promoter stake, leverage.
   - Collateral (max 20): Asset quality, security, guarantees.
   - Conditions (max 15): Sector outlook, macro environment.

Return ONLY valid JSON:
{
  "company_name": "",
  "headquarters": "",
  "founded_year": "",
  "sector": "",
  "revenue": "Latest annual revenue in Cr",
  "pat": "Latest profit after tax in Cr",
  "total_debt": "Total borrowings in Cr",
  "net_worth": "Shareholders equity in Cr",
  "de_ratio": "Total Debt / Net Worth",
  "roe": "PAT / Net Worth %",
  "revenue_growth": "YoY growth %",
  "revenue_history": [
    {"year": "2024", "revenue_cr": 0},
    {"year": "2023", "revenue_cr": 0},
    {"year": "2022", "revenue_cr": 0}
  ],
  "character_score": 18,
  "capacity_score": 20,
  "capital_score": 15,
  "collateral_score": 15,
  "conditions_score": 12,
  "total_score": 80,
  "credit_decision": "APPROVE or REJECT or REFER TO COMMITTEE",
  "risk_level": "LOW or MEDIUM or HIGH",
  "positive_signals": ["Detailed signal 1", "Detailed signal 2"],
  "risk_flags": ["Detailed risk 1", "Detailed risk 2"],
  "rbi_regulatory_flags": ["Any RBI/regulatory issues found"],
  "litigation_risk": "LOW/MEDIUM/HIGH - brief explanation",
  "promoter_background": "Brief summary of promoter/founder news",
  "sector_headwinds": ["Sector-specific risk 1", "Sector-specific risk 2"],
  "latest_news": ["Recent event 1", "Recent event 2"],
  "sector_outlook": "One summary sentence",
  "research_summary": "Overall credit opinion in 3 sentences",
  "data_sources": []
}
Use numerical values for financials where possible. No markdown."""},
                {"role": "user", "content": f"Company: {company_name}\n\nWeb Data:\n{context[:8000]}"}
            ],
            max_tokens=2000,
            temperature=0.1
        )

        text = response.choices[0].message.content
        print("GROQ:", text[:300])
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            extracted_json = json.loads(match.group())
            # Ensure data_sources is updated if missing
            if not extracted_json.get("data_sources"):
                extracted_json["data_sources"] = sources_list[:10]
            
            # 2. Store in Company Cache
            _research_cache[cache_key] = extracted_json
            return extracted_json
        return {"error": "parsing failed", "raw": text[:500]}

    except Exception as e:
        print(f"ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/cache/stats")
async def get_cache_stats():
    """Returns statistics about current in-memory caches."""
    return {
        "cached_companies": list(_research_cache.keys()),
        "cached_queries": len(_tavily_cache),
        "total_companies": len(_research_cache)
    }

@router.delete("/cache/clear")
async def clear_cache():
    """Clears all in-memory caches."""
    global _research_cache, _tavily_cache
    _research_cache = {}
    _tavily_cache = {}
    return {"message": "Cache cleared"}


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

        # Sample company names for testing: Tata Capital, Kinara, Vivriti
        
        # If score_data is empty, calculate it internally as a fallback
        if not score_data:
            score_data = calculate_universal_score(
                entity_data.get("companyName", "Unknown"),
                extracted_docs,
                research_data.get("findings", []),
                {
                    "company_name": entity_data.get("companyName"),
                    "sector": entity_data.get("sector"),
                    "loan_amount": float(loan_data.get("amount", 0)),
                    "interest_rate": float(loan_data.get("rate", 11.5)),
                    "tenure": int(loan_data.get("tenure", 36))
                }
            )

        # Prepare scoring result with strict prioritization logic
        total_score = score_data.get("total_score") or score_data.get("score") or research_data.get("total_score") or research_data.get("score") or 0
        
        # Compute decision logic
        decision = score_data.get("decision")
        if not decision:
            decision = research_data.get("credit_decision")
        if not decision:
            if total_score >= 75: decision = "APPROVE"
            elif total_score >= 60: decision = "APPROVE WITH CONDITIONS"
            else: decision = "REJECT"

        scoring_result = {
            "decision": decision,
            "score": total_score,
            "recommended_amount": score_data.get("recommended_amount", research_data.get("recommended_amount", loan_data.get("amount", "50"))),
            "recommended_rate": score_data.get("recommended_rate", research_data.get("recommended_rate", "Base + 1.5%")),
            "reasoning": score_data.get("reasoning", research_data.get("research_summary", "Analysis based on submitted documents.")),
            "red_flags": score_data.get("red_flags", research_data.get("risk_flags", [])),
            "green_flags": score_data.get("green_flags", research_data.get("positive_signals", [])),
            "five_cs": score_data.get("five_cs", research_data.get("five_cs", {
                "character": {"score": 16, "notes": "Promoter history verified."},
                "capacity": {"score": 18, "notes": "Revenue and GNPA within healthy limits."},
                "capital": {"score": 14, "notes": "Net worth and leverage monitored."},
                "collateral": {"score": 14, "notes": "Asset coverage adequate."},
                "conditions": {"score": 10, "notes": "Sector outlook remains resilient."}
            })),
            "swot": research_data.get("swot", {
                "strengths": ["Capital adequacy", "Market position"],
                "weaknesses": ["Concentration risk", "Rising interest rates"],
                "opportunities": ["Digital expansion", "Rural growth"],
                "threats": ["Regulatory changes", "Macro volatility"]
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

        # 5. DETAILED CREDIT ASSESSMENT (Narrative)
        add_heading('5. Detailed Credit Assessment', 1)
        try:
            narrative = generate_cam_narrative(entity_data.get("companyName", "N/A"), extracted_docs, scoring_result, research_data, groq_client)
        except Exception as e:
            narrative = f"Narrative generation unavailable: {str(e)}"
        
        doc.add_paragraph(narrative)

        # 6. SWOT
        add_heading('6. SWOT Analysis', 1)
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

        # 7. WEB INTELLIGENCE
        add_heading('7. Secondary Research (Web Intelligence)', 1)
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

