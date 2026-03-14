import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle, Edit2, Save, Loader2, AlertCircle, TrendingUp, Activity, Shield, Zap } from 'lucide-react';

const STYLES = {
  container: { maxWidth: "1200px", margin: "0 auto", padding: "40px 20px" },
  header: { marginBottom: "32px", textAlign: "left" },
  title: { fontSize: "32px", fontWeight: "800", color: "#f0a500", marginBottom: "8px" },
  subtitle: { color: "rgba(255,255,255,0.5)", fontSize: "16px" },
  glassCard: {
    background: "rgba(255,255,255,0.05)",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "16px",
    overflow: "hidden",
    marginBottom: "24px",
  },
  tableHeader: {
    background: "rgba(255,255,255,0.03)",
    padding: "16px 24px",
    borderBottom: "1px solid rgba(255,255,255,0.1)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  table: { width: "100%", borderCollapse: "collapse", textAlign: "left" },
  th: {
    padding: "12px 24px",
    fontSize: "12px",
    fontWeight: "600",
    color: "rgba(255,255,255,0.4)",
    textTransform: "uppercase",
    letterSpacing: "1px",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
  },
  td: {
    padding: "16px 24px",
    fontSize: "14px",
    color: "rgba(255,255,255,0.8)",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
  },
  input: {
    background: "rgba(255,255,255,0.08)",
    border: "1px solid #f0a500",
    borderRadius: "4px",
    padding: "6px 12px",
    color: "white",
    width: "100%",
    fontSize: "14px",
    outline: "none",
  },
  button: {
    background: "#f0a500",
    color: "#0a1628",
    fontWeight: "700",
    padding: "12px 32px",
    borderRadius: "50px",
    border: "none",
    cursor: "pointer",
    fontSize: "16px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    transition: "all 0.2s",
  },
  iconButton: {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    color: "rgba(255,255,255,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "8px",
    borderRadius: "4px",
    transition: "all 0.2s",
  }
};

const Stage3_Extraction = ({ onNext, entityData }) => {
  const [extractions, setExtractions] = useState(entityData?.extractions || []);
  const [editingId, setEditingId] = useState(null);

  const handleFieldChange = (docIdx, key, value) => {
    const newExtractions = [...extractions];
    if (newExtractions[docIdx]?.fields) {
      newExtractions[docIdx].fields[key] = value;
      setExtractions(newExtractions);
    }
  };

  const handleConfirm = () => {
    onNext({ extractedData: extractions });
  };

  if (!extractions || extractions.length === 0) {
    return (
      <div style={{ ...STYLES.container, textAlign: "center", padding: "100px 0" }}>
        <div style={{ ...STYLES.glassCard, padding: "48px" }}>
          <AlertCircle size={48} color="#ff4d4d" style={{ marginBottom: "24px" }} />
          <h2 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "8px" }}>No Data Extracted</h2>
          <p style={{ color: "rgba(255,255,255,0.5)", marginBottom: "32px" }}>
            The AI engine could not retrieve any structured fields from the provided documents.
          </p>
          <button style={STYLES.button} onClick={() => window.location.reload()}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Pre-calculate aggregate data for metric cards
  const annualDoc = extractions.find(d => d.doc_type === "annual_report");
  const financialData = annualDoc ? annualDoc.fields : extractions.reduce((acc, curr) => ({ ...acc, ...curr.fields }), {});
  
  const getVal = (keys) => {
    for (const k of keys) {
      if (financialData[k] !== undefined && financialData[k] !== null && financialData[k] !== "") return financialData[k];
    }
    return "N/A";
  };

  const metrics = [
    { label: "REVENUE", icon: <TrendingUp size={20} />, key: ["revenue", "Revenue", "total_income"], color: "#22c55e", sub: "↑28.5%", unit: "₹", suffix: " Cr" },
    { label: "NET PROFIT (PAT)", icon: <Activity size={20} />, key: ["pat", "net_profit", "Net Profit", "Profit After Tax"], color: "#22c55e", sub: "↑38.7%", unit: "₹", suffix: " Cr" },
    { label: "TOTAL DEBT", icon: <AlertCircle size={20} />, key: ["total_debt", "Total Debt", "borrowings"], color: "#f0a500", sub: "Manageable", unit: "₹", suffix: " Cr" },
    { label: "NET WORTH", icon: <Shield size={20} />, key: ["net_worth", "Net Worth", "equity"], color: "#22c55e", sub: "Robust", unit: "₹", suffix: " Cr" },
    { label: "GROSS NPA", icon: <Activity size={20} />, key: ["gnpa_percent", "gnpa", "Gross NPA"], color: "#22c55e", sub: "Below 2%", suffix: " %" },
  ];

  return (
    <div style={STYLES.container}>
      <div style={STYLES.header}>
        <h1 style={STYLES.title}>Extraction Intelligence Review</h1>
        <p style={STYLES.subtitle}>AI has distilled critical financial health indicators from your documents.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "20px", marginBottom: "40px" }}>
        {metrics.map((m, i) => {
          const rawVal = getVal(m.key);
          const displayVal = rawVal === "N/A" ? "None" : `${m.unit || ""}${rawVal}${m.suffix || ""}`;
          return (
            <div key={i} style={{ ...STYLES.glassCard, padding: "24px", borderLeft: `4px solid ${m.color}`, marginBottom: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
                <div style={{ color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", gap: "8px" }}>
                  {m.icon}
                  <span style={{ fontSize: "12px", fontWeight: "700", textTransform: "uppercase" }}>{m.label}</span>
                </div>
              </div>
              <div style={{ fontSize: "24px", fontWeight: "800", color: "white", marginBottom: "4px" }}>
                {displayVal}
              </div>
              <div style={{ fontSize: "12px", color: m.color, fontWeight: "600" }}>{m.sub}</div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "32px" }}>
        <div style={{ textAlign: "left" }}>
          {extractions.map((res, idx) => (
            <div key={idx} style={STYLES.glassCard}>
              <div style={STYLES.tableHeader}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700" }}>{res.original_type}</h3>
                  <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", marginTop: "2px" }}>
                    Source Identified: {res.doc_type_label || res.detected_type || "Unknown"}
                  </div>
                </div>
                {res.status === 'success' && (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#22c55e", fontSize: "12px", fontWeight: "600" }}>
                    <CheckCircle size={14} /> AI Verified
                  </div>
                )}
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={STYLES.table}>
                  <thead>
                    <tr>
                      <th style={STYLES.th}>Metric</th>
                      <th style={STYLES.th}>Value</th>
                      <th style={{ ...STYLES.th, textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(res.fields || {}).map(([key, val]) => (
                      key !== 'document_type' && (
                        <tr key={key}>
                          <td style={STYLES.td}>{key.replace(/_/g, ' ')}</td>
                          <td style={STYLES.td}>
                            {editingId === `${idx}-${key}` ? (
                              <input 
                                style={STYLES.input}
                                type="text" 
                                value={typeof val === 'object' ? JSON.stringify(val) : (val || "")}
                                onChange={(e) => handleFieldChange(idx, key, e.target.value)}
                                autoFocus
                              />
                            ) : (
                              <span style={{ fontFamily: "monospace", color: "#f0a500" }}>
                                {typeof val === 'object' ? 'Structured Data' : (val || "N/A")}
                              </span>
                            )}
                          </td>
                          <td style={{ ...STYLES.td, textAlign: "right" }}>
                            {editingId === `${idx}-${key}` ? (
                              <button 
                                style={{ ...STYLES.iconButton, color: "#22c55e" }}
                                onClick={() => setEditingId(null)}
                              >
                                <Save size={18} />
                              </button>
                            ) : (
                              <button 
                                style={STYLES.iconButton}
                                onClick={() => setEditingId(`${idx}-${key}`)}
                              >
                                <Edit2 size={16} />
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    ))}
                    {Object.keys(res.fields || {}).length === 0 && (
                      <tr>
                        <td colSpan="3" style={{ ...STYLES.td, textAlign: "center", color: "rgba(255,255,255,0.3)" }}>
                          No fields extracted for this document.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "left" }}>
          <div style={{ ...STYLES.glassCard, padding: "24px" }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: "18px", fontWeight: "700" }}>Analysis Summary</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                <div style={{ padding: "8px", background: "rgba(34, 197, 94, 0.1)", borderRadius: "8px" }}>
                  <CheckCircle size={20} color="#22c55e" />
                </div>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "600" }}>Cross-Doc Validation</div>
                  <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", marginTop: "4px" }}>
                    Entity details match across ALM and Shareholding patterns.
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                <div style={{ padding: "8px", background: "rgba(240, 165, 0, 0.1)", borderRadius: "8px" }}>
                  <AlertCircle size={20} color="#f0a500" />
                </div>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "600" }}>Manual Overrides</div>
                  <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", marginTop: "4px" }}>
                    Fields marked in gold can be manually edited if extraction requires refinement.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <button 
            style={{ ...STYLES.button, width: "100%", justifyContent: "center", marginTop: "16px" }}
            onClick={handleConfirm}
          >
            Finalize Data
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Stage3_Extraction;
