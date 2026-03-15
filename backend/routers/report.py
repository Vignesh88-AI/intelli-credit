from fastapi import APIRouter, HTTPException, Form, Response
from typing import Optional
import os, json, re, io
from groq import Groq
from tavily import TavilyClient
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

router = APIRouter(prefix="/api")
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
tavily_client = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))

_research_cache = {}
_tavily_cache   = {}

# ═══════════════════════════════════════════════════════════════
# UTILITIES
# ═══════════════════════════════════════════════════════════════
def safe_float(v, default=0.0):
    try: return float(str(v).replace(",","").replace("₹","").replace("%","").replace("INR","").strip())
    except: return default

def normalize_to_inr_crores(value, hint=""):
    if value is None: return None
    v = safe_float(value)
    if v == 0.0 and value not in [0, 0.0, "0"]: return None
    h = str(hint).lower()
    if "usd" in h or "$" in h:
        if "billion" in h or "bn" in h: return round(v * 8300, 2)
        if "million" in h or "mn" in h: return round(v * 83, 2)
        return round(v * 83, 2)
    if "lakh" in h or "lac" in h: return round(v / 100, 2)
    if "billion" in h or "bn" in h: return round(v * 100, 2)
    if "million" in h or "mn" in h: return round(v / 10, 2)
    return round(v, 2)

def compute_ratios_safe(revenue, pat, total_debt, net_worth):
    r = {}
    rev  = safe_float(revenue);  p   = safe_float(pat)
    debt = safe_float(total_debt); nw = safe_float(net_worth)
    if rev > 0 and p is not None:  r["pat_margin"] = round((p/rev)*100, 2)
    if nw > 0 and debt is not None: r["de_ratio"]  = round(debt/nw, 4)
    if nw > 0 and p is not None:   r["roe"]        = round((p/nw)*100, 2)
    return r

def cached_tavily(query, n=4):
    key = query.strip().lower()
    if key in _tavily_cache: return _tavily_cache[key]
    try:
        res = tavily_client.search(query=query, max_results=n, search_depth="advanced")
        _tavily_cache[key] = res
        return res
    except Exception as e:
        print(f"Tavily error: {e}")
        return {"results": []}

# ═══════════════════════════════════════════════════════════════
# DECISION TABLE — exact hackathon spec
# ═══════════════════════════════════════════════════════════════
def get_decision(score):
    if score >= 80: return "APPROVE",                   "A", "Base + 0.75%", "#22c55e"
    if score >= 65: return "APPROVE WITH CONDITIONS",   "B", "Base + 1.5%",  "#f0a500"
    if score >= 50: return "REFER TO CREDIT COMMITTEE", "C", "Base + 2.5%",  "#f97316"
    return              "REJECT",                       "D", "N/A",           "#ef4444"

def get_risk_level(score):
    if score >= 80: return "LOW"
    if score >= 65: return "MEDIUM"
    if score >= 50: return "HIGH"
    return "CRITICAL"

