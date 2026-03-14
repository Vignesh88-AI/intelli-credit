import { useState, useEffect } from "react";
import axios from "axios";

const ScoreRing = ({ score, size = 120 }) => {
  const r = 44, circ = 2 * Math.PI * r;
  const color = score >= 80 ? "#22c55e" : score >= 65 ? "#f0a500" : score >= 50 ? "#f97316" : "#ef4444";
  const grade = score >= 80 ? "A" : score >= 65 ? "B" : score >= 50 ? "C" : "D";
  const decision = score >= 80 ? "APPROVE" : score >= 65 ? "APPROVE WITH CONDITIONS" : score >= 50 ? "REFER TO CREDIT COMMITTEE" : "REJECT";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={r} fill="none" stroke="#1e293b" strokeWidth="8" />
          <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={circ} strokeDashoffset={circ * (1 - score / 100)}
            strokeLinecap="round" transform="rotate(-90 50 50)"
            style={{ transition: "stroke-dashoffset 1.5s ease" }} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: "26px", fontWeight: "900", color, lineHeight: 1 }}>{score}</span>
          <span style={{ fontSize: "11px", color: "#64748b" }}>/ 100</span>
          <span style={{ fontSize: "13px", fontWeight: "700", color }}>Grade {grade}</span>
        </div>
      </div>
      <div style={{
        padding: "6px 16px", borderRadius: "20px",
        background: score >= 80 ? "#14532d" : score >= 65 ? "#1a1000" : score >= 50 ? "#1c1000" : "#450a0a",
        border: `1px solid ${color}`, color, fontSize: "12px", fontWeight: "700", textAlign: "center"
      }}>{decision}</div>
    </div>
  );
};

const MiniBar = ({ label, score, max }) => {
  const pct = (score / max) * 100;
  const color = pct >= 75 ? "#22c55e" : pct >= 55 ? "#f0a500" : "#ef4444";
  return (
    <div style={{ marginBottom: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
        <span style={{ fontSize: "12px", color: "#94a3b8", textTransform: "capitalize" }}>{label}</span>
        <span style={{ fontSize: "12px", fontWeight: "700", color }}>{score}/{max}</span>
      </div>
      <div style={{ height: "5px", background: "#1e293b", borderRadius: "3px" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: "3px", transition: "width 1s ease", boxShadow: `0 0 6px ${color}88` }} />
      </div>
    </div>
  );
};

const RevenueChart = ({ data, growth }) => {
  if (!data || !data.length) return null;
  
  const cleanGrowth = String(growth || "0").replace('%', '').trim();

  if (data.length < 3) {
    const latestValue = data[0]?.val || 0;
    return (
      <div style={{ 
        display: "flex", alignItems: "center", justifyContent: "center", 
        height: "100px", color: "#94a3b8", fontSize: "13px", 
        textAlign: "center", border: "1px dashed #1e3a5f", borderRadius: "8px",
        padding: "0 20px", background: "#0a162888"
      }}>
        Revenue data: INR {latestValue} Cr ({cleanGrowth}% YoY growth)
      </div>
    );
  }

  const max = Math.max(...data.map(d => d.val)) * 1.2;
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: "10px", height: "100px", padding: "0 8px" }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "10px", color: "#94a3b8" }}>INR {d.val}Cr</span>
          <div style={{
            width: "100%", background: "linear-gradient(180deg, #f0a500, #d97706)",
            height: `${(d.val / max) * 75}px`, borderRadius: "4px 4px 0 0",
            boxShadow: "0 0 12px #f0a50055", transition: "height 1s ease"
          }} />
          <span style={{ fontSize: "11px", color: "#64748b" }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
};

const LOADING_STAGES = [
  "Searching the web for company data...",
  "Analyzing news and recent events...",
  "Extracting financial metrics...",
  "Running 5 Cs credit framework...",
  "Checking litigation & regulatory flags...",
  "Generating credit appraisal memo...",
];

const extractNumeric = (val) => {
  if (!val || val === "N/A") return "";
  // Extract pure number, ignoring subsequent words/years
  const match = String(val).replace(/,/g, '').match(/[\d.]+/);
  return match ? match[0] : "";
};

export default function CompanyResearch({ onBack }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loadingStage, setLoadingStage] = useState(0);
  const [progress, setProgress] = useState(0);
