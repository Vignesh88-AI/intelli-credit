import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// --- HELPERS ---
const Btn = ({ children, onClick, disabled, outline, style }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      width: '100%',
      padding: '14px 20px',
      borderRadius: '8px',
      fontSize: '15px',
      fontWeight: '600',
      cursor: disabled ? 'not-allowed' : 'pointer',
      backgroundColor: outline ? 'transparent' : (disabled ? '#1f2937' : '#2563eb'),
      color: outline ? '#fff' : (disabled ? '#6b7280' : '#fff'),
      border: outline ? '1px solid #374151' : 'none',
      marginTop: '16px',
      transition: 'all 0.2s ease',
      ...style
    }}
  >
    {children}
  </button>
);

const Done = ({ children }) => (
  <div style={{ color: '#16a34a', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: '500' }}>
    <span style={{ fontSize: '18px' }}>✓</span> {children}
  </div>
);

const MetricCard = ({ label, value }) => (
  <div style={{ 
    backgroundColor: '#111827', 
    border: '1px solid #374151', 
    padding: '12px', 
    borderRadius: '8px' 
  }}>
    <div style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '4px' }}>{label}</div>
    <div style={{ 
      fontSize: '17px', 
      fontWeight: '700', 
      color: (value !== null && value !== undefined) ? '#60a5fa' : '#374151' 
    }}>
      {value !== null && value !== undefined ? value : '—'}
    </div>
  </div>
);