# ═══════════════════════════════════════════════════════════════
# SCORING ENGINE — 5Cs, out of 100
# ═══════════════════════════════════════════════════════════════
def calculate_universal_score(company_name, extracted_docs, research_findings, entity_data, analyst_notes=""):
    scores = {"character": 20, "capacity": 20, "capital": 20, "collateral": 20, "conditions": 15}
    notes  = {k: [] for k in scores}
    red_flags, green_flags = [], []
    reasoning_chain = []   # explicit explainability trail

    annual      = extracted_docs.get("annual_report", {})
    borrowing   = extracted_docs.get("borrowing_profile", {})
    portfolio   = extracted_docs.get("portfolio_cuts", {})
    alm         = extracted_docs.get("alm_statement", {})
    shareholding= extracted_docs.get("shareholding_pattern", {})

    # ── 1. CHARACTER (max 20) ────────────────────────────────
    pledged = safe_float(str(shareholding.get("pledged_shares") or "0").replace("%",""))
    if pledged > 50:
        scores["character"] -= 10
        red_flags.append(f"Promoter pledge critical: {pledged}% of shares pledged")
        reasoning_chain.append(f"CHARACTER -10: Promoter pledge {pledged}% far exceeds 25% safe threshold (Source: Shareholding Pattern)")
    elif pledged > 25:
        scores["character"] -= 6
        red_flags.append(f"Promoter pledge elevated: {pledged}%")
        reasoning_chain.append(f"CHARACTER -6: Promoter pledge {pledged}% above 25% threshold (Source: Shareholding Pattern)")
    elif pledged > 0:
        scores["character"] -= 2
        reasoning_chain.append(f"CHARACTER -2: Minor promoter pledge {pledged}% (Source: Shareholding Pattern)")
    else:
        green_flags.append("Zero promoter pledge — clean ownership structure")
        reasoning_chain.append("CHARACTER +0: No promoter pledge detected — positive signal")

    rating  = str(borrowing.get("credit_rating_long_term") or "").lower()
    outlook = str(borrowing.get("rating_outlook") or "").lower()

    if any(x in rating for x in ["care d","icra d"," d rated","default"]):
        scores["character"] -= 12
        red_flags.append("DEFAULT rating — entity has defaulted on obligations")
        reasoning_chain.append(f"CHARACTER -12: Default rating '{rating}' indicates payment failure (Source: Borrowing Profile)")
    elif any(x in rating for x in ["bbb-","bb+","bb","b+"]):
        scores["character"] -= 6
        red_flags.append(f"Sub-investment grade rating: {rating.upper()}")
        reasoning_chain.append(f"CHARACTER -6: Sub-investment grade rating {rating.upper()} (Source: Borrowing Profile)")
    elif "bbb" in rating:
        scores["character"] -= 3
        reasoning_chain.append(f"CHARACTER -3: BBB grade — moderate risk rating (Source: Borrowing Profile)")
    elif any(x in rating for x in ["aa","aaa","a+"]):
        green_flags.append(f"Strong credit rating: {rating.upper()}")
        reasoning_chain.append(f"CHARACTER +0: Strong rating {rating.upper()} — positive signal (Source: Borrowing Profile)")

    if "watch negative" in outlook or "watch-" in outlook:
        scores["character"] -= 5
        red_flags.append("Rating on Watch Negative — downgrade imminent")
        reasoning_chain.append("CHARACTER -5: Rating on Watch Negative (Source: Borrowing Profile)")
    elif "negative" in outlook:
        scores["character"] -= 3
        red_flags.append("Negative rating outlook")
        reasoning_chain.append("CHARACTER -3: Negative outlook (Source: Borrowing Profile)")
    elif "stable" in outlook:
        green_flags.append("Stable rating outlook")
    elif "positive" in outlook:
        scores["character"] += 1
        green_flags.append("Positive rating outlook")

    scores["character"] = max(min(scores["character"], 20), 0)
    notes["character"] = f"Pledge: {pledged}%. Rating: {rating or 'N/A'}. Outlook: {outlook or 'N/A'}."

    # ── 2. CAPACITY (max 20) ────────────────────────────────
    rev  = normalize_to_inr_crores(annual.get("revenue")) or 0
    pat  = normalize_to_inr_crores(annual.get("pat"))
    gnpa_raw = annual.get("gnpa_percent") or portfolio.get("gnpa_percent") or "2"
    gnpa = safe_float(str(gnpa_raw).replace("%",""))
    coll_eff = safe_float(str(portfolio.get("collection_efficiency") or "97").replace("%",""))

    if pat is None or safe_float(pat) <= 0:
        scores["capacity"] -= 8
        red_flags.append("Net loss — negative PAT recorded")
        reasoning_chain.append(f"CAPACITY -8: Net loss (PAT={pat}) — company is loss-making (Source: Annual Report)")
    else:
        pat_v = safe_float(pat)
        green_flags.append(f"Profitable — PAT ₹{pat_v} Cr")
        reasoning_chain.append(f"CAPACITY +0: Profitable with PAT ₹{pat_v} Cr (Source: Annual Report)")
        if rev > 0:
            margin = (pat_v / rev) * 100
            if margin < 5:
                scores["capacity"] -= 3
                red_flags.append(f"Thin profit margin: {margin:.1f}%")
                reasoning_chain.append(f"CAPACITY -3: Thin PAT margin {margin:.1f}% < 5% threshold (Source: Annual Report)")

    if gnpa > 7:
        scores["capacity"] -= 10
        red_flags.append(f"GNPA critical: {gnpa}% (threshold: 5%)")
        reasoning_chain.append(f"CAPACITY -10: GNPA {gnpa}% far exceeds 5% safe threshold (Source: Annual/Portfolio Report)")
    elif gnpa > 5:
        scores["capacity"] -= 7
        red_flags.append(f"GNPA very high: {gnpa}%")
        reasoning_chain.append(f"CAPACITY -7: GNPA {gnpa}% above 5% (Source: Annual/Portfolio Report)")
    elif gnpa > 3:
        scores["capacity"] -= 4
        red_flags.append(f"GNPA elevated: {gnpa}%")
        reasoning_chain.append(f"CAPACITY -4: GNPA {gnpa}% between 3-5% (Source: Annual/Portfolio Report)")
    else:
        green_flags.append(f"GNPA healthy: {gnpa}% (below 3%)")
        reasoning_chain.append(f"CAPACITY +0: GNPA {gnpa}% within healthy range (Source: Annual/Portfolio Report)")

    if coll_eff < 90:
        scores["capacity"] -= 6
        red_flags.append(f"Collection efficiency critical: {coll_eff}%")
        reasoning_chain.append(f"CAPACITY -6: Collection efficiency {coll_eff}% below 90% threshold (Source: Portfolio Report)")
    elif coll_eff < 95:
        scores["capacity"] -= 3
        reasoning_chain.append(f"CAPACITY -3: Collection efficiency {coll_eff}% below 95% benchmark (Source: Portfolio Report)")
    elif coll_eff >= 98:
        scores["capacity"] += 1
        green_flags.append(f"Excellent collection efficiency: {coll_eff}%")

    scores["capacity"] = max(min(scores["capacity"], 20), 0)
    notes["capacity"] = f"PAT: {pat} Cr. GNPA: {gnpa}%. Collection efficiency: {coll_eff}%."

    # ── 3. CAPITAL (max 20) ────────────────────────────────
    car = safe_float(str(annual.get("car_percent") or "15").replace("%",""))
    nw  = normalize_to_inr_crores(annual.get("net_worth")) or 0
    debt= normalize_to_inr_crores(annual.get("total_debt") or borrowing.get("total_debt")) or 0
    de_ratio = round(debt / nw, 2) if nw > 0 else 99

    if car < 12:
        scores["capital"] -= 12
        red_flags.append(f"CAR critical breach: {car}% (RBI minimum: 15%)")
        reasoning_chain.append(f"CAPITAL -12: CAR {car}% breaches RBI minimum of 15% (Source: Annual Report)")
    elif car < 15:
        scores["capital"] -= 7
        red_flags.append(f"CAR below RBI minimum: {car}%")
        reasoning_chain.append(f"CAPITAL -7: CAR {car}% below RBI minimum 15% (Source: Annual Report)")
    elif car >= 18:
        scores["capital"] += 1
        green_flags.append(f"Strong CAR: {car}%")
        reasoning_chain.append(f"CAPITAL +1: CAR {car}% well above RBI minimum (Source: Annual Report)")

    if de_ratio > 6:
        scores["capital"] -= 8
        red_flags.append(f"D/E critically high: {de_ratio}x")
        reasoning_chain.append(f"CAPITAL -8: D/E {de_ratio}x far exceeds NBFC ceiling of 6x (Source: Borrowing Profile)")
    elif de_ratio > 4:
        scores["capital"] -= 5
        red_flags.append(f"D/E above NBFC norm: {de_ratio}x (ceiling: 4x)")
        reasoning_chain.append(f"CAPITAL -5: D/E {de_ratio}x above 4x NBFC norm (Source: Borrowing Profile)")
    elif de_ratio > 3:
        scores["capital"] -= 2
        reasoning_chain.append(f"CAPITAL -2: D/E {de_ratio}x approaching ceiling (Source: Borrowing Profile)")
    elif de_ratio > 0:
        green_flags.append(f"Healthy leverage: D/E {de_ratio}x")
        reasoning_chain.append(f"CAPITAL +0: Healthy D/E {de_ratio}x (Source: Borrowing Profile)")

    scores["capital"] = max(min(scores["capital"], 20), 0)
    notes["capital"] = f"CAR: {car}%. D/E: {de_ratio}x. Net Worth: ₹{nw} Cr. Total Debt: ₹{debt} Cr."

    # ── 4. COLLATERAL (max 20) ────────────────────────────────
    alm_assets = normalize_to_inr_crores(alm.get("total_assets")) or 0
    alm_liabs  = normalize_to_inr_crores(alm.get("total_liabilities")) or 0

    if alm_assets > 0 and alm_liabs > 0:
        coverage = round(alm_assets / alm_liabs, 2)
        if coverage < 1.0:
            scores["collateral"] -= 10
            red_flags.append(f"Assets do not cover liabilities: {coverage}x")
            reasoning_chain.append(f"COLLATERAL -10: Asset coverage {coverage}x < 1.0 (Source: ALM Statement)")
        elif coverage < 1.1:
            scores["collateral"] -= 5
            red_flags.append(f"Thin asset coverage: {coverage}x")
            reasoning_chain.append(f"COLLATERAL -5: Thin asset coverage {coverage}x (Source: ALM Statement)")
        elif coverage >= 1.2:
            green_flags.append(f"Good asset coverage: {coverage}x")
            reasoning_chain.append(f"COLLATERAL +0: Good asset coverage {coverage}x (Source: ALM Statement)")
    else:
        reasoning_chain.append("COLLATERAL: ALM data not available — using default score")

    liq_gap = normalize_to_inr_crores(alm.get("liquidity_gap"))
    if liq_gap is not None:
        if liq_gap < 0:
            scores["collateral"] -= 5
            red_flags.append(f"Negative liquidity gap: ₹{liq_gap} Cr")
            reasoning_chain.append(f"COLLATERAL -5: Negative liquidity gap ₹{liq_gap} Cr (Source: ALM Statement)")
        elif liq_gap > 500:
            green_flags.append(f"Strong liquidity buffer: ₹{liq_gap} Cr")

    scores["collateral"] = max(min(scores["collateral"], 20), 0)
    notes["collateral"] = f"ALM assets: ₹{alm_assets} Cr. ALM liabs: ₹{alm_liabs} Cr. Liq gap: {liq_gap}."

    # ── 5. CONDITIONS (max 15) ────────────────────────────────
    all_text = " ".join([
        (f.get("title","") + " " + f.get("snippet","") + " " + f.get("content","")).lower()
        for f in research_findings
    ])
    sector = str(entity_data.get("sector","")).lower()

    if "nbfc" in sector or "finance" in sector:
        scores["conditions"] -= 1
        reasoning_chain.append("CONDITIONS -1: NBFC sector faces heightened RBI regulatory scrutiny (Source: Sector Analysis)")

    if any(x in all_text for x in ["default","care d","icra d"," d rated"]):
        scores["conditions"] -= 10
        red_flags.append("DEFAULT event detected in web intelligence")
        reasoning_chain.append("CONDITIONS -10: DEFAULT detected in secondary research news (Source: Web Intelligence)")
    elif any(x in all_text for x in ["breached covenant","covenant breach","loan terms breached"]):
        scores["conditions"] -= 6
        red_flags.append("Loan covenant breach reported in news")
        reasoning_chain.append("CONDITIONS -6: Covenant breach reported in news (Source: Web Intelligence)")

    if any(x in all_text for x in ["fraud","sebi action","rbi penalty","scam","arrested"]):
        scores["conditions"] -= 8
        red_flags.append("Fraud/regulatory action detected in news")
        reasoning_chain.append("CONDITIONS -8: Fraud/regulatory action in news (Source: Web Intelligence)")

    if any(x in all_text for x in ["liquidity crisis","stressed asset","survival","distress"]):
        scores["conditions"] -= 5
        red_flags.append("Severe financial distress signals in news")
        reasoning_chain.append("CONDITIONS -5: Distress signals in media (Source: Web Intelligence)")

    if any(x in all_text for x in ["downgraded","rating downgrade"]):
        scores["conditions"] -= 3
        red_flags.append("Credit rating downgraded — confirmed in news")
        reasoning_chain.append("CONDITIONS -3: Downgrade confirmed in news (Source: Web Intelligence)")

    if any(x in all_text for x in ["nclt","insolvency","ibc proceedings"]):
        scores["conditions"] -= 7
        red_flags.append("NCLT/IBC insolvency proceedings detected")
        reasoning_chain.append("CONDITIONS -7: NCLT/IBC insolvency detected (Source: Web Intelligence/MCA)")

    if any(x in all_text for x in ["upgrade","rating upgrade","improved rating"]):
        scores["conditions"] += 3
        green_flags.append("Rating upgrade signal in news")
        reasoning_chain.append("CONDITIONS +3: Rating upgrade detected (Source: Web Intelligence)")

    # ── ANALYST NOTES ADJUSTMENT ────────────────────────────
    analyst_adj = 0
    analyst_reasoning = ""
    if analyst_notes and len(analyst_notes.strip()) > 10:
        try:
            prompt = f"""A credit analyst has provided these qualitative observations:
"{analyst_notes}"

Based on these notes, provide a score adjustment (-15 to +5) and brief reasoning.
Return ONLY valid JSON: {{"adjustment": -5, "reasoning": "Factory at 40% capacity indicates operational stress"}}
Be conservative. Negative observations: -3 to -15. Positive: +1 to +5."""
            resp = groq_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[{"role":"user","content":prompt}],
                temperature=0.1, max_tokens=200
            )
            text = resp.choices[0].message.content
            m = re.search(r'\{.*\}', text, re.DOTALL)
            if m:
                adj_data = json.loads(m.group())
                analyst_adj = max(-15, min(5, int(adj_data.get("adjustment", 0))))
                analyst_reasoning = adj_data.get("reasoning", "")
                if analyst_adj < 0:
                    red_flags.append(f"Analyst note: {analyst_reasoning}")
                reasoning_chain.append(f"ANALYST NOTES {analyst_adj:+d}: {analyst_reasoning} (Source: Primary Due Diligence)")
        except Exception as e:
            print(f"Analyst notes error: {e}")

    scores["conditions"] = max(min(scores["conditions"], 15), 0)
    notes["conditions"] = f"Sector: {sector}. Web signals: {len(research_findings)} sources. Analyst adj: {analyst_adj:+d}."

    final_score = sum(scores.values()) + analyst_adj
    final_score = max(0, min(100, final_score))

    decision, grade, rate_str, _ = get_decision(final_score)
    risk_level = get_risk_level(final_score)

    loan_amount = safe_float(entity_data.get("loan_amount", 0))
    if decision == "APPROVE":                recommended_amount = loan_amount
    elif decision == "APPROVE WITH CONDITIONS": recommended_amount = round(loan_amount * 0.90, 2)
    elif "REFER" in decision:                recommended_amount = round(loan_amount * 0.75, 2)
    else:                                    recommended_amount = 0

    # Primary reasoning narrative
    key_reasons = [r for r in reasoning_chain if not r.startswith("CHARACTER +0") and not r.startswith("CAPACITY +0") and not r.startswith("CAPITAL +0") and not r.startswith("COLLATERAL +0")][:5]
    reasoning = (
        f"{company_name} scored {final_score}/100 under the Five Cs framework. "
        f"Decision: {decision} (Grade {grade}). "
        + " | ".join(key_reasons[:3])
    )

    return {
        "score": final_score,
        "decision": decision,
        "grade": grade,
        "risk_level": risk_level,
        "recommended_amount": recommended_amount,
        "recommended_rate": rate_str,
        "tenure": entity_data.get("tenure", 36),
        "reasoning": reasoning,
        "reasoning_chain": reasoning_chain,
        "analyst_notes": analyst_notes,
        "analyst_adjustment": analyst_adj,
        "red_flags": list(dict.fromkeys(red_flags)),
        "green_flags": list(dict.fromkeys(green_flags)),
        "five_cs": {
            "character":  {"score": scores["character"],  "max": 20, "notes": notes["character"]},
            "capacity":   {"score": scores["capacity"],   "max": 20, "notes": notes["capacity"]},
            "capital":    {"score": scores["capital"],    "max": 20, "notes": notes["capital"]},
            "collateral": {"score": scores["collateral"], "max": 20, "notes": notes["collateral"]},
            "conditions": {"score": scores["conditions"], "max": 15, "notes": notes["conditions"]},
        },
        "swot": generate_swot(company_name, extracted_docs, research_findings)
    }

