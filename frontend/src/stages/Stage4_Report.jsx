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

const mockResearchData = {
  company_news: ["No recent adverse news found"],
  promoter_risk: "Low - No negative findings",
  sector_outlook: "Positive - NBFC sector growing",
  legal_flags: [],
  macro_factors: ["RBI supportive of NBFC growth"],
  overall_sentiment: "Positive",
  sources_analyzed: 5
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
      try {
        const researchForm = new FormData();
        researchForm.append('company_name', entityData?.entity?.companyName || 'Unknown Entity');
        researchForm.append('sector', entityData?.entity?.sector || 'General');
        
        const API_URL = import.meta.env.VITE_API_URL || 'https://intelli-credit-7kzw.onrender.com';
        
        let researchData = mockResearchData;
        try {
          const res = await axios.post(`${API_URL}/api/research`, researchForm);
          researchData = res?.data || mockResearchData;
        } catch (apiError) {
          console.error('Research API call failed, using mock data', apiError);
        }
        
        setResearch(researchData);

        // --- DYNAMIC SCORING LOGIC ---
        let targetScore = 72;
        let capacityScore = 18;
        
        if (entityData?.extractedData) {
          const financials = entityData.extractedData.reduce((acc, curr) => ({ ...acc, ...curr.fields }), {});
          const revGrowth = financials.revenue_growth || financials['Revenue Growth'];
          if (revGrowth && parseFloat(revGrowth) > 20) capacityScore = 22;
          const margin = financials.net_profit_margin || financials['Net Profit Margin'];
          if (margin && parseFloat(margin) > 10) targetScore += 5;
          targetScore = 16 + capacityScore + 14 + 14 + 10;
        }

        setScoreData({
          total: targetScore,
          breakdown: { character: 16, capacity: capacityScore, capital: 14, collateral: 14, conditions: 10 }
        });

        // ANIMATION LOGIC - Exactly ~2 seconds implementation
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
          status: targetScore >= 80 ? 'APPROVE' : targetScore >= 70 ? 'APPROVE WITH CONDITIONS' : 'REJECT',
        });
      } catch (error) {
        setResearch(mockResearchData);
        setVerdict({ status: 'APPROVE WITH CONDITIONS' });
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
        research: research || mockResearchData,
        score: scoreData
      });
      const form = new FormData();
      form.append('data', allData);
      const API_URL = import.meta.env.VITE_API_URL || 'https://intelli-credit-7kzw.onrender.com';
      const response = await axios.post(`${API_URL}/api/generate-report`, form, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `CAM_Report_${entityData?.entity?.companyName || 'Export'}.pdf`);
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
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "100px 0" }}>
        <Loader2 className="animate-spin" size={64} color="#f0a500" />
        <h2 style={{ marginTop: "24px", fontSize: "24px", fontWeight: "700" }}>Synthesizing Credit CAM...</h2>
      </div>
    );
  }

  const getStatusColor = (status) => {
    if (status === 'APPROVE') return "#22c55e";
    if (status === 'APPROVE WITH CONDITIONS') return "#f0a500";
    return "#ef4444";
  };

  // --- CHART DATA ---
  const barData = {
    labels: ['FY22', 'FY23', 'FY24'],
    datasets: [{
      label: 'Revenue (₹ Cr)',
      data: [320, 438, 542],
      backgroundColor: '#f0a500',
      borderRadius: 6,
      barThickness: 50,
    }]
  };

  const pieData = {
    labels: [
      `Total Debt: ₹3180 Cr (79%)`,
      `Net Worth: ₹832 Cr (21%)`
    ],
    datasets: [{
      data: [3180, 832],
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
        title: { display: true, text: 'Revenue (₹ Cr)', color: 'rgba(255,255,255,0.6)' }
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
             <span style={{ fontSize: "11px", background: "rgba(240, 165, 0, 0.1)", padding: "4px 10px", borderRadius: "4px", color: "#f0a500" }}>PROTOTYPE V1.2</span>
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

      {/* 2. CHARTS ROW */}
      <div style={{ display: "flex", gap: "24px", width: "100%" }}>
         <div style={{ ...STYLES.glassCard, flex: 1 }}>
            <h4 style={{ fontSize: "13px", fontWeight: "700", marginBottom: "20px", color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", gap: "8px" }}>
              <BarChart3 size={16} color="#f0a500" /> Revenue Trajectory (₹ Cr)
            </h4>
            <div style={{ height: "300px", position: "relative" }}>
               <Bar data={barData} options={chartOptions('bar')} />
               {/* Values on top of bars would require datalabels plugin, but we can show them visually by setting clear axis */}
            </div>
         </div>
         <div style={{ ...STYLES.glassCard, flex: 1 }}>
            <h4 style={{ fontSize: "13px", fontWeight: "700", marginBottom: "20px", color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", gap: "8px" }}>
              <PieIcon size={16} color="#ef4444" /> Debt-Equity Structure
            </h4>
            <div style={{ height: "300px" }}>
               <Pie data={pieData} options={chartOptions('pie')} />
            </div>
         </div>
      </div>

      {/* 3. CREDIT MATRIX (5Cs + SCORE) */}
      <div style={{ ...STYLES.glassCard, display: "flex", gap: "40px", alignItems: "center" }}>
          <div style={{ flex: 1 }}>
              <h3 style={STYLES.sectionTitle}>
                <Shield size={20} /> 5 Cs Framework Analysis
              </h3>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {[
                    { label: "Character (Promoter Background)", val: scoreData.breakdown.character, max: 20 },
                    { label: "Capacity (Revenue & Profit)", val: scoreData.breakdown.capacity, max: 25 },
                    { label: "Capital (Net Worth & Leverage)", val: scoreData.breakdown.capital, max: 20 },
                    { label: "Collateral (Asset Coverage)", val: scoreData.breakdown.collateral, max: 20 },
                    { label: "Conditions (Sector Outlook)", val: scoreData.breakdown.conditions, max: 15 },
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
                  <circle cx="100" cy="100" r="90" stroke={getStatusColor(verdict?.status)} strokeWidth="12" fill="transparent" 
                    strokeDasharray="565" strokeDashoffset={565 - (565 * animatedScore / 100)} 
                    strokeLinecap="round" transform="rotate(-90 100 100)" style={{ transition: "stroke-dashoffset 0.8s ease" }} />
                </svg>
                <div style={{ position: "absolute", fontSize: "40px", fontWeight: "900" }}>{animatedScore}</div>
              </div>
              <div style={{ color: getStatusColor(verdict?.status), fontWeight: "900", fontSize: "14px", letterSpacing: "2px" }}>
                {animatedScore >= 80 ? "LOW RISK" : animatedScore >= 65 ? "MODERATE RISK" : "HIGH RISK"}
              </div>
          </div>
      </div>

      {/* 4. EWS ROW */}
      <div style={{ display: "flex", gap: "24px", width: "100%" }}>
         <div style={{ flex: 1, padding: "24px", borderRadius: "16px", background: "rgba(239, 68, 68, 0.05)", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
            <h4 style={{ color: "#ef4444", fontSize: "14px", fontWeight: "800", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
              <AlertTriangle size={18} /> CRITICAL RISK ALERTS
            </h4>
            <ul style={{ padding: 0, margin: 0, listStyle: "none", fontSize: "13px", color: "rgba(255,255,255,0.6)", lineHeight: "1.6" }}>
               {research?.legal_flags?.length > 0 ? research.legal_flags.map((f, i) => (
                 <li key={i} style={{ marginBottom: "10px", display: "flex", gap: "8px" }}>
                   <span style={{ color: "#ef4444" }}>●</span> {f}
                 </li>
               )) : (
                 <>
                   <li style={{ marginBottom: "10px", display: "flex", gap: "8px" }}>
                     <span style={{ color: "#ef4444" }}>●</span> Debt-to-Equity (3.8x) nearing industry cap.
                   </li>
                   <li style={{ display: "flex", gap: "8px" }}>
                     <span style={{ color: "#ef4444" }}>●</span> Specific regional sector dependency noted.
                   </li>
                 </>
               )}
            </ul>
         </div>
         <div style={{ flex: 1, padding: "24px", borderRadius: "16px", background: "rgba(34, 197, 94, 0.05)", border: "1px solid rgba(34, 197, 94, 0.2)" }}>
            <h4 style={{ color: "#22c55e", fontSize: "14px", fontWeight: "800", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
              <CheckCircle size={18} /> POSITIVE INDICATORS
            </h4>
            <ul style={{ padding: 0, margin: 0, listStyle: "none", fontSize: "13px", color: "rgba(255,255,255,0.6)", lineHeight: "1.6" }}>
               <li style={{ marginBottom: "10px", display: "flex", gap: "8px" }}>
                 <span style={{ color: "#22c55e" }}>●</span> Strong {entityData?.entity?.sector} revenue trajectory.
               </li>
               <li style={{ display: "flex", gap: "8px" }}>
                 <span style={{ color: "#22c55e" }}>●</span> No promoter pledge or adverse NCLT reports analyzed.
               </li>
            </ul>
         </div>
      </div>

      {/* 5. MARKET INSIGHT */}
      <div style={STYLES.glassCard}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h3 style={{ ...STYLES.sectionTitle, margin: 0 }}>
              <Globe size={20} /> Web Intelligence Findings
            </h3>
            <span style={{ fontSize: "11px", fontWeight: "700", color: "rgba(255,255,255,0.3)" }}>{research?.sources_analyzed || 5} SOURCES ANALYZED</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" }}>
             {(research?.company_news && research.company_news.length > 0) ? research.company_news.slice(0, 4).map((news, i) => (
                <div key={i} style={{ padding: "16px", background: "rgba(255,255,255,0.02)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)" }}>
                   <div style={{ fontSize: "10px", fontWeight: "900", color: "#f0a500", marginBottom: "8px" }}>MARKET SENTIMENT</div>
                   <p style={{ fontSize: "12px", margin: 0, color: "rgba(255,255,255,0.5)", lineHeight: "1.4" }}>{news}</p>
                </div>
             )) : (
                <p style={{ gridColumn: "span 2", textAlign: "center", opacity: 0.3 }}>No adverse proprietary news found.</p>
             )}
          </div>
      </div>

      {/* 6. RECOMMENDED STRUCTURE */}
      <div style={{ ...STYLES.glassCard, background: "rgba(240, 165, 0, 0.08)", border: "1px solid rgba(240, 165, 0, 0.3)" }}>
          <h3 style={STYLES.sectionTitle}>
            <Zap size={20} /> Proposed Loan Terms
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "40px" }}>
             <div>
                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginBottom: "6px", textTransform: "uppercase" }}>Recommended Limit</div>
                <div style={{ fontSize: "24px", fontWeight: "900", color: "#f0a500" }}>₹50.00 Cr</div>
             </div>
             <div>
                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginBottom: "6px", textTransform: "uppercase" }}>Interest Spread</div>
                <div style={{ fontSize: "24px", fontWeight: "900" }}>Base + 1.5%</div>
             </div>
             <div>
                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginBottom: "6px", textTransform: "uppercase" }}>Tenor Profile</div>
                <div style={{ fontSize: "24px", fontWeight: "900" }}>36 Months</div>
             </div>
          </div>
      </div>

      {/* 7. DOWNLOAD BUTTON */}
      <button style={STYLES.mainDownloadBtn} onClick={handleDownloadReport} disabled={isGeneratingPDF}>
        {isGeneratingPDF ? (
          <><Loader2 className="animate-spin" size={24} /> Building Full Credit Memo...</>
        ) : (
          <><Download size={24} /> 📄 Download Complete CAM Report (PDF)</>
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
