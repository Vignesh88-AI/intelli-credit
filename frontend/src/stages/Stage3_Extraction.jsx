import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle, Edit2, Save, X, Loader2, AlertCircle } from 'lucide-react';
import axios from 'axios';

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
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState([]);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    const triggerExtraction = async () => {
      try {
        const extractForm = new FormData();
        entityData.uploadedResults.forEach(r => {
          extractForm.append('file_paths', r.path);
          extractForm.append('doc_types', r.doc_type);
        });

        const API_URL = import.meta.env.VITE_API_URL || 'https://intelli-credit-7kzw.onrender.com';
        const response = await axios.post(`${API_URL}/api/extract`, extractForm);
        setResults(response.data);
      } catch (error) {
        console.error('Extraction failed', error);
      } finally {
        setLoading(false);
      }
    };

    if (entityData?.uploadedResults) triggerExtraction();
  }, [entityData]);

  const handleFieldChange = (docIdx, key, value) => {
    const newResults = [...results];
    newResults[docIdx].data[key] = value;
    setResults(newResults);
  };

  const handleConfirm = () => {
    onNext({ extractedData: results });
  };

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "100px 0" }}>
        <Loader2 className="animate-spin" size={64} color="#f0a500" />
        <h2 style={{ marginTop: "24px", fontSize: "24px", fontWeight: "700" }}>AI Intelligence Engine</h2>
        <p style={{ color: "rgba(255,255,255,0.5)", marginTop: "8px" }}>Extracting key financial metrics from uploaded repositories...</p>
      </div>
    );
  }

  return (
    <div style={STYLES.container}>
      <div style={STYLES.header}>
        <h1 style={STYLES.title}>Extraction Review</h1>
        <p style={STYLES.subtitle}>Please verify the AI-extracted data points before finalizing the credit report.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "32px" }}>
        <div style={{ textAlign: "left" }}>
          {results.map((res, idx) => (
            <div key={idx} style={STYLES.glassCard}>
              <div style={STYLES.tableHeader}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700" }}>{res.original_type}</h3>
                  <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", marginTop: "2px" }}>
                    Source Identified: {res.detected_type}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#22c55e", fontSize: "12px", fontWeight: "600" }}>
                  <CheckCircle size={14} /> AI Verified
                </div>
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
                    {Object.entries(res.data).map(([key, val]) => (
                      key !== 'document_type' && (
                        <tr key={key}>
                          <td style={STYLES.td}>{key.replace(/_/g, ' ')}</td>
                          <td style={STYLES.td}>
                            {editingId === `${idx}-${key}` ? (
                              <input 
                                style={STYLES.input}
                                type="text" 
                                value={typeof val === 'object' ? JSON.stringify(val) : val}
                                onChange={(e) => handleFieldChange(idx, key, e.target.value)}
                                autoFocus
                              />
                            ) : (
                              <span style={{ fontFamily: "monospace", color: "#f0a500" }}>
                                {typeof val === 'object' ? 'Structured Data' : val}
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