def generate_swot(company_name, extracted_docs, research_findings):
    try:
        news_text = "\n".join([f"- {f.get('title','')}: {(f.get('snippet','') or f.get('content',''))[:200]}" for f in research_findings[:6]])
        annual = extracted_docs.get("annual_report", {})
        prompt = f"""Generate SWOT for {company_name} (Indian corporate credit context).
Data: Revenue={annual.get('revenue')} Cr, PAT={annual.get('pat')} Cr, GNPA={annual.get('gnpa_percent')}%, CAR={annual.get('car_percent')}%
News: {news_text}
Return ONLY JSON (no markdown):
{{"strengths":["s1","s2","s3"],"weaknesses":["w1","w2","w3"],"opportunities":["o1","o2"],"threats":["t1","t2","t3"]}}
Each point must be specific to THIS company. No generic statements."""
        resp = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role":"user","content":prompt}],
            temperature=0.3, max_tokens=600
        )
        m = re.search(r'\{.*\}', resp.choices[0].message.content, re.DOTALL)
        if m: return json.loads(m.group())
    except Exception as e:
        print(f"SWOT error: {e}")
    return {
        "strengths":     ["Established market presence", "Regulatory compliance"],
        "weaknesses":    ["Requires further due diligence"],
        "opportunities": ["Growing credit demand in India", "Digital lending expansion"],
        "threats":       ["RBI regulatory tightening", "Rising cost of funds"]
    }

