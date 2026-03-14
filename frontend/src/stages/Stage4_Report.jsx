import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  ArrowLeft, Download, CheckCircle, AlertTriangle, TrendingUp, ShieldAlert, LucideInfo, 
  Loader2, Activity, PieChart as PieIcon, BarChart3, TrendingDown, Clock, Globe, Zap, Shield
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

const STYLES = {
  container: { 
    maxWidth: "900px", 
    margin: "0 auto", 
    padding: "40px 20px", 
    color: "white", 
    fontFamily: "'Inter', sans-serif",
    display: "flex",
    flexDirection: "column",
    gap: "32px"
  },
  headerBanner: {
    background: "linear-gradient(135deg, rgba(240, 164, 0, 0.1) 0%, rgba(10, 22, 40, 0.5) 100%)",
    padding: "40px",
    borderRadius: "24px",
    border: "1px solid rgba(240, 164, 0, 0.2)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    boxSizing: "border-box"
  },
  glassCard: {
    background: "rgba(255,255,255,0.05)",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "16px",
    padding: "24px",
    width: "100%",
    boxSizing: "border-box"
  },
  sectionTitle: {
    fontSize: "18px",
    fontWeight: "700",
    marginBottom: "20px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    color: "#f0a500"
  },
  mainDownloadBtn: {
    background: "#f0a500",
    color: "#0a1628", 
    padding: "20px",
    borderRadius: "12px",
    fontSize: "18px",
    fontWeight: "900",
    cursor: "pointer",
    border: "none",
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    transition: "all 0.3s ease",
    boxShadow: "0 10px 30px rgba(240, 165, 0, 0.3)",
    textTransform: "uppercase",
    letterSpacing: "1px"
  }
};

