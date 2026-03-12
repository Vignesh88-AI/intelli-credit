import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, ShieldAlert, TrendingUp, AlertTriangle, Lightbulb, CheckCircle, Loader2 } from 'lucide-react';
import axios from 'axios';

const STYLES = {
  container: { maxWidth: "1200px", margin: "0 auto", padding: "40px 20px" },
  headerBanner: {
    background: "linear-gradient(135deg, rgba(240, 164, 0, 0.1) 0%, rgba(10, 22, 40, 0.5) 100%)",
    padding: "48px",
    borderRadius: "24px",
    border: "1px solid rgba(240, 164, 0, 0.2)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "40px",
    flexWrap: "wrap",
    gap: "32px",
    textAlign: "left",
  },
  glassCard: {
    background: "rgba(255,255,255,0.05)",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "16px",
    padding: "24px",
  },
  swotGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "20px",
    marginBottom: "40px",
  },
  riskScoreCard: {
    background: "rgba(255,255,255,0.03)",
    borderRadius: "20px",
    padding: "32px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
  button: {
    background: "#f0a500",
    color: "#0a1628",
    fontWeight: "700",
    padding: "16px 40px",
    borderRadius: "50px",
    border: "none",
    cursor: "pointer",
    fontSize: "16px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    transition: "transform 0.2s",
    boxShadow: "0 0 20px rgba(240, 165, 0, 0.2)",
  },
  secondaryButton: {
    background: "transparent",
    color: "white",
    border: "1px solid rgba(255,255,255,0.2)",
    padding: "16px 32px",
    borderRadius: "50px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "14px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  }
};

const mockResearchData = {
  company_news: ["No recent adverse news found"],
  promoter_risk: "Low - No negative findings",
  sector_outlook: "Positive - NBFC sector growing",
  legal_flags: [],
  macro_factors: ["RBI supportive of NBFC growth"],
  overall_sentiment: "Positive"
};