def generate_triangulation(company_name, extracted_docs, research_data):
    """Compare document data vs web research — flag discrepancies."""
    annual  = extracted_docs.get("annual_report", {})
    items   = []

    doc_revenue = normalize_to_inr_crores(annual.get("revenue"))
    web_revenue = normalize_to_inr_crores(research_data.get("revenue"))
    if doc_revenue and web_revenue:
        diff_pct = abs(doc_revenue - web_revenue) / max(doc_revenue, web_revenue) * 100
        if diff_pct > 20:
            items.append({
                "field": "Revenue",
                "doc_value": f"₹{doc_revenue} Cr",
                "web_value": f"₹{web_revenue} Cr",
                "status": "MISMATCH",
                "flag": f"Revenue discrepancy of {diff_pct:.1f}% between document and web data — verify source"
            })
        else:
            items.append({
                "field": "Revenue",
                "doc_value": f"₹{doc_revenue} Cr",
                "web_value": f"₹{web_revenue} Cr",
                "status": "CONSISTENT",
                "flag": "Revenue data consistent across sources"
            })

    doc_debt = normalize_to_inr_crores(annual.get("total_debt"))
    web_debt = normalize_to_inr_crores(research_data.get("total_debt"))
    if doc_debt and web_debt:
        diff_pct = abs(doc_debt - web_debt) / max(doc_debt, web_debt) * 100
        status = "MISMATCH" if diff_pct > 25 else "CONSISTENT"
        items.append({
            "field": "Total Debt",
            "doc_value": f"₹{doc_debt} Cr",
            "web_value": f"₹{web_debt} Cr",
            "status": status,
            "flag": f"Debt {diff_pct:.1f}% variance" if status == "MISMATCH" else "Debt data consistent"
        })

    # GNPA cross-check
    doc_gnpa = safe_float(str(annual.get("gnpa_percent") or "0").replace("%",""))
    web_gnpa = safe_float(str(research_data.get("gnpa_percent") or "0").replace("%",""))
    if doc_gnpa > 0 and web_gnpa > 0:
        diff = abs(doc_gnpa - web_gnpa)
        items.append({
            "field": "GNPA %",
            "doc_value": f"{doc_gnpa}%",
            "web_value": f"{web_gnpa}%",
            "status": "MISMATCH" if diff > 2 else "CONSISTENT",
            "flag": f"GNPA variance of {diff:.1f}pp — potential data staleness" if diff > 2 else "GNPA data consistent"
        })

    return items