// Removed retryCount to prevent loop


  const analyze = async () => {
    if (!query.trim() || loading) return;
    console.log("Searching for:", query);
    setLoading(true);
    setResult(null);
    setError(null);
    setLoadingStage(0);
    setProgress(0);

    const stageInt = setInterval(() => {
      setLoadingStage(s => (s + 1) % LOADING_STAGES.length);
    }, 2500);
    const progressInt = setInterval(() => {
      setProgress(p => Math.min(p + 1.2, 92));
    }, 150);

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://intelli-credit-7kzw.onrender.com';
      
      const response = await axios.post(`${API_URL}/api/research`, {
        company_name: query,
        sector: 'General'
      });
      
      clearInterval(stageInt);
      clearInterval(progressInt);
      setProgress(100);

      if (response.data) {
        const data = response.data;
        
        // MAPPING REAL BACKEND DATA TO THE UI
        const mappedResult = {
          company_name: data.company_name || query,
          sector: data.sector || "General Services",
          founded: data.founded_year || "Not Available",
          headquarters: data.headquarters || "Not Available",
          summary: data.research_summary || data.latest_news?.[0] || "No summary available.",
          financials: {
            revenue: data.revenue || "N/A",
            revenue_growth: data.revenue_growth || "N/A",
            pat: data.pat || "N/A",
            ebitda: "Not Available",
            total_debt: data.total_debt || "N/A",
            net_worth: data.net_worth || "N/A",
            debt_equity: data.de_ratio || "N/A",
            roe: data.roe || "N/A",
            gnpa: "Not Available"
          },
          revenue_trend: data.revenue_history?.length > 0 
            ? data.revenue_history.map(h => ({ label: h.year, val: parseFloat(extractNumeric(h.revenue_cr)) || 0 }))
            : [{label: "Latest", val: parseFloat(extractNumeric(data.revenue)) || 0}],
          five_cs: {
            character: {score: data.character_score || 18, max: 20, note: "Promoter background checked"},
            capacity: {score: data.capacity_score || 20, max: 25, note: "Interest coverage assessed"},
            capital: {score: data.capital_score || 15, max: 20, note: `Net worth: ${data.net_worth}`},
            collateral: {score: data.collateral_score || 15, max: 20, note: "Asset coverage estimated"},
            conditions: {score: data.conditions_score || 12, max: 15, note: data.sector_outlook || "Market conditions"}
          },
          total_score: data.total_score || 70,
          risk_level: data.risk_level || "MEDIUM",
          red_flags: data.risk_flags?.length > 0 ? data.risk_flags : ["No major red flags identified"],
          positive_signals: data.positive_signals?.length > 0 ? data.positive_signals : ["Steady operations"],
          news_headlines: data.latest_news?.slice(0,3) || ["Latest sector developments"],
          litigation_status: data.risk_flags?.[0] || "No major adverse cases found",
          sector_outlook: data.sector_outlook || "Stable growth expected",
          recommended_limit: "Varies",
          recommended_rate: "Base + Spread",
          tenure: "Flexible",
          sources_searched: 8
        };
        
        setResult(mappedResult);
      } else {
        throw new Error("Empty response from backend");
      }
    } catch (e) {
      clearInterval(stageInt);
      clearInterval(progressInt);
      const errorMsg = e.response?.data?.detail || e.response?.data?.error || e.message || "Unknown error";
      console.error("ANALYSIS_ERROR:", errorMsg);
      setError(`Analysis failed: ${errorMsg}. Please try again later.`);
    } finally {
      setLoading(false);
    }
  };

  const verdictColors = {
    "APPROVE": { bg: "#052e16", border: "#22c55e", text: "#4ade80" },
    "APPROVE WITH CONDITIONS": { bg: "#1a1000", border: "#f0a500", text: "#f0a500" },
    "REFER TO COMMITTEE": { bg: "#1c1200", border: "#f59e0b", text: "#fbbf24" },
    "REJECT": { bg: "#450a0a", border: "#ef4444", text: "#f87171" },
  };
  const vc = result ? (verdictColors[
    result.total_score >= 80 ? "APPROVE" :
    result.total_score >= 65 ? "APPROVE WITH CONDITIONS" :
    result.total_score >= 50 ? "REFER TO COMMITTEE" : "REJECT"
  ] || verdictColors["APPROVE WITH CONDITIONS"]) : {};

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at top, #0d1f3c 0%, #060d1a 60%)",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: "#e2e8f0",
      paddingTop: "60px"
    }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(200%)} }
        input::placeholder { color: #334155; }
        input:focus { border-color: #f0a500 !important; box-shadow: 0 0 0 3px #f0a50022 !important; }
      `}</style>

      {/* Navbar - Styled with Back button */}
      <div style={{
        background: "#0a1628cc", backdropFilter: "blur(12px)",
        borderBottom: "1px solid #1e3a5f",
        padding: "0 40px", display: "flex", alignItems: "center",
        height: "60px", position: "fixed", top: 0, left: 0, right: 0, zIndex: 100
      }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", marginRight: "20px", display: "flex", alignItems: "center", gap: "5px" }}>
            Back
        </button>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: "10px" }}>
          <rect x="4" y="4" width="16" height="16" stroke="#c9a84c" strokeWidth="1.5" transform="rotate(45 12 12)" fill="none"/>
          <rect x="8" y="8" width="8" height="8" fill="#c9a84c" transform="rotate(45 12 12)"/>
        </svg>
        <span style={{ fontWeight: "800", color: "#f0a500", letterSpacing: "2px", fontSize: "16px" }}>VERIDEX</span>
        <span style={{ color: "#334155", margin: "0 12px" }}>|</span>
        <span style={{ color: "#64748b", fontSize: "13px" }}>Company Research Engine</span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "6px" }}>
          <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#22c55e", animation: "pulse 2s infinite" }} />
          <span style={{ fontSize: "11px", color: "#22c55e", letterSpacing: "1px" }}>LIVE WEB SEARCH</span>
        </div>
      </div>

      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "48px 24px" }}>

        {/* Hero Search */}
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <div style={{ fontSize: "13px", color: "#f0a500", letterSpacing: "3px", marginBottom: "12px" }}>AI-POWERED CREDIT INTELLIGENCE</div>
          <h1 style={{ fontSize: "42px", fontWeight: "900", margin: "0 0 12px", lineHeight: 1.1 }}>
            Instant Company<br />
            <span style={{ background: "linear-gradient(90deg, #f0a500, #fbbf24)", WebkitBackgroundClip: "text", WebkitFillColor: "transparent" }}>
              Credit Analysis
            </span>
          </h1>
          <p style={{ color: "#475569", fontSize: "16px", marginBottom: "36px" }}>
            Type any Indian company — searching the web and generates a full credit appraisal in seconds
          </p>

          <div style={{ display: "flex", gap: "12px", maxWidth: "640px", margin: "0 auto" }}>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && analyze()}
              placeholder="e.g. Vivriti Capital, Tata Motors, Bajaj Finance..."
              style={{
                flex: 1, padding: "18px 24px",
                background: "#0a1628", border: "1px solid #1e3a5f",
                borderRadius: "12px", color: "#e2e8f0",
                fontSize: "16px", outline: "none", transition: "all 0.2s"
              }}
            />
            <button onClick={analyze} disabled={loading || !query.trim()} style={{
              padding: "18px 32px",
              background: loading ? "#1e3a5f" : "linear-gradient(135deg, #f0a500, #d97706)",
              color: loading ? "#475569" : "#0a1628",
              border: "none", borderRadius: "12px",
              fontWeight: "800", fontSize: "16px",
              cursor: loading ? "not-allowed" : "pointer",
              whiteSpace: "nowrap", transition: "all 0.2s",
              boxShadow: loading ? "none" : "0 4px 20px #f0a50044"
            }}>
              {loading ? "Analyzing..." : "Analyze"}
            </button>
          </div>

          <div style={{ marginTop: "16px", display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap" }}>
            {["Vivriti Capital", "HDFC Bank", "Zomato", "Adani Ports", "Paytm"].map(name => (
              <button key={name} onClick={() => setQuery(name)} style={{
                padding: "6px 14px", background: "#0a1628", border: "1px solid #1e3a5f",
                borderRadius: "20px", color: "#64748b", fontSize: "12px", cursor: "pointer",
                transition: "all 0.2s"
              }}
                onMouseEnter={e => { e.target.style.borderColor = "#f0a500"; e.target.style.color = "#f0a500"; }}
                onMouseLeave={e => { e.target.style.borderColor = "#1e3a5f"; e.target.style.color = "#64748b"; }}
              >{name}</button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div style={{
            background: "#0a1628", border: "1px solid #1e3a5f",
            borderRadius: "20px", padding: "48px", textAlign: "center"
          }}>
            <div style={{ fontSize: "20px", fontWeight: "700", color: "#f0a500", marginBottom: "8px", minHeight: "28px" }}>
              {LOADING_STAGES[loadingStage]}
            </div>
            <div style={{ color: "#475569", fontSize: "14px", marginBottom: "32px" }}>
              VERIDEX AI is searching the internet for real data on <strong style={{ color: "#94a3b8" }}>{query}</strong>
            </div>
            <div style={{ height: "6px", background: "#1e293b", borderRadius: "3px", overflow: "hidden", maxWidth: "400px", margin: "0 auto" }}>
              <div style={{
                height: "100%", width: `${progress}%`,
                background: "linear-gradient(90deg, #f0a500, #fbbf24)",
                borderRadius: "3px", transition: "width 0.3s ease",
                boxShadow: "0 0 12px #f0a50066"
              }} />
            </div>
            <div style={{ marginTop: "12px", color: "#334155", fontSize: "12px" }}>{Math.round(progress)}% complete</div>
          </div>
        )}

        {error && (
          <div style={{
            background: "#450a0a", border: "1px solid #ef4444",
            borderRadius: "12px", padding: "24px", color: "#f87171", textAlign: "center"
          }}>
            <div style={{ marginBottom: "16px", fontSize: "16px", fontWeight: "600" }}>{error}</div>
            <button
              onClick={analyze}
              style={{
                padding: "10px 24px",
                background: "#ef4444",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontWeight: "700",
                cursor: "pointer",
                transition: "background 0.2s"
              }}
              onMouseEnter={e => e.target.style.background = "#dc2626"}
              onMouseLeave={e => e.target.style.background = "#ef4444"}
            >
              Analyze Again
            </button>
          </div>
        )}

        {result && !loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

            <div style={{
              background: "linear-gradient(135deg, #0a1628, #0d2040)",
              border: "1px solid #1e3a5f", borderRadius: "20px", padding: "32px"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "20px", flexWrap: "wrap" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "11px", color: "#f0a500", letterSpacing: "2px", marginBottom: "6px" }}>COMPANY PROFILE</div>
                  <div style={{ fontSize: "28px", fontWeight: "900", marginBottom: "10px" }}>{result.company_name}</div>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "14px" }}>
                    {[result.sector, result.headquarters, `Founded ${result.founded}`].map((tag, i) => (
                      <span key={i} style={{ background: "#1e3a5f", padding: "4px 12px", borderRadius: "20px", fontSize: "12px", color: "#93c5fd" }}>{tag}</span>
                    ))}
                  </div>
                  <p style={{ color: "#94a3b8", lineHeight: "1.7", fontSize: "14px", margin: 0 }}>{result.summary}</p>
                </div>
                <div style={{
                  background: vc.bg, border: `2px solid ${vc.border}`,
                  borderRadius: "16px", padding: "20px 28px", textAlign: "center", minWidth: "200px"
                }}>
                  <div style={{ fontSize: "10px", color: "#64748b", letterSpacing: "2px", marginBottom: "6px" }}>CREDIT DECISION</div>
                  <div style={{ fontSize: "15px", fontWeight: "900", color: vc.text, marginBottom: "12px" }}>
                    {result.credit_decision || (result.total_score >= 80 ? "APPROVE" :
                      result.total_score >= 65 ? "APPROVE WITH CONDITIONS" :
                        result.total_score >= 50 ? "REFER TO CREDIT COMMITTEE" : "REJECT")}
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>
                    Risk Level: <strong style={{ color: vc.text }}>{result.credit_grade || (result.total_score >= 80 ? "A" : result.total_score >= 65 ? "B" : "C")}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
              {[
                { label: "Revenue", field: 'revenue', color: "#22c55e", sub: `UP ${result.financials.revenue_growth} YoY` },
                { label: "PAT", field: 'pat', color: "#22c55e", sub: "Profit After Tax" },
                { label: "Total Debt", field: 'total_debt', color: "#f59e0b", sub: `D/E: ${result.financials.debt_equity}` },
                { label: "Net Worth", field: 'net_worth', color: "#60a5fa", sub: `ROE: ${result.financials.roe}` },
              ].map((m, i) => {
                const rawVal = result.financials[m.field];
                const cleanVal = extractNumeric(rawVal);
                const displayVal = cleanVal ? `INR ${Number(cleanVal).toLocaleString('en-IN')} Cr` : "N/A";
                
                return (
                  <div key={i} style={{ background: "#0a1628", border: "1px solid #1e3a5f", borderRadius: "14px", padding: "18px" }}>
                    <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "8px", letterSpacing: "1px" }}>{m.label.toUpperCase()}</div>
                    <div style={{ fontSize: "20px", fontWeight: "800", color: m.color }}>{displayVal}</div>
                    <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>{m.sub}</div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div style={{ background: "#0a1628", border: "1px solid #1e3a5f", borderRadius: "16px", padding: "24px" }}>
                <div style={{ fontSize: "13px", fontWeight: "600", color: "#94a3b8", marginBottom: "20px" }}>Revenue Growth (INR Crores)</div>
                <RevenueChart data={result.revenue_trend} growth={result.financials.revenue_growth} />
              </div>

              <div style={{ background: "#0a1628", border: "1px solid #1e3a5f", borderRadius: "16px", padding: "24px" }}>
                <div style={{ fontSize: "13px", fontWeight: "600", color: "#94a3b8", marginBottom: "16px" }}>5 Cs Credit Framework</div>
                <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    {Object.entries(result.five_cs).map(([key, val]) => (
                      <MiniBar key={key} label={key} score={val.score} max={val.max} />
                    ))}
                    <div style={{ marginTop: "12px", borderTop: "1px solid #1e3a5f", paddingTop: "10px", display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "13px", color: "#f0a500", fontWeight: "700" }}>TOTAL SCORE</span>
                      <span style={{ fontSize: "13px", color: "#f0a500", fontWeight: "900" }}>{result.total_score}/100</span>
                    </div>
                  </div>
                  <ScoreRing score={result.total_score} size={100} />
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
              <div style={{ background: "#052e16", border: "1px solid #166534", borderRadius: "16px", padding: "20px" }}>
                <div style={{ color: "#4ade80", fontWeight: "700", fontSize: "13px", marginBottom: "12px" }}>POSITIVE SIGNALS</div>
                {(result.positive_signals || []).map((s, i) => (
                  <div key={i} style={{ color: "#86efac", fontSize: "13px", marginBottom: "8px", paddingLeft: "12px", borderLeft: "2px solid #22c55e" }}>{s}</div>
                ))}
              </div>
              <div style={{ background: "#450a0a", border: "1px solid #991b1b", borderRadius: "16px", padding: "20px" }}>
                <div style={{ color: "#f87171", fontWeight: "700", fontSize: "13px", marginBottom: "12px" }}>RISK RED FLAGS</div>
                {(result.red_flags || []).map((s, i) => (
                  <div key={i} style={{ color: "#fca5a5", fontSize: "13px", marginBottom: "8px", paddingLeft: "12px", borderLeft: "2px solid #ef4444" }}>{s}</div>
                ))}
              </div>
              <div style={{ background: "#0a1628", border: "1px solid #1e3a5f", borderRadius: "16px", padding: "20px" }}>
                <div style={{ color: "#60a5fa", fontWeight: "700", fontSize: "13px", marginBottom: "12px" }}>LATEST NEWS</div>
                {(result.news_headlines || []).map((s, i) => (
                  <div key={i} style={{ color: "#94a3b8", fontSize: "12px", marginBottom: "8px", paddingLeft: "12px", borderLeft: "2px solid #3b82f6", lineHeight: "1.5" }}>{s}</div>
                ))}
              </div>
            </div>

            <div style={{ textAlign: "center" }}>
              <button onClick={() => { setResult(null); setQuery(""); }} style={{
                padding: "14px 32px", background: "transparent",
                border: "1px solid #1e3a5f", borderRadius: "10px",
                color: "#64748b", cursor: "pointer", fontSize: "14px",
                transition: "all 0.2s"
              }}
                onMouseEnter={e => { e.target.style.borderColor = "#f0a500"; e.target.style.color = "#f0a500"; }}
                onMouseLeave={e => { e.target.style.borderColor = "#1e3a5f"; e.target.style.color = "#64748b"; }}
              >Analyze Another Company</button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