const Stage4_Report = ({ onBack, entityData }) => {
  const [loading, setLoading] = useState(true);
  const [research, setResearch] = useState(null);
  const [verdict, setVerdict] = useState(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [scoreData, setScoreData] = useState({
    total: 0,
    breakdown: { character: 16, capacity: 18, capital: 14, collateral: 14, conditions: 10 }
  });
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const runFinalAnalysis = async () => {
      setLoading(true);
      try {
        const payload = {
          company_name: entityData?.entity?.companyName || entityData?.name || "Unknown Entity",
          sector: entityData?.entity?.sector || "NBFC"
        };
        
        const API_URL = import.meta.env.VITE_API_URL || 'https://intelli-credit-7kzw.onrender.com';
        
        // Fetch REAL research data
        const res = await axios.post(`${API_URL}/api/research`, payload);
        const researchData = res.data;
        setResearch(researchData);

        // --- SECOND CALL: DOCUMENT-BACKED SCORING ---
        try {
          // Build the extracted_docs structure for scoring
          const extractedDocs = {}
          if (entityData?.extractedData) {
            entityData.extractedData.forEach(doc => {
              extractedDocs[doc.doc_type] = doc.fields
            })
          }
          const scoreRes = await axios.post(`${API_URL}/api/score`, new URLSearchParams({
            data: JSON.stringify({
              ...extractedDocs,
              company_name: payload.company_name,
              sector: payload.sector,
              loan_amount: entityData?.loan?.amount || 50,
              interest_rate: entityData?.loan?.rate || 11.5,
              tenure: entityData?.loan?.tenure || 36
            })
          }))
          const docScore = scoreRes.data
          // Use document score if available, else fall back to web score
          const targetScore = docScore?.total_score || docScore?.score || researchData?.total_score || 72
          
          setScoreData({
            total: targetScore,
            breakdown: {
              character: docScore?.breakdown?.character || researchData?.character_score || 16,
              capacity: docScore?.breakdown?.capacity || researchData?.capacity_score || 18,
              capital: docScore?.breakdown?.capital || researchData?.capital_score || 14,
              collateral: docScore?.breakdown?.collateral || researchData?.collateral_score || 14,
              conditions: docScore?.breakdown?.conditions || researchData?.conditions_score || 10,
            },
            red_flags: docScore?.red_flags || researchData?.risk_flags || [],
            green_flags: docScore?.green_flags || researchData?.positive_signals || [],
            recommended_amount: docScore?.recommended_amount || researchData?.recommended_amount,
            recommended_rate: docScore?.recommended_rate || researchData?.recommended_rate,
            five_cs: docScore?.five_cs || {},
            swot: docScore?.swot || {}
          })

          // ANIMATION LOGIC
          let current = 0;
          const steps = 100;
          const increment = targetScore / steps;
          const interval = setInterval(() => {
            setAnimatedScore(prev => {
              const nextVal = prev + increment;
              if (nextVal >= targetScore) {
                clearInterval(interval);
                return targetScore;
              }
              return Math.ceil(nextVal);
            });
          }, 2000 / steps);

          setVerdict({
            status: docScore?.decision || researchData?.credit_decision || (targetScore >= 75 ? 'APPROVE' : targetScore >= 60 ? 'APPROVE WITH CONDITIONS' : 'REJECT'),
          })
        } catch(scoreErr) {
          console.error("Score API failed:", scoreErr)
          // Fallback to research-only score if score API fails
          const fallbackScore = researchData?.total_score || 72;
          setScoreData({
            total: fallbackScore,
            breakdown: { 
              character: researchData?.character_score || 16, 
              capacity: researchData?.capacity_score || 18, 
              capital: researchData?.capital_score || 14, 
              collateral: researchData?.collateral_score || 14, 
              conditions: researchData?.conditions_score || 10 
            },
            red_flags: researchData?.risk_flags || [],
            green_flags: researchData?.positive_signals || [],
            recommended_amount: researchData?.recommended_amount,
            recommended_rate: researchData?.recommended_rate
          });
          setVerdict({ 
            status: researchData?.credit_decision || (fallbackScore >= 75 ? 'APPROVE' : fallbackScore >= 60 ? 'APPROVE WITH CONDITIONS' : 'REJECT') 
          });
          setAnimatedScore(fallbackScore);
        }
      } catch (error) {
        console.error("Analysis Error:", error);
        setVerdict({ status: 'ERROR' });
      } finally {
        setLoading(false);
      }
    };

    if (entityData?.entity?.companyName) runFinalAnalysis();
    else setLoading(false);
  }, [entityData]);

  const handleDownloadReport = async () => {
    setIsGeneratingPDF(true);
    try {
      const allData = JSON.stringify({
        entity: entityData?.entity || {},
        loan: entityData?.loan || {},
        extracted: entityData?.extractedData || {},
        research: research || {},
        score: scoreData
      });
      const form = new FormData();
      form.append('data', allData);
      const API_URL = import.meta.env.VITE_API_URL || 'https://intelli-credit-7kzw.onrender.com';
      const response = await axios.post(`${API_URL}/api/generate-cam`, form, { responseType: 'blob' });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `CAM_Report_${entityData?.entity?.companyName || 'Export'}.docx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      alert('Failed to generate report.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  if (loading) {
    return (
      <div style={{ ...STYLES.glassCard, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "100px 0", border: "none" }}>
        <Loader2 className="animate-spin" size={64} color="#f0a500" />
        <h2 style={{ marginTop: "24px", fontSize: "24px", fontWeight: "700" }}>Synthesizing REAL-TIME Intelligence...</h2>
        <p style={{ color: "rgba(255,255,255,0.5)", marginTop: "8px" }}>Fetching latest RBI flags and financial news</p>
      </div>
    );
  }

  const getStatusColor = (status) => {
    if (status === 'APPROVE') return "#22c55e";
    if (status === 'APPROVE WITH CONDITIONS') return "#f0a500";
    if (status?.includes('REJECT') || status === 'ERROR') return "#ef4444";
    return "#f0a500";
  };

  // --- CHART DATA ---
  const allExtractedFields = entityData?.extractedData?.reduce((acc, curr) => ({ ...acc, ...curr.fields }), {}) || {};
  
  // Use revenue history from research if available
  const revenueHistory = research?.revenue_history?.length > 0 
    ? research.revenue_history.map(h => ({ year: h.year, value: h.revenue_cr }))
    : [
        { year: 'FY23', value: allExtractedFields.revenue_fy23 || 0 },
        { year: 'FY24', value: allExtractedFields.revenue_fy24 || 0 },
        { year: 'FY25', value: allExtractedFields.revenue || 0 },
      ];

  const barData = {
    labels: revenueHistory.map(d => d.year),
    datasets: [{
      label: 'Revenue (INR Cr)',
      data: revenueHistory.map(d => d.value),
      backgroundColor: '#f0a500',
      borderRadius: 6,
      barThickness: 50,
    }]
  };

  const liveDebt = parseFloat(research?.total_debt || allExtractedFields.total_debt || 0);
  const liveNW   = parseFloat(research?.net_worth || allExtractedFields.net_worth || 0);
  const pieData = {
    labels: [
      `Total Debt: INR ${liveDebt} Cr`,
      `Net Worth: INR ${liveNW} Cr`
    ],
    datasets: [{
      data: [liveDebt, liveNW],
      backgroundColor: ['#ef4444', '#22c55e'],
      borderWidth: 0,
      hoverOffset: 20
    }]
  };

  const chartOptions = (type) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { color: 'rgba(255,255,255,0.6)', padding: 20, font: { size: 12 } } },
      tooltip: { 
        backgroundColor: '#0a1628', 
        titleColor: '#f0a500', 
        bodyColor: 'white',
        padding: 12,
        cornerRadius: 8
      }
    },
    scales: type === 'bar' ? {
      y: { 
        beginAtZero: true, 
        grid: { color: 'rgba(255,255,255,0.05)' }, 
        ticks: { color: 'rgba(255,255,255,0.4)' },
        title: { display: true, text: 'Revenue (INR Cr)', color: 'rgba(255,255,255,0.6)' }
      },
      x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.4)' } }
    } : {}
  });

  return (
    <div style={STYLES.container}>
      
      {/* 1. VERDICT BANNER */}
      <div style={STYLES.headerBanner}>
        <div>
          <div style={{ color: "#f0a500", fontSize: "12px", fontWeight: "900", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "4px" }}>
            Final Underwriting Verdict
          </div>
          <h1 style={{ fontSize: "32px", fontWeight: "900", margin: 0 }}>{entityData?.entity?.companyName}</h1>
          <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
             <span style={{ fontSize: "11px", background: "rgba(255,255,255,0.1)", padding: "4px 10px", borderRadius: "4px", color: "rgba(255,255,255,0.6)" }}>{entityData?.entity?.sector}</span>
             <span style={{ fontSize: "11px", background: "rgba(240, 165, 0, 0.1)", padding: "4px 10px", borderRadius: "4px", color: "#f0a500" }}>{research?.risk_level || "NOT RATED"}</span>
          </div>
        </div>
        <div style={{ 
          padding: "20px 30px", 
          borderRadius: "16px", 
          background: "rgba(0,0,0,0.2)", 
          border: `2px solid ${getStatusColor(verdict?.status)}`,
          textAlign: "center"
        }}>
          <div style={{ fontSize: "10px", fontWeight: "700", opacity: 0.5, marginBottom: "4px" }}>CREDIT DECISION</div>
          <div style={{ fontSize: "20px", fontWeight: "900", color: getStatusColor(verdict?.status) }}>{verdict?.status}</div>
        </div>
      </div>

      {/* RESEARCH SUMMARY */}
      <div style={{ ...STYLES.glassCard, borderLeft: "4px solid #f0a500", background: "rgba(240, 165, 0, 0.03)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
            <Shield size={24} color="#f0a500" />
            <h3 style={{ ...STYLES.sectionTitle, margin: 0 }}>Secondary Research Intelligence</h3>
          </div>
          <p style={{ fontSize: "15px", lineHeight: "1.6", color: "rgba(255,255,255,0.7)", margin: 0 }}>
             {research?.research_summary || "Real-time web signals analysis."}
          </p>
          <div style={{ marginTop: "16px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
             <span style={{ fontSize: "10px", background: "rgba(255,255,255,0.05)", padding: "4px 8px", borderRadius: "4px", color: "rgba(255,255,255,0.4)" }}>SECTOR OUTLOOK: {research?.sector_outlook?.toUpperCase()}</span>
             <span style={{ fontSize: "10px", background: "rgba(34, 197, 94, 0.1)", padding: "4px 8px", borderRadius: "4px", color: "#22c55e" }}>PROMOTER: {research?.promoter_background?.slice(0, 50)}...</span>
          </div>
      </div>

      {/* NEW: RBI REGULATORY FLAGS */}
      {research?.rbi_regulatory_flags?.length > 0 && (
         <div style={{ ...STYLES.glassCard, borderLeft: "4px solid #ef4444", background: "rgba(239, 68, 68, 0.05)" }}>
            <h3 style={{ ...STYLES.sectionTitle, color: "#ef4444" }}>
              <ShieldAlert size={20} /> RBI & Regulatory Flags
            </h3>
            <ul style={{ padding: 0, margin: 0, listStyle: "none", fontSize: "14px", color: "rgba(255,255,255,0.8)", lineHeight: "1.6" }}>
              {research.rbi_regulatory_flags.map((flag, i) => (
                <li key={i} style={{ marginBottom: "8px", display: "flex", gap: "10px" }}>
                  <span style={{ color: "#ef4444", fontWeight: "bold" }}>●</span> {flag}
                </li>
              ))}
            </ul>
         </div>
      )}

      {/* CHARTS ROW */}
      <div style={{ display: "flex", gap: "24px", width: "100%" }}>
         <div style={{ ...STYLES.glassCard, flex: 1 }}>
            <h4 style={{ fontSize: "13px", fontWeight: "700", marginBottom: "20px", color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", gap: "8px" }}>
              <BarChart3 size={16} color="#f0a500" /> Revenue Growth (INR Cr)
            </h4>
            <div style={{ height: "300px", position: "relative" }}>
               <Bar data={barData} options={chartOptions('bar')} />
            </div>
         </div>
         <div style={{ ...STYLES.glassCard, flex: 1 }}>
            <h4 style={{ fontSize: "13px", fontWeight: "700", marginBottom: "20px", color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", gap: "8px" }}>
              <PieIcon size={16} color="#ef4444" /> Capital Structure
            </h4>
            <div style={{ height: "300px" }}>
               <Pie data={pieData} options={chartOptions('pie')} />
            </div>
         </div>
      </div>

      {/* CREDIT MATRIX */}
      <div style={{ ...STYLES.glassCard, display: "flex", gap: "40px", alignItems: "center" }}>
          <div style={{ flex: 1 }}>
              <h3 style={STYLES.sectionTitle}>
                <Shield size={20} /> AI Score Breakdown
              </h3>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {[
                    { label: "Character (Litigation & Promoter)", val: scoreData.breakdown.character, max: 20 },
                    { label: "Capacity (Interest Coverage)", val: scoreData.breakdown.capacity, max: 25 },
                    { label: "Capital (CAR & DE Ratio)", val: scoreData.breakdown.capital, max: 20 },
                    { label: "Collateral (Asset Quality)", val: scoreData.breakdown.collateral, max: 20 },
                    { label: "Conditions (Sector Headwinds)", val: scoreData.breakdown.conditions, max: 15 },
                  ].map((row, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <td style={{ padding: "14px 0", fontSize: "14px", color: "rgba(255,255,255,0.7)" }}>{row.label}</td>
                      <td style={{ padding: "14px 0", textAlign: "right", fontWeight: "700" }}>{row.val}/{row.max}</td>
                    </tr>
                  ))}
                  <tr>
                    <td style={{ padding: "18px 0", fontWeight: "900", color: "#f0a500" }}>INTELLI-SCORE AGGREGATE</td>
                    <td style={{ padding: "18px 0", textAlign: "right", fontWeight: "900", color: "#f0a500", fontSize: "20px" }}>{scoreData.total}/100</td>
                  </tr>
                </tbody>
              </table>
          </div>
          <div style={{ width: "240px", background: "rgba(255,255,255,0.02)", borderRadius: "20px", padding: "30px", textAlign: "center", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
                <svg width="150" height="150" viewBox="0 0 200 200">
                  <circle cx="100" cy="100" r="90" stroke="rgba(255,255,255,0.03)" strokeWidth="12" fill="transparent" />
                  <circle cx="100" cy="100" r="90" 
                    stroke={animatedScore >= 75 ? '#22c55e' : animatedScore >= 60 ? '#f0a500' : '#ef4444'} 
                    strokeWidth="12" fill="transparent" 
                    strokeDasharray="565" strokeDashoffset={565 - (565 * animatedScore / 100)} 
                    strokeLinecap="round" transform="rotate(-90 100 100)" style={{ transition: "stroke-dashoffset 0.8s ease" }} />
                </svg>
                <div style={{ position: "absolute", fontSize: "40px", fontWeight: "900" }}>{animatedScore}</div>
              </div>
              <div style={{ color: animatedScore >= 75 ? '#22c55e' : animatedScore >= 60 ? '#f0a500' : '#ef4444', fontWeight: "900", fontSize: "14px", letterSpacing: "2px" }}>
                {research?.risk_level || "CALCULATING"}
              </div>
          </div>
      </div>

      {/* POSITIVES & RISKS */}
      <div style={{ display: "flex", gap: "24px", width: "100%" }}>
         <div style={{ flex: 1, padding: "24px", borderRadius: "16px", background: "rgba(34, 197, 94, 0.05)", border: "1px solid rgba(34, 197, 94, 0.2)" }}>
            <h4 style={{ color: "#22c55e", fontSize: "14px", fontWeight: "800", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
              <CheckCircle size={18} /> POSITIVE SIGNALS
            </h4>
            <ul style={{ padding: 0, margin: 0, listStyle: "none", fontSize: "13px", color: "rgba(255,255,255,0.6)", lineHeight: "1.6" }}>
               {research?.positive_signals?.map((s, i) => <li key={i} style={{ marginBottom: "8px" }}>✓ {s}</li>)}
            </ul>
         </div>
         <div style={{ flex: 1, padding: "24px", borderRadius: "16px", background: "rgba(239, 68, 68, 0.05)", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
            <h4 style={{ color: "#ef4444", fontSize: "14px", fontWeight: "800", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
              <AlertTriangle size={18} /> RISK FLAGS
            </h4>
            <ul style={{ padding: 0, margin: 0, listStyle: "none", fontSize: "13px", color: "rgba(255,255,255,0.6)", lineHeight: "1.6" }}>
               {research?.risk_flags?.map((f, i) => <li key={i} style={{ marginBottom: "8px" }}>⚠ {f}</li>)}
            </ul>
         </div>
      </div>

      {/* NEWS SECTION */}
      <div style={STYLES.glassCard}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h3 style={STYLES.sectionTitle}><Globe size={20} /> Latest Headlines</h3>
            <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)" }}>REAL-TIME FEED</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
             {research?.latest_news?.map((news, i) => (
                <div key={i} style={{ padding: "12px 16px", background: "rgba(255,255,255,0.02)", borderRadius: "8px", fontSize: "14px", color: "rgba(255,255,255,0.7)" }}>
                   {news}
                </div>
             ))}
          </div>
      </div>

      {/* SWOT SECTION */}
      {scoreData?.swot && Object.keys(scoreData.swot).length > 0 && (
        <div style={STYLES.glassCard}>
          <h3 style={STYLES.sectionTitle}>SWOT Analysis (Pre-Cognitive Insight)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {[
              { key: 'strengths', color: '#22c55e', bg: 'rgba(34,197,94,0.05)', border: 'rgba(34,197,94,0.2)' },
              { key: 'weaknesses', color: '#ef4444', bg: 'rgba(239,68,68,0.05)', border: 'rgba(239,68,68,0.2)' },
              { key: 'opportunities', color: '#3b82f6', bg: 'rgba(59,130,246,0.05)', border: 'rgba(59,130,246,0.2)' },
              { key: 'threats', color: '#f97316', bg: 'rgba(249,115,22,0.05)', border: 'rgba(249,115,22,0.2)' },
            ].map(({ key, color, bg, border }) => (
              <div key={key} style={{ padding: '20px', borderRadius: '12px', background: bg, border: `1px solid ${border}` }}>
                <h4 style={{ color, fontSize: '13px', fontWeight: '800', marginBottom: '12px', letterSpacing: '1px' }}>
                  {key.toUpperCase()}
                </h4>
                <ul style={{ padding: 0, margin: 0, listStyle: 'none', fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.8' }}>
                  {(scoreData.swot[key] || []).map((item, i) => (
                    <li key={i}>• {item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PROPOSED TERMS */}
      <div style={{ ...STYLES.glassCard, background: "rgba(240, 165, 0, 0.08)", border: "1px solid rgba(240, 165, 0, 0.3)" }}>
          <h3 style={STYLES.sectionTitle}>Proposed Loan Terms</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "40px" }}>
             <div>
                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginBottom: "6px" }}>RECOMMENDED LIMIT</div>
                <div style={{ fontSize: '24px', fontWeight: '900', color: '#f0a500' }}>INR {scoreData?.recommended_amount || entityData?.loan?.amount} Cr</div>
             </div>
             <div>
                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginBottom: "6px" }}>INTEREST RATE</div>
                <div style={{ fontSize: "24px", fontWeight: "900" }}>{scoreData?.recommended_rate || `Base + ${entityData?.loan?.rate}%`}</div>
             </div>
             <div>
                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginBottom: "6px" }}>TENURE</div>
                <div style={{ fontSize: "24px", fontWeight: "900" }}>{entityData?.loan?.tenure} Months</div>
             </div>
          </div>
      </div>

      {/* DOWNLOAD BUTTON */}
      <button style={STYLES.mainDownloadBtn} onClick={handleDownloadReport} disabled={isGeneratingPDF}>
        {isGeneratingPDF ? (
          <><Loader2 className="animate-spin" size={24} /> Building Full Credit Memo...</>
        ) : (
          <><Download size={24} /> DOWNLOAD COMPLETE CAM REPORT (DOCX)</>
        )}
      </button>

      <div style={{ textAlign: "center", marginTop: "10px" }}>
          <button style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", margin: "0 auto" }} onClick={() => onBack()}>
             <ArrowLeft size={14} /> Back to Analysis
          </button>
      </div>

    </div>
  );
};

export default Stage4_Report;