@router.post("/research")
async def perform_research(data: dict):
    try:
        company = data.get("company_name","Unknown")
        sector  = data.get("sector","General")
        key     = company.strip().lower()
        if key in _research_cache:
            print(f"CACHE HIT: {company}")
            return _research_cache[key]

        import asyncio
        loop = asyncio.get_event_loop()

        async def fetch(q, n): return await loop.run_in_executor(None, lambda: cached_tavily(q, n))

        # 6 targeted searches for maximum analytical depth
        results = await asyncio.gather(
            fetch(f"{company} India annual revenue profit PAT financial results 2024 2025", 4),
            fetch(f"{company} India fraud litigation NCLT court default NPA 2024 2025", 3),
            fetch(f"{company} India RBI SEBI regulatory action penalty credit rating 2024 2025", 3),
            fetch(f"{sector} sector India RBI regulation outlook headwinds 2024 2025", 2),
            fetch(f"{company} India promoter background founder management news", 2),
            fetch(f"{company} India MCA insolvency IBC NCLT filing 2024", 2),
        )

        unique = {}
        for resp in results:
            for r in resp.get("results",[]):
                url = r.get("url")
                if url and url not in unique:
                    unique[url] = {"title": r.get("title",""), "snippet": (r.get("content",""))[:500], "url": url}

        findings = list(unique.values())
        context  = "\n".join([f"[{f['url']}]\n{f['title']}: {f['snippet']}" for f in findings])

        resp = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role":"system","content":"""Senior Indian credit analyst. Analyze web results for credit research.

CRITICAL RULES:
1. ALL financial values in INR Crores. USD billions × 8300, USD millions × 83, INR lakhs ÷ 100.
2. Recompute D/E = total_debt/net_worth and ROE = (pat/net_worth)*100 from YOUR numbers.
3. revenue_history: only years with confirmed data, null if not found.
4. If PAT margin > 60%, re-check units — something is wrong.
5. Be specific about Indian regulatory context: RBI, SEBI, NCLT, MCA, CIBIL, GSTR.