// --- MAIN COMPONENT ---
export default function QuickAppraisal({ onBack, initialData }) {
  const [sessionId] = useState(() => crypto.randomUUID());
  const [step, setStep] = useState(0);
  const [results, setResults] = useState({ upload: null, analyze: null, score: null, research: null });
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [error, setError] = useState("");
  const [file, setFile] = useState(initialData?.file || null);
  const [companyName, setCompanyName] = useState(initialData?.companyName || "");
  const [loanAmount, setLoanAmount] = useState(initialData?.loanAmount || "50");
  const [sector, setSector] = useState(initialData?.sector || "NBFC");

  const fileInputRef = useRef(null);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setLoadingMsg("Reading document...");
    setError("");
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('session_id', sessionId);
      const res = await axios.post(`${API_URL}/api/quick/upload`, formData);
      setResults(prev => ({ ...prev, upload: res.data }));
      setStep(1);
    } catch (err) {
      setError("Upload failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!companyName) return;
    setLoading(true);
    setLoadingMsg("AI is analyzing the document...");
    setError("");
    try {
      const formData = new FormData();
      formData.append('company_name', companyName);
      formData.append('session_id', sessionId);
      const res = await axios.post(`${API_URL}/api/quick/analyze`, formData);
      setResults(prev => ({ ...prev, analyze: res.data }));
      setStep(2);
    } catch (err) {
      setError("AI Analysis failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleScore = async () => {
    setLoading(true);
    setLoadingMsg("Calculating credit score...");
    setError("");
    try {
      const formData = new FormData();
      formData.append('session_id', sessionId);
      formData.append('loan_amount', loanAmount);
      formData.append('sector', sector);
      formData.append('tenure', "36");
      formData.append('interest_rate', "11.5");
      const res = await axios.post(`${API_URL}/api/quick/score`, formData);
      setResults(prev => ({ ...prev, score: res.data }));
      setStep(3);
    } catch (err) {
      setError("Scoring failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleResearch = async () => {
    setLoading(true);
    setLoadingMsg("Searching web for company intel...");
    setError("");
    try {
      const formData = new FormData();
      formData.append('session_id', sessionId);
      const res = await axios.post(`${API_URL}/api/quick/research`, formData);
      setResults(prev => ({ ...prev, research: res.data }));
      setStep(4);
    } catch (err) {
      setError("Research agent failed.");
    } finally {
      setLoading(false);
    }
  };

  const resetAll = () => {
    setStep(0);
    setResults({ upload: null, analyze: null, score: null, research: null });
    setLoading(false);
    setLoadingMsg("");
    setError("");
    setFile(null);
    setCompanyName("");
    setLoanAmount("50");
    setSector("NBFC");
  };

  const steps = [
    { id: 0, title: "Upload Document", icon: "📄" },
    { id: 1, title: "AI Analysis", icon: "2" },
    { id: 2, title: "Credit Score", icon: "3" },
    { id: 3, title: "Web Research", icon: "4" },
    { id: 4, title: "Download CAM Report", icon: "5" }
  ];

  return (
    <div style={{
      backgroundColor: '#000',
      minHeight: '100vh',
      color: '#fff',
      fontFamily: 'system-ui, sans-serif',
      padding: '40px 24px'
    }}>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <h1 style={{ 
            fontSize: '32px', 
            fontWeight: '800', 
            margin: 0, 
            background: 'linear-gradient(to right, #60a5fa, #2563eb)', 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent' 
          }}>
            Quick Appraisal
          </h1>
          <button 
            onClick={onBack}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: '#9ca3af', 
              cursor: 'pointer', 
              fontSize: '15px' 
            }}
          >
            ← Back
          </button>
        </div>

        {/* Steps */}
        {steps.map((s) => {
          const isActive = step === s.id;
          const isDone = step > s.id;
          const isLocked = step < s.id;

          return (
            <div 
              key={s.id}
              style={{
                backgroundColor: isActive ? '#0f172a' : '#0a0a0a',
                border: `1px solid ${isActive ? '#2563eb' : (isDone ? '#166534' : '#1f2937')}`,
                padding: '24px',
                borderRadius: '12px',
                marginBottom: '16px',
                opacity: isLocked ? 0.45 : 1,
                transition: 'all 0.3s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: isActive ? '20px' : '0' }}>
                <div style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  backgroundColor: isDone ? '#166534' : (isActive ? '#2563eb' : '#1f2937'),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '16px',
                  fontWeight: '700',
                  fontSize: '14px'
                }}>
                  {isDone ? "✓" : s.icon}
                </div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: isActive ? '#fff' : '#9ca3af' }}>
                  {s.title}
                </h3>
                {isActive && loading && (
                  <div style={{ marginLeft: 'auto', fontSize: '14px', color: '#60a5fa' }}>
                    {loadingMsg}
                  </div>
                )}
              </div>

              {/* Step Content */}
              {isActive && (
                <div style={{ marginTop: '20px' }}>
                  {s.id === 0 && (
                    <>
                      <div 
                        onClick={() => !loading && fileInputRef.current.click()}
                        style={{
                          border: '2px dashed #374151',
                          padding: '28px',
                          textAlign: 'center',
                          cursor: loading ? 'not-allowed' : 'pointer',
                          borderRadius: '8px'
                        }}
                      >
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          hidden 
                          onChange={(e) => setFile(e.target.files[0])} 
                          accept=".pdf,.xlsx,.xls,.docx" 
                        />
                        <div style={{ fontSize: '36px', marginBottom: '8px' }}>📁</div>
                        <div style={{ color: file ? '#fff' : '#9ca3af', fontWeight: '500' }}>
                          {file ? `✓ ${file.name}` : "Click to select a PDF, Excel or DOCX"}
                        </div>
                        <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                          Annual reports, bank statements, financials
                        </div>
                      </div>
                      <Btn onClick={handleUpload} disabled={!file || loading}>Upload Document</Btn>
                    </>
                  )}

                  {s.id === 1 && (
                    <>
                      <input 
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Company name e.g. Kinara Capital Private Limited"
                        style={{
                          width: '100%',
                          padding: '14px',
                          backgroundColor: '#000',
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          color: '#fff',
                          marginBottom: '16px'
                        }}
                      />
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <select 
                          value={sector}
                          onChange={(e) => setSector(e.target.value)}
                          style={{
                            flex: 1,
                            padding: '14px',
                            backgroundColor: '#000',
                            border: '1px solid #374151',
                            borderRadius: '8px',
                            color: '#fff'
                          }}
                        >
                          {["NBFC", "Manufacturing", "IT", "Real Estate", "Healthcare", "Others"].map(sec => (
                            <option key={sec} value={sec}>{sec}</option>
                          ))}
                        </select>
                        <input 
                          type="number"
                          value={loanAmount}
                          onChange={(e) => setLoanAmount(e.target.value)}
                          placeholder="Loan Amount (Cr)"
                          style={{
                            flex: 1,
                            padding: '14px',
                            backgroundColor: '#000',
                            border: '1px solid #374151',
                            borderRadius: '8px',
                            color: '#fff'
                          }}
                        />
                      </div>
                      <Btn onClick={handleAnalyze} disabled={!companyName || loading}>Run AI Analysis</Btn>
                    </>
                  )}

                  {s.id === 2 && (
                    <>
                      <div style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '16px' }}>
                        Loan Amount: ₹{loanAmount} Cr | Sector: {sector}
                      </div>
                      <Btn onClick={handleScore} disabled={loading}>Calculate Credit Score</Btn>
                    </>
                  )}

                  {s.id === 3 && (
                    <>
                      <div style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '16px' }}>
                        Searches news, court records, and regulatory filings automatically.
                      </div>
                      <Btn onClick={handleResearch} disabled={loading}>Run Research Agent</Btn>
                    </>
                  )}

                  {s.id === 4 && (
                    <>
                      <div style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '16px' }}>
                        Your high-fidelity Credit Appraisal Memo is ready.
                      </div>
                      <Btn onClick={() => window.open(`${API_URL}/api/quick/report/${results.research?.report_id}`)}>
                        ⬇ Download CAM Report (.docx)
                      </Btn>
                      <Btn outline onClick={resetAll} style={{ marginTop: '12px' }}>New Appraisal</Btn>
                    </>
                  )}
                  {error && <div style={{ color: '#ef4444', fontSize: '13px', marginTop: '12px' }}>{error}</div>}
                </div>
              )}

              {/* Done Content */}
              {isDone && (
                <div style={{ marginTop: '12px' }}>
                   {s.id === 0 && <Done>{results.upload?.characters_extracted.toLocaleString()} characters extracted</Done>}
                   {s.id === 1 && (
                     <>
                       <Done>Financials extracted successfully</Done>
                       <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '16px' }}>
                         {Object.entries(results.analyze?.financials || {}).map(([label, val]) => (
                           <MetricCard key={label} label={label} value={val} />
                         ))}
                       </div>
                     </>
                   )}
                   {s.id === 2 && (
                     <div style={{ marginTop: '16px' }}>
                        <div style={{ display: 'flex', gap: '32px', marginBottom: '20px' }}>
                          <div>
                            <div style={{ fontSize: '64px', fontWeight: '800', lineHeight: 1 }}>{results.score?.score}</div>
                            <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>/100</div>
                          </div>
                          <div>
                            <div style={{ 
                              fontSize: '26px', 
                              fontWeight: '700',
                              color: results.score?.decision === 'APPROVE' ? '#16a34a' : 
                                     (results.score?.decision === 'REJECT' ? '#dc2626' : '#d97706')
                            }}>
                              {results.score?.decision}
                            </div>
                            <div style={{ fontSize: '15px', color: '#d1d5db', marginTop: '4px' }}>Grade: {results.score?.grade || 'N/A'}</div>
                            <div style={{ fontSize: '15px', color: '#d1d5db' }}>Rate: {results.score?.recommended_rate || '11.5%'}</div>
                            <div style={{ fontSize: '15px', color: '#d1d5db' }}>Limit: ₹{results.score?.recommended_amount} Crore</div>
                          </div>
                        </div>

                        {results.score?.red_flags?.length > 0 && (
                          <div style={{ backgroundColor: '#1c0a0a', border: '1px solid #7f1d1d', padding: '14px', borderRadius: '8px', marginBottom: '12px' }}>
                            <div style={{ color: '#f87171', fontWeight: '700', marginBottom: '8px' }}>⚠ Red Flags</div>
                            {results.score.red_flags.map((f, i) => (
                              <div key={i} style={{ color: '#fca5a5', fontSize: '14px', marginBottom: '4px' }}>• {f}</div>
                            ))}
                          </div>
                        )}

                        {results.score?.green_flags?.length > 0 && (
                          <div style={{ backgroundColor: '#052e16', border: '1px solid #166534', padding: '14px', borderRadius: '8px' }}>
                            <div style={{ color: '#4ade80', fontWeight: '700', marginBottom: '8px' }}>✓ Positive Signals</div>
                            {results.score.green_flags.map((f, i) => (
                              <div key={i} style={{ color: '#86efac', fontSize: '14px', marginBottom: '4px' }}>• {f}</div>
                            ))}
                          </div>
                        )}
                     </div>
                   )}
                   {s.id === 3 && (
                     <div style={{ marginTop: '16px' }}>
                        <div style={{ 
                          display: 'inline-block', 
                          padding: '8px 20px', 
                          border: `1px solid ${
                            results.research?.risk_level === 'LOW' ? '#16a34a' : 
                            (results.research?.risk_level === 'MEDIUM' ? '#d97706' : 
                            (results.research?.risk_level === 'HIGH' ? '#dc2626' : '#991b1b'))
                          }`,
                          color: results.research?.risk_level === 'LOW' ? '#16a34a' : 
                                 (results.research?.risk_level === 'MEDIUM' ? '#d97706' : 
                                 (results.research?.risk_level === 'HIGH' ? '#dc2626' : '#991b1b')),
                          fontWeight: '800', 
                          fontSize: '18px',
                          borderRadius: '4px',
                          marginBottom: '16px'
                        }}>
                          Risk: {results.research?.risk_level}
                        </div>
                        <div style={{ 
                          fontSize: '15px', 
                          color: '#d1d5db', 
                          lineHeight: '1.8', 
                          whiteSpace: 'pre-line' 
                        }}>
                          {results.research?.summary}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '12px' }}>
                          {results.research?.sources} sources analyzed
                        </div>
                     </div>
                   )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