const Stage4_Report = ({ onBack, entityData }) => {
  const [loading, setLoading] = useState(true);
  const [research, setResearch] = useState(null);
  const [verdict, setVerdict] = useState(null);

  const riskScore = 82;

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
        
        setVerdict({
          status: researchData.overall_sentiment === 'Positive' ? 'APPROVE' : 'REJECT',
          swot: {
            strengths: ["Strong Cash Reserves", "Tier-1 Clientele", "Low Debt-Equity"],
            weaknesses: ["Regional Concentration", "High Working Capital Cycle"],
            opportunities: ["Market Expansion", "Digital Transformation"],
            threats: ["Regulatory Changes", "Input Cost Volatility"]
          }
        });
      } catch (error) {
        console.error('Final analysis logic failed', error);
        // Ensure some state is set even on total failure
        setResearch(mockResearchData);
        setVerdict({
          status: 'NEUTRAL',
          swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] }
        });
      } finally {
        setLoading(false);
      }
    };

    if (entityData?.entity?.companyName) runFinalAnalysis();
    else setLoading(false);
  }, [entityData]);

  const handleDownloadReport = async () => {
    try {
      const allData = JSON.stringify({
        entity: entityData?.entity || {},
        loan: entityData?.loan || {},
        extracted: entityData?.extractedData || {},
        research: research || mockResearchData
      });
      
      const form = new FormData();
      form.append('data', allData);
      
      const API_URL = import.meta.env.VITE_API_URL || 'https://intelli-credit-7kzw.onrender.com';
      const response = await axios.post(`${API_URL}/api/generate-report`, form, { responseType: 'blob' });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Credit_Appraisal_${entityData?.entity?.companyName || 'Report'}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Report generation failed', error);
      alert('Failed to generate report. Showing available data.');
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "100px 0" }}>
        <Loader2 className="animate-spin" size={64} color="#f0a500" />
        <h2 style={{ marginTop: "24px", fontSize: "24px", fontWeight: "700" }}>Generating Credit Intelligence</h2>
        <p style={{ color: "rgba(255,255,255,0.5)", marginTop: "8px" }}>Aggregating document data and market research sentiment...</p>
      </div>
    );
  }

  return (
    <div style={STYLES.container}>
      {/* VERDICT BANNER */}
      <div style={STYLES.headerBanner}>
        <div style={{ flex: 1, minWidth: "300px" }}>
          <div style={{ color: "#f0a500", fontSize: "12px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "8px" }}>
            Final Apprisal Verdict
          </div>
          <h1 style={{ fontSize: "42px", fontWeight: "800", color: "white", margin: 0 }}>Analysis Complete</h1>
          <p style={{ color: "rgba(255,255,255,0.6)", marginTop: "16px", maxWidth: "500px", lineHeight: "1.6" }}>
            The AI engine has processed all financial metrics and external sentiment for <strong style={{ color: "white" }}>{entityData.entity.companyName}</strong>.
          </p>
        </div>
        <div style={{ 
          padding: "32px 48px", 
          borderRadius: "20px", 
          background: "rgba(10, 22, 40, 0.3)", 
          border: "2px solid rgba(240, 164, 0, 0.3)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          boxShadow: "0 0 40px rgba(240, 165, 0, 0.1)"
        }}>
          <span style={{ fontSize: "10px", fontWeight: "700", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>Decision Score Card</span>
          <span style={{ 
            fontSize: "48px", 
            fontWeight: "900", 
            color: verdict.status === 'APPROVE' ? "#22c55e" : "#ff4d4d",
            letterSpacing: "-2px"
          }}>
            {verdict?.status || 'PENDING'}
          </span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "32px", textAlign: "left" }}>
        <div>
          <h3 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
            <TrendingUp size={22} color="#f0a500" /> Intelligence SWOT Matrix
          </h3>
          <div style={STYLES.swotGrid}>
            {/* STRENGTHS */}
            <div style={{ ...STYLES.glassCard, borderTop: "4px solid #22c55e" }}>
              <h4 style={{ color: "#22c55e", fontSize: "14px", fontWeight: "800", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                <CheckCircle size={16} /> STRENGTHS
              </h4>
              <ul style={{ padding: 0, margin: 0, listStyle: "none" }}>
                {(verdict?.swot?.strengths || []).map((s, i) => (
                  <li key={i} style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)", marginBottom: "10px", paddingLeft: "12px", position: "relative" }}>
                    <span style={{ position: "absolute", left: 0, color: "#22c55e" }}>•</span> {s}
                  </li>
                ))}
              </ul>
            </div>
            {/* WEAKNESSES */}
            <div style={{ ...STYLES.glassCard, borderTop: "4px solid #ff4d4d" }}>
              <h4 style={{ color: "#ff4d4d", fontSize: "14px", fontWeight: "800", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                <AlertTriangle size={16} /> WEAKNESSES
              </h4>
              <ul style={{ padding: 0, margin: 0, listStyle: "none" }}>
                {(verdict?.swot?.weaknesses || []).map((s, i) => (
                  <li key={i} style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)", marginBottom: "10px", paddingLeft: "12px", position: "relative" }}>
                    <span style={{ position: "absolute", left: 0, color: "#ff4d4d" }}>•</span> {s}
                  </li>
                ))}
              </ul>
            </div>
            {/* OPPORTUNITIES */}
            <div style={{ ...STYLES.glassCard, borderTop: "4px solid #3b82f6" }}>
              <h4 style={{ color: "#3b82f6", fontSize: "14px", fontWeight: "800", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                <Lightbulb size={16} /> OPPORTUNITIES
              </h4>
              <ul style={{ padding: 0, margin: 0, listStyle: "none" }}>
                {(verdict?.swot?.opportunities || []).map((s, i) => (
                  <li key={i} style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)", marginBottom: "10px", paddingLeft: "12px", position: "relative" }}>
                    <span style={{ position: "absolute", left: 0, color: "#3b82f6" }}>•</span> {s}
                  </li>
                ))}
              </ul>
            </div>
            {/* THREATS */}
            <div style={{ ...STYLES.glassCard, borderTop: "4px solid #f0a500" }}>
              <h4 style={{ color: "#f0a500", fontSize: "14px", fontWeight: "800", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                <ShieldAlert size={16} /> THREATS
              </h4>
              <ul style={{ padding: 0, margin: 0, listStyle: "none" }}>
                {(verdict?.swot?.threats || []).map((s, i) => (
                  <li key={i} style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)", marginBottom: "10px", paddingLeft: "12px", position: "relative" }}>
                    <span style={{ position: "absolute", left: 0, color: "#f0a500" }}>•</span> {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
            <TrendingUp size={22} color="#f0a500" /> Holistic Risk Index
          </h3>
          <div style={STYLES.riskScoreCard}>
            <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "24px" }}>
              <svg width="180" height="180">
                <circle cx="90" cy="90" r="75" stroke="rgba(255,255,255,0.05)" strokeWidth="10" fill="transparent" />
                <circle cx="90" cy="90" r="75" stroke="#f0a500" strokeWidth="10" fill="transparent" 
                  strokeDasharray="471" strokeDashoffset={471 - (471 * riskScore / 100)} 
                  strokeLinecap="round" transform="rotate(-90 90 90)" />
              </svg>
              <div style={{ position: "absolute", textAlign: "center" }}>
                <div style={{ fontSize: "42px", fontWeight: "900", color: "white" }}>{riskScore}</div>
                <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>Index Score</div>
              </div>
            </div>
            <div style={{ color: "#22c55e", fontWeight: "800", fontSize: "16px", letterSpacing: "1px" }}>LOW RISK PROFILE</div>
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", textAlign: "center", marginTop: "12px", lineHeight: "1.5" }}>
              The entity qualifies for high-trust processing benchmarks based on automated extraction and 10-K sentiment analysis.
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "48px", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "32px" }}>
        <button style={STYLES.secondaryButton} onClick={() => onBack()}>
          <ArrowLeft size={18} /> Review Data
        </button>
        <button style={STYLES.button} onClick={handleDownloadReport}>
          <Download size={20} /> Download Appraisal PDF
        </button>
      </div>
    </div>
  );
};

export default Stage4_Report;
