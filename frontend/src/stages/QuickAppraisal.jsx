import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Master CSS matching reference project
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Outfit:wght@300;400;600&family=JetBrains+Mono:wght@400;500&display=swap');

  :root {
    --bg: #000;
    --surface: #0a0a0c;
    --surface2: #121214;
    --surface3: #1a1a1c;
    --accent: #2563eb;
    --accent-glow: rgba(37, 99, 235, 0.4);
    --border: #222;
    --border2: #333;
    --text: #ffffff;
    --text2: #a1a1aa;
    --text3: #71717a;
    --green: #34C77B;
    --red: #F05050;
    --gold: #E8A832;
    --font-display: 'Instrument Serif', serif;
    --font-body: 'Outfit', sans-serif;
    --font-mono: 'JetBrains Mono', monospace;
  }

  .qa-container {
    background: var(--bg);
    color: var(--text);
    font-family: var(--font-body);
    min-height: 100vh;
    padding: 40px 20px;
    position: relative;
    overflow-x: hidden;
  }

  .qa-container::before {
    content: "";
    position: fixed;
    inset: 0;
    background-image: 
      radial-gradient(circle at 2px 2px, rgba(255,255,255,0.03) 1px, transparent 0);
    background-size: 40px 40px;
    pointer-events: none;
    z-index: 1;
  }

  .grain {
    position: fixed;
    inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
    opacity: 0.04;
    pointer-events: none;
    z-index: 2;
  }

  .qa-content {
    max-width: 800px;
    margin: 0 auto;
    position: relative;
    z-index: 3;
  }

  .qa-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 40px;
  }

  .qa-title {
    font-family: var(--font-display);
    font-size: 3rem;
    font-style: italic;
    margin: 0;
    background: linear-gradient(to right, #fff, #999);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .btn-back {
    background: none;
    border: 1px solid var(--border);
    color: var(--text3);
    padding: 8px 16px;
    border-radius: 20px;
    cursor: pointer;
    font-family: var(--font-mono);
    font-size: 0.7rem;
    transition: all 0.2s;
  }

  .btn-back:hover {
    border-color: var(--text3);
    color: var(--text);
  }

  .stepper {
    display: flex;
    gap: 8px;
    margin-bottom: 32px;
  }

  .step-pill {
    flex: 1;
    height: 4px;
    background: var(--surface3);
    border-radius: 2px;
    transition: all 0.4s;
  }

  .step-pill.active { background: var(--accent); box-shadow: 0 0 10px var(--accent-glow); }
  .step-pill.done { background: var(--green); }

  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 32px;
    margin-bottom: 24px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .card.active { border-color: var(--border2); background: var(--surface2); }
  .card.locked { opacity: 0.4; pointer-events: none; grayscale: 100%; }

  .section-label {
    font-family: var(--font-mono);
    font-size: 0.65rem;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--text3);
    margin-bottom: 20px;
  }

  .form-group { margin-bottom: 24px; }
  .form-group label { display: block; font-size: 0.82rem; margin-bottom: 8px; color: var(--text2); }
  .form-group input, .form-group select, .form-group textarea {
    width: 100%;
    background: #000;
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 14px;
    color: #fff;
    font-size: 0.95rem;
    transition: border-color 0.2s;
  }
  .form-group input:focus { border-color: var(--accent); outline: none; }

  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .grid-4 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
  @media(min-width: 600px) { .grid-4 { grid-template-columns: repeat(4, 1fr); } }

  .metric-box {
    background: var(--surface3);
    border: 1px solid var(--border);
    padding: 16px;
    border-radius: 12px;
  }
  .metric-label { font-size: 0.65rem; color: var(--text3); text-transform: uppercase; margin-bottom: 6px; font-family: var(--font-mono); }
  .metric-value { font-size: 1.1rem; font-weight: 600; color: var(--accent); }

  .btn-primary {
    background: var(--accent);
    color: #fff;
    border: none;
    padding: 16px 24px;
    border-radius: 12px;
    font-weight: 600;
    font-size: 1rem;
    cursor: pointer;
    width: 100%;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-primary:not(:disabled):hover { transform: translateY(-2px); box-shadow: 0 8px 24px var(--accent-glow); }

  .success-chip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: var(--green);
    background: rgba(52, 199, 123, 0.1);
    padding: 6px 14px;
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: 600;
  }

  .badge {
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 0.7rem;
    font-family: var(--font-mono);
    text-transform: uppercase;
  }
  .badge-approve { background: rgba(52, 199, 123, 0.1); color: var(--green); border: 1px solid rgba(52, 199, 123, 0.2); }
  .badge-reject { background: rgba(240, 80, 80, 0.1); color: var(--red); border: 1px solid rgba(240, 80, 80, 0.2); }
  .badge-review { background: rgba(232, 168, 50, 0.1); color: var(--gold); border: 1px solid rgba(232, 168, 50, 0.2); }

  /* Spinner */
  .spinner {
    width: 20px; height: 20px;
    border: 2px solid rgba(255,255,255,0.1);
    border-top-color: var(--text);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* SWOT Grid */
  .swot-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 20px; }
  .swot-cell { background: var(--surface3); border: 1px solid var(--border); padding: 16px; border-radius: 12px; }
  .swot-title { font-size: 0.65rem; font-family: var(--font-mono); margin-bottom: 8px; text-transform: uppercase; }
  .swot-s { border-left: 3px solid var(--green); }
  .swot-w { border-left: 3px solid var(--red); }
  .swot-o { border-left: 3px solid var(--accent); }
  .swot-t { border-left: 3px solid var(--gold); }
  .swot-list { list-style: none; padding: 0; font-size: 0.75rem; color: var(--text2); }
  .swot-list li { margin-bottom: 4px; padding-left: 12px; position: relative; }
  .swot-list li::before { content: "›"; position: absolute; left: 0; color: var(--text3); }

  /* Dropzone */
  .dropzone {
    border: 2px dashed var(--border2);
    border-radius: 16px;
    padding: 48px;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s;
  }
  .dropzone:hover { border-color: var(--accent); background: rgba(37, 99, 235, 0.02); }