Return ONLY valid JSON:
{
  "company_name":"","headquarters":"","founded_year":"","sector":"",
  "revenue":null,"pat":null,"total_debt":null,"net_worth":null,"total_assets":null,
  "gnpa_percent":null,"car_percent":null,
  "de_ratio":null,"roe":null,"pat_margin":null,"revenue_growth":null,
  "revenue_history":[{"year":"FY2024","revenue_cr":null},{"year":"FY2023","revenue_cr":null},{"year":"FY2022","revenue_cr":null}],
  "character_score":16,"capacity_score":16,"capital_score":14,"collateral_score":14,"conditions_score":11,
  "total_score":71,
  "credit_decision":"APPROVE or APPROVE WITH CONDITIONS or REFER TO CREDIT COMMITTEE or REJECT",
  "risk_level":"LOW or MEDIUM or HIGH or CRITICAL",
  "positive_signals":["specific point 1","specific point 2"],
  "risk_flags":["specific risk 1","specific risk 2"],
  "rbi_regulatory_flags":["any RBI/regulatory issues or empty array"],
  "nclt_status":"None detected or details",
  "cibil_signal":"any CIBIL commercial report references or N/A",
  "gstr_signal":"any GST/GSTR-2A vs 3B issues or N/A",
  "mca_flags":["any MCA filing issues or empty array"],
  "litigation_risk":"LOW/MEDIUM/HIGH — brief",
  "promoter_background":"specific promoter/founder news",
  "sector_headwinds":["specific sector risk 1","specific sector risk 2"],
  "latest_news":["specific recent event 1","specific recent event 2","specific recent event 3"],
  "sector_outlook":"one concise sentence",
  "research_summary":"3-sentence credit opinion",
  "data_sources":[]
}"""},
                {"role":"user","content":f"Company: {company}\nSector: {sector}\n\nWeb Data ({len(findings)} sources):\n{context[:9000]}"}
            ],
            max_tokens=2500, temperature=0.1
        )

        text = resp.choices[0].message.content
        m = re.search(r'\{.*\}', text, re.DOTALL)
        if m:
            result = json.loads(m.group())

            # Post-process: recompute ratios from normalized values
            rev  = safe_float(result.get("revenue") or 0)
            pat  = safe_float(result.get("pat") or 0)
            debt = safe_float(result.get("total_debt") or 0)
            nw   = safe_float(result.get("net_worth") or 0)

            if nw > 0 and debt >= 0: result["de_ratio"]   = round(debt / nw, 4)
            if nw > 0 and pat != 0:  result["roe"]        = round((pat / nw) * 100, 2)
            if rev > 0 and pat != 0: result["pat_margin"] = round((pat / rev) * 100, 2)

            # Enforce decision table
            total = result.get("total_score", 65)
            decision, grade, rate, _ = get_decision(total)
            result["credit_decision"]   = decision
            result["grade"]             = grade
            result["recommended_rate"]  = rate
            result["risk_level"]        = get_risk_level(total)

            # Clean revenue history
            if result.get("revenue_history"):
                result["revenue_history"] = [
                    h for h in result["revenue_history"]
                    if h.get("revenue_cr") is not None and h["revenue_cr"] not in [0, "0", None]
                ]

            result["data_sources"] = list(unique.keys())[:12]
            _research_cache[key] = result
            return result

        return {"error": "JSON parsing failed", "raw": text[:500]}

    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/cache/stats")
async def cache_stats():
    return {"companies": list(_research_cache.keys()), "queries": len(_tavily_cache)}

@router.delete("/cache/clear")
async def clear_cache():
    global _research_cache, _tavily_cache
    _research_cache = {}; _tavily_cache = {}
    return {"message": "Cleared"}

@router.post("/generate-cam")
async def generate_report(data: str = Form(...)):
    try:
        from datetime import datetime
        payload       = json.loads(data)
        entity_data   = payload.get("entity", {})
        loan_data     = payload.get("loan", {})
        extracted_data= payload.get("extracted", [])
        research_data = payload.get("research", {})
        score_data    = payload.get("score", {})
        analyst_notes = payload.get("analyst_notes", "")

        extracted_docs = {}
        if isinstance(extracted_data, list):
            for doc in extracted_data:
                dt = doc.get("doc_type","unknown"); f = doc.get("fields",{})
                if f: extracted_docs[dt] = f
        elif isinstance(extracted_data, dict):
            extracted_docs = extracted_data

        if not score_data or not score_data.get("score"):
            score_data = calculate_universal_score(
                entity_data.get("companyName","Unknown"), extracted_docs,
                research_data.get("findings",[]),
                {"company_name": entity_data.get("companyName"),
                 "sector": entity_data.get("sector"),
                 "loan_amount": safe_float(loan_data.get("amount",50)),
                 "tenure": int(loan_data.get("tenure",36))},
                analyst_notes
            )

        total   = score_data.get("score", 0)
        dec_lbl, grade, rate, _ = get_decision(total)

        doc = Document()
        sec = doc.sections[0]
        sec.page_width = Inches(8.5); sec.page_height = Inches(11)
        sec.left_margin = sec.right_margin = Inches(1)
        sec.top_margin = sec.bottom_margin = Inches(1)

        def shd_cell(cell, hex_color):
            tc = cell._tc; tcPr = tc.get_or_add_tcPr()
            shd = OxmlElement("w:shd")
            shd.set(qn("w:fill"), hex_color); shd.set(qn("w:color"),"auto"); shd.set(qn("w:val"),"clear")
            tcPr.append(shd)

        def add_h(txt, level=1, rgb=(26,58,107)):
            p = doc.add_heading(txt, level=level)
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            for r in p.runs: r.font.color.rgb = RGBColor(*rgb)
            return p

        def add_kv(lbl, val):
            p = doc.add_paragraph()
            r1 = p.add_run(f"{lbl}: "); r1.bold = True; r1.font.size = Pt(11)
            p.add_run(str(val) if val else "N/A").font.size = Pt(11)

        def add_table(headers, rows, hdr_color="1A3A6B"):
            t = doc.add_table(rows=1, cols=len(headers)); t.style = "Table Grid"
            hdr_cells = t.rows[0].cells
            for i, h in enumerate(headers):
                hdr_cells[i].text = h
                shd_cell(hdr_cells[i], hdr_color)
                run = hdr_cells[i].paragraphs[0].runs[0]
                run.bold = True; run.font.color.rgb = RGBColor(255,255,255); run.font.size = Pt(10)
            for row in rows:
                rc = t.add_row().cells
                for i, v in enumerate(row): rc[i].text = str(v) if v else "N/A"
            doc.add_paragraph()
            return t

        # ── COVER PAGE ──
        doc.add_paragraph()
        title = doc.add_heading("Credit Appraisal Memo (CAM)", 0)
        title.alignment = WD_ALIGN_PARAGRAPH.CENTER
        for r in title.runs: r.font.color.rgb = RGBColor(26,58,107)
        sub = doc.add_paragraph("VERIDEX® AI Credit Engine v2.0 — PRIVATE & CONFIDENTIAL")
        sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
        sub.runs[0].font.color.rgb = RGBColor(150,150,150); sub.runs[0].font.size = Pt(10)
        doc.add_paragraph()

        cover_rows = [
            ["Target Entity", entity_data.get("companyName","N/A")],
            ["CIN",  entity_data.get("cin","N/A")],
            ["PAN",  entity_data.get("pan","N/A")],
            ["Sector", entity_data.get("sector","N/A")],
            ["Loan Amount", f"₹{loan_data.get('amount','N/A')} Crores"],
            ["Loan Type",   loan_data.get("loanType","N/A")],
            ["Tenure",      f"{loan_data.get('tenure','N/A')} Months"],
            ["Report Date", datetime.now().strftime("%d %B %Y")],
            ["Generated By","VERIDEX AI Credit Engine v2.0"],
        ]
        t = doc.add_table(rows=len(cover_rows), cols=2); t.style = "Table Grid"
        for i, (lbl, val) in enumerate(cover_rows):
            t.rows[i].cells[0].text = lbl
            t.rows[i].cells[1].text = str(val)
            t.rows[i].cells[0].paragraphs[0].runs[0].bold = True
        doc.add_page_break()

        # ── 1. EXECUTIVE SUMMARY ──
        add_h("1. Executive Summary", 1)
        decision_color = "2DC653" if total >= 80 else "F0A500" if total >= 65 else "F97316" if total >= 50 else "EF4444"
        add_kv("Credit Decision",     dec_lbl)
        add_kv("Grade",               grade)
        add_kv("Intelli-Score",       f"{total}/100")
        add_kv("Risk Level",          get_risk_level(total))
        add_kv("Recommended Limit",   f"₹{score_data.get('recommended_amount','N/A')} Crores")
        add_kv("Recommended Rate",    rate)
        add_kv("Tenure",              f"{loan_data.get('tenure','N/A')} Months")
        doc.add_paragraph()
        p = doc.add_paragraph(); p.add_run("Decision Reasoning: ").bold = True
        p.add_run(score_data.get("reasoning","Based on submitted documents."))

        # ── 2. EXPLAINABILITY CHAIN ──
        add_h("2. Explainability Chain (Scoring Rationale)", 1)
        doc.add_paragraph("Every score adjustment is traced to its source:")
        chain = score_data.get("reasoning_chain", [])
        if chain:
            add_table(["Dimension", "Adjustment", "Source Rationale"],
                      [[r.split(":")[0], r.split(":")[1].strip().split("(")[0].strip() if ":" in r else r,
                        r.split("(Source:")[-1].rstrip(")") if "(Source:" in r else "Analysis"]
                       for r in chain[:12]])
        else:
            doc.add_paragraph("Scoring based on extracted financial data and web intelligence.")

        # ── 3. FIVE Cs ANALYSIS ──
        add_h("3. Five Cs Framework Analysis", 1)
        five_cs = score_data.get("five_cs", {})
        cs_rows = []
        for key, max_v in [("character",20),("capacity",20),("capital",20),("collateral",20),("conditions",15)]:
            cs = five_cs.get(key, {})
            s  = cs.get("score",0) if isinstance(cs,dict) else (cs or 0)
            n  = cs.get("notes","") if isinstance(cs,dict) else ""
            cs_rows.append([key.capitalize(), f"{s}/{max_v}", n])
        add_table(["Dimension","Score","Analysis Notes"], cs_rows)
        add_kv("TOTAL SCORE", f"{total}/100 — Grade {grade}")
        if analyst_notes:
            doc.add_paragraph()
            add_kv("Analyst Notes Applied", analyst_notes)
            add_kv("Score Adjustment",      f"{score_data.get('analyst_adjustment',0):+d} points")

        # ── 4. FINANCIAL HIGHLIGHTS ──
        add_h("4. Financial Highlights (All values in INR Crores)", 1)
        annual     = extracted_docs.get("annual_report", {})
        borrowing  = extracted_docs.get("borrowing_profile", {})
        portfolio  = extracted_docs.get("portfolio_cuts", {})
        alm        = extracted_docs.get("alm_statement", {})
        shareholding = extracted_docs.get("shareholding_pattern", {})

        def fcr(v): n = normalize_to_inr_crores(v); return f"₹{n} Cr" if n else "N/A"
        def fpct(v): sv = str(v).replace("%","").strip() if v else None; return f"{sv}%" if sv and sv not in ["None","null",""] else "N/A"

        fin_rows = [
            ["Revenue (Total Income)",  fcr(annual.get("revenue")),          "Latest FY"],
            ["Net Profit (PAT)",         fcr(annual.get("pat")),              "Profit After Tax"],
            ["EBITDA",                   fcr(annual.get("ebitda")),           "Operating profit proxy"],
            ["Total Debt",               fcr(annual.get("total_debt") or borrowing.get("total_debt")), "Total borrowings"],
            ["Net Worth",                fcr(annual.get("net_worth")),        "Shareholders equity"],
            ["Total Assets",             fcr(annual.get("total_assets") or alm.get("total_assets")), "Balance sheet total"],
            ["Gross NPA %",              fpct(annual.get("gnpa_percent") or portfolio.get("gnpa_percent")), "< 2% healthy"],
            ["CAR %",                    fpct(annual.get("car_percent")),     "RBI min 15%"],
            ["Interest Coverage",        str(annual.get("interest_coverage") or "N/A"), "EBIT/Interest"],
            ["Cash from Operations",     fcr(annual.get("cash_from_operations")), "Operating cashflow"],
            ["Credit Rating",            str(borrowing.get("credit_rating_long_term") or "N/A"), "Long-term"],
            ["Rating Outlook",           str(borrowing.get("rating_outlook") or "N/A"), "Trajectory"],
            ["Promoter Holding",         fpct(shareholding.get("promoter_holding")), "Stake"],
            ["Pledged Shares",           fpct(shareholding.get("pledged_shares")), "0% ideal"],
            ["Collection Efficiency",    fpct(portfolio.get("collection_efficiency")), "> 95% healthy"],
            ["Total AUM",                fcr(portfolio.get("total_aum")),    "Portfolio size"],
        ]
        add_table(["Metric", "Value", "Benchmark / Notes"], fin_rows)

        # ── 5. RISK ALERTS ──
        add_h("5. Risk Alerts & Positive Indicators", 1)
        add_h("Risk Alerts", 2, (180,0,0))
        for alert in score_data.get("red_flags",[]):
            p = doc.add_paragraph(style="List Bullet")
            p.add_run(f"⚠ {alert}").font.color.rgb = RGBColor(180,0,0)
        if not score_data.get("red_flags"):
            doc.add_paragraph("No critical risk alerts identified.")
        add_h("Positive Indicators", 2, (0,128,0))
        for ind in score_data.get("green_flags",[]):
            p = doc.add_paragraph(style="List Bullet")
            p.add_run(f"✓ {ind}").font.color.rgb = RGBColor(0,128,0)

        # ── 6. SECONDARY RESEARCH ──
        add_h("6. Secondary Research Intelligence", 1)
        if research_data.get("research_summary"):
            doc.add_paragraph(research_data["research_summary"])

        # Indian context signals
        indian_rows = [
            ["NCLT/IBC Status",        research_data.get("nclt_status","None detected")],
            ["CIBIL Commercial Signal", research_data.get("cibil_signal","N/A")],
            ["GSTR-2A vs 3B Signal",   research_data.get("gstr_signal","N/A")],
            ["Litigation Risk",        research_data.get("litigation_risk","N/A")],
            ["Promoter Background",    research_data.get("promoter_background","N/A")],
        ]
        add_table(["Indian Context Signal","Finding"], indian_rows, "2D3748")

        if research_data.get("rbi_regulatory_flags"):
            add_h("RBI & Regulatory Flags", 2, (180,0,0))
            for flag in research_data["rbi_regulatory_flags"]:
                p = doc.add_paragraph(style="List Bullet")
                p.add_run(f"⚠ {flag}").font.color.rgb = RGBColor(180,0,0)

        if research_data.get("sector_headwinds"):
            add_h("Sector Headwinds", 2, (153,76,0))
            for h in research_data["sector_headwinds"]:
                doc.add_paragraph(f"• {h}", style="List Bullet")

        news = [n for n in research_data.get("latest_news",[]) if n and n != "null"]
        if news:
            add_h("Latest Intelligence", 2)
            for item in news[:6]: doc.add_paragraph(f"• {item}", style="List Bullet")

        # ── 7. TRIANGULATION ──
        add_h("7. Data Triangulation (Document vs Web Intelligence)", 1)
        doc.add_paragraph("Cross-referencing document-extracted data against web research findings:")
        triang = generate_triangulation(entity_data.get("companyName",""), extracted_docs, research_data)
        if triang:
            add_table(["Data Field","Document Value","Web Value","Status","Assessment"],
                      [[t["field"],t["doc_value"],t["web_value"],t["status"],t["flag"]] for t in triang])
        else:
            doc.add_paragraph("Insufficient data for triangulation — single source only.")

        # ── 8. SWOT ──
        add_h("8. SWOT Analysis", 1)
        swot = score_data.get("swot", {})
        swot_data = [
            ["STRENGTHS",     "\n".join(swot.get("strengths",[])),     "WEAKNESSES",    "\n".join(swot.get("weaknesses",[]))],
            ["OPPORTUNITIES", "\n".join(swot.get("opportunities",[])), "THREATS",       "\n".join(swot.get("threats",[]))],
        ]
        t = doc.add_table(rows=0, cols=2); t.style = "Table Grid"
        for row_data in swot_data:
            for pair_start in [0, 2]:
                row = t.add_row()
                row.cells[0].text = row_data[pair_start]
                row.cells[1].text = row_data[pair_start+1]
                if row_data[pair_start] in ["STRENGTHS","WEAKNESSES","OPPORTUNITIES","THREATS"]:
                    row.cells[0].paragraphs[0].runs[0].bold = True
                    row.cells[1].paragraphs[0].runs[0].bold = True
        doc.add_paragraph()

        # ── 9. CREDIT NARRATIVE ──
        add_h("9. Detailed Credit Assessment", 1)
        try:
            narrative_prompt = f"""Write a formal Credit Appraisal Memo narrative for {entity_data.get('companyName','N/A')}.