`;

// --- SMALL COMPONENTS ---

const ScoreRing = ({ score, color }) => {
  const r = 38, cx = 50, cy = 50;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div style={{ position: 'relative', width: '120px', height: '120px', margin: '0 auto' }}>
      <svg width="120" height="120" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border2)" strokeWidth="4" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontStyle: 'italic', color }}>{score}</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text3)' }}>/100</div>
      </div>
    </div>
  );
};

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
  
  useEffect(() => {
    if (initialData?.file && step === 0) {
      // Auto-trigger upload when coming from Stage1 with pre-filled data
      setTimeout(() => handleUpload(), 500);
    }
  }, []); // run once on mount

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setLoadingMsg("Uploading & OCR...");
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
    if (!companyName) {
        setError("Company name is required.");
        return;
    }
    setLoading(true);
    setLoadingMsg("AI Extracting Financials...");
    setError("");
    try {
      const formData = new FormData();
      formData.append('company_name', companyName);
      formData.append('session_id', sessionId);
      const res = await axios.post(`${API_URL}/api/quick/analyze`, formData);
      setResults(prev => ({ ...prev, analyze: res.data }));
      setStep(2);
    } catch (err) {
      setError("Analysis failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleScore = async () => {
    setLoading(true);
    setLoadingMsg("Calculating Risk Score...");
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
    setLoadingMsg("Running Web Intelligence...");
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

  const getScoreColor = (s) => s >= 75 ? 'var(--green)' : s >= 60 ? 'var(--gold)' : 'var(--red)';

  return (
    <div className="qa-container">
      <style>{styles}</style>
      <div className="grain"></div>
      
      <div className="qa-content">
        <header className="qa-header">
          <h1 className="qa-title">Quick Appraisal</h1>
          <button className="btn-back" onClick={onBack}>← BACK TO ONBOARDING</button>
        </header>

        <nav className="stepper">
          {[0,1,2,3,4].map(s => (
            <div key={s} className={`step-pill ${step === s ? 'active' : (step > s ? 'done' : '')}`} />
          ))}
        </nav>

        {/* STEP 0: UPLOAD */}
        <div className={`card ${step === 0 ? 'active' : (step > 0 ? '' : 'locked')}`}>
          <div className="section-label">01 // Document Capture</div>
          {step === 0 ? (
            <>
              <div className="dropzone" onClick={() => !loading && fileInputRef.current.click()}>
                <input type="file" ref={fileInputRef} hidden onChange={(e) => setFile(e.target.files[0])} accept=".pdf,.xlsx,.xls,.docx" />
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📄</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '8px' }}>
                  {file ? file.name : "Drop appraisal document here"}
                </div>
                <div style={{ color: 'var(--text3)', fontSize: '0.85rem' }}>
                  Annual Report, Bank Statement or Audit Report (PDF/Excel)
                </div>
              </div>
              <div style={{ marginTop: '24px' }}>
                <button className="btn-primary" onClick={handleUpload} disabled={!file || loading}>
                  {loading ? <div className="spinner" /> : "Initiate AI Onboarding"}
                </button>
              </div>
            </>
          ) : (
            <div className="success-chip">✓ {file?.name} Processed</div>
          )}
        </div>

        {/* STEP 1: ANALYSIS */}
        <div className={`card ${step === 1 ? 'active' : (step > 1 ? '' : 'locked')}`}>
          <div className="section-label">02 // AI Financial Extraction</div>
          {step === 1 ? (
            <>
              <div className="grid-2">
                <div className="form-group">
                  <label>Company Name</label>
                  <input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Legal entity name..." />
                </div>
                <div className="form-group">
                  <label>Sector</label>
                  <select value={sector} onChange={e => setSector(e.target.value)}>
                    {["NBFC", "Manufacturing", "IT", "Real Estate", "Healthcare", "Infrastructure", "Others"].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Proposed Loan Amount (₹ Crore)</label>
                <input type="number" value={loanAmount} onChange={e => setLoanAmount(e.target.value)} />
              </div>
              <button className="btn-primary" onClick={handleAnalyze} disabled={loading}>
                {loading ? <div className="spinner" /> : "Run Deep Analysis"}
              </button>
            </>
          ) : step > 1 && (
            <div className="grid-4">
              {Object.entries(results.analyze?.financials || {}).map(([k, v]) => (
                <div key={k} className="metric-box">
                  <div className="metric-label">{k}</div>
                  <div className="metric-value">{v ?? '—'}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* STEP 2: SCORING */}
        <div className={`card ${step === 2 ? 'active' : (step > 2 ? '' : 'locked')}`}>
          <div className="section-label">03 // Quantum Credit Score</div>
          {step === 2 ? (
            <button className="btn-primary" onClick={handleScore} disabled={loading}>
              {loading ? <div className="spinner" /> : "Calculate Intelligence Score"}
            </button>
          ) : step > 2 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '40px', alignItems: 'center' }}>
              <ScoreRing score={results.score?.score} color={getScoreColor(results.score?.score)} />
              <div>
                <div style={{ marginBottom: '12px' }}>
                  <span className={`badge ${results.score?.decision === 'APPROVE' ? 'badge-approve' : (results.score?.decision === 'REJECT' ? 'badge-reject' : 'badge-review')}`}>
                    {results.score?.decision}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text3)', marginLeft: '12px' }}>GRADE {results.score?.grade}</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text2)', lineHeight: 1.6 }}>
                   Recommended Limit: ₹{results.score?.recommended_amount} Cr @ {results.score?.recommended_rate}% p.a.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* STEP 3: RESEARCH */}
        <div className={`card ${step === 3 ? 'active' : (step > 3 ? '' : 'locked')}`}>
          <div className="section-label">04 // Web Intelligence & SWOT</div>
          {step === 3 ? (
            <button className="btn-primary" onClick={handleResearch} disabled={loading}>
              {loading ? <div className="spinner" /> : "Launch Web Intelligence Agent"}
            </button>
          ) : step > 3 && (
            <>
              <div style={{ marginBottom: '20px' }}>
                <span className={`badge ${results.research?.risk_level === 'LOW' ? 'badge-approve' : (results.research?.risk_level === 'HIGH' ? 'badge-reject' : 'badge-review')}`}>
                  {results.research?.risk_level} RISK DETECTED
                </span>
                <p style={{ fontSize: '0.82rem', color: 'var(--text2)', marginTop: '12px', lineHeight: 1.6 }}>
                  {results.research?.summary}
                </p>
              </div>
              <div className="swot-grid">
                <div className="swot-cell swot-s">
                  <div className="swot-title">Strengths</div>
                  <ul className="swot-list">
                    {(results.score?.positive_signals || results.score?.green_flags || []).map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
                <div className="swot-cell swot-w">
                  <div className="swot-title">Weaknesses</div>
                  <ul className="swot-list">
                    {(results.score?.red_flags || []).map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              </div>
            </>
          )}
        </div>

        {/* STEP 4: REPORT */}
        <div className={`card ${step === 4 ? 'active' : 'locked'}`}>
          <div className="section-label">05 // Intelligence Memo</div>
          <p style={{ color: 'var(--text2)', fontSize: '0.85rem', marginBottom: '24px' }}>
            A high-fidelity Credit Appraisal Memo (CAM) has been synthesized using 360° data triangulation.
          </p>
          <div className="grid-2">
            <button className="btn-primary" onClick={() => window.open(`${API_URL}/api/quick/report/${results.research?.report_id}`)}>
              ⬇ Download CAM (.docx)
            </button>
            <button className="btn-back" style={{ padding: '0 24px', fontSize: '1rem', borderRadius: '12px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={resetAll}>
              NEW APPRAISAL
            </button>
          </div>
        </div>

        {error && <div style={{ color: 'var(--red)', fontSize: '0.8rem', textAlign: 'center', marginTop: '16px' }}>✕ {error}</div>}
      </div>
    </div>
  );
}