Score: {total}/100 | Decision: {dec_lbl} | Grade: {grade}
Key Issues: {', '.join(score_data.get('red_flags',[])[:3])}
Positives: {', '.join(score_data.get('green_flags',[])[:2])}
Research: {research_data.get('research_summary','')}

Write 5 sections (formal Indian banking language):
1. BORROWER BACKGROUND
2. FINANCIAL ANALYSIS
3. RISK ASSESSMENT
4. CREDIT OPINION
5. RECOMMENDATION
Be specific, reference actual numbers."""
            nr = groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role":"user","content":narrative_prompt}],
                temperature=0.3, max_tokens=1500
            )
            doc.add_paragraph(nr.choices[0].message.content)
        except Exception as e:
            doc.add_paragraph(f"Narrative unavailable: {e}")

        # ── DISCLAIMER ──
        doc.add_paragraph()
        disc = doc.add_paragraph("This report was generated by VERIDEX AI Credit Engine v2.0 using submitted financial documents and AI-powered secondary research. For internal use only. All assessments are AI-assisted and must be reviewed by a qualified credit officer before final decision.")
        disc.runs[0].font.size = Pt(9); disc.runs[0].font.color.rgb = RGBColor(120,120,120)

        buf = io.BytesIO(); doc.save(buf); buf.seek(0)
        name = entity_data.get("companyName","Entity").replace(" ","_")
        return Response(
            content=buf.getvalue(),
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f"attachment; filename=CAM_{name}_{datetime.now().strftime('%Y%m%d')}.docx"}
        )
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
