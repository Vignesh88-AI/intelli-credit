import React, { useState, useRef } from 'react';
import axios from 'axios';
import {
  Upload, Brain, BarChart2, Globe, FileDown, CheckCircle,
  AlertTriangle, ChevronDown, Loader2, ArrowLeft, Zap
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://intelli-credit-7kzw.onrender.com';

const getDecision = (score) => {
  if (score >= 80) return { label: "APPROVE",                   color: "#22c55e", grade: "A" };
  if (score >= 65) return { label: "APPROVE WITH CONDITIONS",   color: "#f0a500", grade: "B" };
  if (score >= 50) return { label: "REFER TO CREDIT COMMITTEE", color: "#f97316", grade: "C" };
  return              { label: "REJECT",                        color: "#ef4444", grade: "D" };
};

const SECTORS = ['NBFC','Manufacturing','Real Estate','Infrastructure','Retail','IT Services','Healthcare','Pharma','Logistics','Other'];

// Step definitions
const STEPS = [
  { id: 1, icon: <Upload size={18} />,    label: "Upload Document"  },
  { id: 2, icon: <Brain size={18} />,     label: "AI Analysis"      },
  { id: 3, icon: <BarChart2 size={18} />, label: "Credit Score"     },
  { id: 4, icon: <Globe size={18} />,     label: "Web Research"     },
  { id: 5, icon: <FileDown size={18} />,  label: "Download Report"  },
];

const S = {
  card: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", overflow: "hidden", marginBottom: "12px" },
  cardHeader: { padding: "18px 24px", display: "flex", alignItems: "center", gap: "14px", cursor: "pointer", userSelect: "none" },
  cardBody: { padding: "0 24px 24px" },
  label: { fontSize: "12px", color: "rgba(255,255,255,0.5)", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" },
  input: { background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", padding: "11px 14px", color: "white", width: "100%", fontSize: "14px", outline: "none", boxSizing: "border-box" },
  btn: (color="#f0a500") => ({ background: color, color: color === "#f0a500" ? "#0a1628" : "white", border: "none", borderRadius: "8px", padding: "11px 20px", fontSize: "13px", fontWeight: "800", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", letterSpacing: "0.5px" }),
  metric: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", padding: "14px 16px" },
};

export default function QuickAppraisal({ onBack }) {
  const sessionId = useRef(`qa_${Date.now()}`).current;
  const [activeStep, setActiveStep]   = useState(1);
  const [completedSteps, setCompletedSteps] = useState(new Set());

  // Step 1
  const [file, setFile]               = useState(null);
  const [uploading, setUploading]     = useState(false);
  const [uploadDone, setUploadDone]   = useState(false);
  const [charsExtracted, setCharsExtracted] = useState(0);

  // Step 2
  const [companyName, setCompanyName] = useState('');
  const [analyzing, setAnalyzing]     = useState(false);
  const [financials, setFinancials]   = useState(null);

  // Step 3
  const [sector, setSector]           = useState('NBFC');
  const [loanAmt, setLoanAmt]         = useState('50');
  const [scoring, setScoring]         = useState(false);
  const [scoreResult, setScoreResult] = useState(null);

  // Step 4
  const [researching, setResearching] = useState(false);
  const [researchResult, setResearchResult] = useState(null);

  // Step 5
  const [downloading, setDownloading] = useState(false);

  const complete = (step) => setCompletedSteps(prev => new Set([...prev, step]));

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('session_id', sessionId);
      const res = await axios.post(`${API_URL}/api/quick/upload`, form);
      setCharsExtracted(res.data.characters_extracted);
      setUploadDone(true);
      complete(1);
      setActiveStep(2);
    } catch (e) { alert('Upload failed: ' + (e.response?.data?.detail || e.message)); }
    finally { setUploading(false); }
  };

  const handleAnalyze = async () => {
    if (!companyName.trim()) return;
    setAnalyzing(true);
    try {
      const form = new FormData();
      form.append('company_name', companyName);
      form.append('session_id', sessionId);
      const res = await axios.post(`${API_URL}/api/quick/analyze`, form);
      setFinancials(res.data.financials);
      complete(2);
      setActiveStep(3);
    } catch (e) { alert('Analysis failed: ' + (e.response?.data?.detail || e.message)); }
    finally { setAnalyzing(false); }
  };

  const handleScore = async () => {
    setScoring(true);
    try {
      const form = new FormData();
      form.append('session_id', sessionId);
      form.append('loan_amount', loanAmt);
      form.append('sector', sector);
      form.append('tenure', '36');
      form.append('interest_rate', '11.5');
      const res = await axios.post(`${API_URL}/api/quick/score`, form);
      setScoreResult(res.data);
      complete(3);
      setActiveStep(4);
    } catch (e) { alert('Scoring failed: ' + (e.response?.data?.detail || e.message)); }
    finally { setScoring(false); }
  };

  const handleResearch = async () => {
    setResearching(true);
    try {
      const form = new FormData();
      form.append('session_id', sessionId);
      const res = await axios.post(`${API_URL}/api/quick/research`, form);
      setResearchResult(res.data);
      complete(4);
      setActiveStep(5);
    } catch (e) { alert('Research failed: ' + (e.response?.data?.detail || e.message)); }
    finally { setResearching(false); }
  };

  const handleDownload = async () => {
    if (!researchResult?.report_id) return;
    setDownloading(true);
    try {
      const res = await axios.get(`${API_URL}/api/quick/report/${researchResult.report_id}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url;
      a.setAttribute('download', `QuickCAM_${companyName.replace(/\s+/g,'_')}.docx`);
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      complete(5);
    } catch (e) { alert('Download failed: ' + (e.response?.data?.detail || e.message)); }
    finally { setDownloading(false); }
  };

  const stepStatus = (id) => completedSteps.has(id) ? 'done' : id === activeStep ? 'active' : 'pending';

  const dec = scoreResult ? getDecision(scoreResult.score) : null;

  return (
    <div style={{ maxWidth: "760px", margin: "0 auto", padding: "40px 20px", color: "white", fontFamily: "'Inter',sans-serif" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "36px" }}>
        <button onClick={onBack} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.5)", borderRadius: "8px", padding: "8px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "13px" }}>
          <ArrowLeft size={14} /> Back
        </button>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Zap size={22} color="#3b82f6" />
            <h1 style={{ margin: 0, fontSize: "24px", fontWeight: "900", letterSpacing: "-0.5px" }}>Quick Appraisal</h1>
          </div>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "rgba(255,255,255,0.4)" }}>Upload 1 document · Get instant credit assessment · Download CAM report</p>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ display: "flex", alignItems: "center", gap: "0", marginBottom: "28px", padding: "16px 20px", background: "rgba(255,255,255,0.03)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.06)" }}>
        {STEPS.map((step, i) => {
          const st = stepStatus(step.id);
          return (
            <React.Fragment key={step.id}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", flex: 1 }}>
                <div style={{
                  width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  background: st === 'done' ? "#22c55e" : st === 'active' ? "#3b82f6" : "rgba(255,255,255,0.05)",
                  border: st === 'done' ? "2px solid #22c55e" : st === 'active' ? "2px solid #3b82f6" : "2px solid rgba(255,255,255,0.1)",
                  color: st === 'done' ? "white" : st === 'active' ? "white" : "rgba(255,255,255,0.3)",
                  fontSize: "11px",
                  boxShadow: st === 'active' ? "0 0 12px rgba(59,130,246,0.4)" : "none",
                  transition: "all 0.3s ease"
                }}>
                  {st === 'done' ? <CheckCircle size={14} /> : step.id}
                </div>
                <span style={{ fontSize: "10px", fontWeight: "600", color: st === 'done' ? "#22c55e" : st === 'active' ? "#3b82f6" : "rgba(255,255,255,0.3)", textAlign: "center", letterSpacing: "0.3px" }}>
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ height: "2px", flex: 1, background: completedSteps.has(step.id) ? "#22c55e" : "rgba(255,255,255,0.07)", margin: "0 4px 22px", borderRadius: "2px", transition: "background 0.3s" }} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* ── STEP 1: UPLOAD ── */}
      <StepCard id={1} status={stepStatus(1)} icon={STEPS[0].icon} label="Upload Document" activeStep={activeStep} setActiveStep={setActiveStep} completedSteps={completedSteps}>
        {uploadDone ? (
          <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px", background: "rgba(34,197,94,0.08)", borderRadius: "10px", border: "1px solid rgba(34,197,94,0.2)" }}>
            <CheckCircle size={20} color="#22c55e" />
            <div>
              <div style={{ fontWeight: "700", fontSize: "14px" }}>{file.name}</div>
              <div style={{ fontSize: "12px", color: "#22c55e", marginTop: "2px" }}>✓ {charsExtracted.toLocaleString()} characters extracted</div>
            </div>
          </div>
        ) : (
          <>
            <div
              onClick={() => document.getElementById('qa-file').click()}
              style={{ border: "2px dashed rgba(59,130,246,0.4)", borderRadius: "12px", padding: "32px", textAlign: "center", cursor: "pointer", marginBottom: "16px", background: "rgba(59,130,246,0.03)", transition: "all 0.2s" }}
              onMouseOver={e => e.currentTarget.style.borderColor = "rgba(59,130,246,0.7)"}
              onMouseOut={e => e.currentTarget.style.borderColor = "rgba(59,130,246,0.4)"}
            >
              <input id="qa-file" type="file" hidden accept=".pdf,.xlsx,.xls,.docx" onChange={e => setFile(e.target.files[0])} />
              <Upload size={28} color="#3b82f6" style={{ margin: "0 auto 10px" }} />
              <div style={{ fontSize: "14px", fontWeight: "600" }}>{file ? `✓ ${file.name}` : "Click to select PDF, Excel or Word"}</div>
              <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", marginTop: "6px" }}>Annual Reports, Bank Statements, Audit Reports</div>
            </div>
            <button onClick={handleUpload} disabled={!file || uploading} style={{ ...S.btn("#3b82f6"), opacity: !file ? 0.5 : 1 }}>
              {uploading ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Extracting text...</> : "Upload & Extract"}
            </button>
          </>
        )}
      </StepCard>

      {/* ── STEP 2: AI ANALYSIS ── */}
      <StepCard id={2} status={stepStatus(2)} icon={STEPS[1].icon} label="AI Analysis" activeStep={activeStep} setActiveStep={setActiveStep} completedSteps={completedSteps}>
        {financials ? (
          <>
            <div style={{ fontSize: "12px", color: "#22c55e", marginBottom: "14px", fontWeight: "700" }}>✓ Financials extracted for {companyName}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
              {Object.entries(financials).slice(0,9).map(([k, v]) => (
                <div key={k} style={S.metric}>
                  <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>{k}</div>
                  <div style={{ fontSize: "16px", fontWeight: "800", color: "#3b82f6" }}>{v}</div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div style={{ marginBottom: "14px" }}>
              <div style={S.label}>Company Name</div>
              <input style={S.input} placeholder="e.g. Kinara Capital Private Limited" value={companyName} onChange={e => setCompanyName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAnalyze()} />
            </div>
            <button onClick={handleAnalyze} disabled={!companyName.trim() || analyzing} style={{ ...S.btn("#3b82f6"), opacity: !companyName.trim() ? 0.5 : 1 }}>
              {analyzing ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Extracting financials...</> : "Run AI Analysis"}
            </button>
          </>
        )}
      </StepCard>

      {/* ── STEP 3: CREDIT SCORE ── */}
      <StepCard id={3} status={stepStatus(3)} icon={STEPS[2].icon} label="Credit Score" activeStep={activeStep} setActiveStep={setActiveStep} completedSteps={completedSteps}>
        {scoreResult ? (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "24px", marginBottom: "18px", flexWrap: "wrap" }}>
              <div style={{ fontSize: "56px", fontWeight: "900", color: dec.color, lineHeight: 1 }}>{scoreResult.score}</div>
              <div>
                <div style={{ fontSize: "20px", fontWeight: "900", color: dec.color }}>{scoreResult.decision}</div>
                <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", marginTop: "4px" }}>Grade {dec.grade} · {scoreResult.recommended_rate}</div>
                <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)" }}>Recommended: ₹{scoreResult.recommended_amount} Cr</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {scoreResult.red_flags?.slice(0,3).map((f,i) => (
                <div key={i} style={{ padding: "10px 12px", background: "rgba(239,68,68,0.08)", borderRadius: "8px", fontSize: "12px", color: "#ef4444", borderLeft: "3px solid #ef4444" }}>⚠ {f}</div>
              ))}
              {scoreResult.green_flags?.slice(0,2).map((f,i) => (
                <div key={i} style={{ padding: "10px 12px", background: "rgba(34,197,94,0.08)", borderRadius: "8px", fontSize: "12px", color: "#22c55e", borderLeft: "3px solid #22c55e" }}>✓ {f}</div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "16px" }}>
              <div>
                <div style={S.label}>Sector</div>
                <select style={{ ...S.input, background: "#0f2035" }} value={sector} onChange={e => setSector(e.target.value)}>
                  {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <div style={S.label}>Loan Amount (INR Cr)</div>
                <input style={S.input} type="number" value={loanAmt} onChange={e => setLoanAmt(e.target.value)} />
              </div>
            </div>
            <button onClick={handleScore} disabled={scoring} style={S.btn("#3b82f6")}>
              {scoring ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Calculating...</> : "Calculate Score"}
            </button>
          </>
        )}
      </StepCard>

      {/* ── STEP 4: WEB RESEARCH ── */}
      <StepCard id={4} status={stepStatus(4)} icon={STEPS[3].icon} label="Web Research" activeStep={activeStep} setActiveStep={setActiveStep} completedSteps={completedSteps}>
        {researchResult ? (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
              <span style={{ padding: "5px 14px", borderRadius: "20px", fontSize: "13px", fontWeight: "800", background: researchResult.risk_level === 'LOW' ? "rgba(34,197,94,0.15)" : researchResult.risk_level === 'HIGH' || researchResult.risk_level === 'CRITICAL' ? "rgba(239,68,68,0.15)" : "rgba(240,165,0,0.15)", color: researchResult.risk_level === 'LOW' ? "#22c55e" : researchResult.risk_level === 'HIGH' || researchResult.risk_level === 'CRITICAL' ? "#ef4444" : "#f0a500", border: "1px solid currentColor" }}>
                Risk: {researchResult.risk_level}
              </span>
              <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>{researchResult.sources} sources analyzed</span>
            </div>
            <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)", lineHeight: "1.7", whiteSpace: "pre-line", background: "rgba(255,255,255,0.02)", borderRadius: "8px", padding: "14px" }}>
              {researchResult.summary?.replace(/^\d+\.\s*/gm,'').replace(/\*\s*/g,'• ')}
            </div>
          </div>
        ) : (
          <>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", marginBottom: "16px", lineHeight: "1.6" }}>
              Searches news, court records, RBI/SEBI regulatory filings, and promoter background automatically using 4 targeted queries.
            </p>
            <button onClick={handleResearch} disabled={researching} style={S.btn("#3b82f6")}>
              {researching ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Researching web...</> : "Run Web Research"}
            </button>
          </>
        )}
      </StepCard>

      {/* ── STEP 5: DOWNLOAD ── */}
      <StepCard id={5} status={stepStatus(5)} icon={STEPS[4].icon} label="Download CAM Report" activeStep={activeStep} setActiveStep={setActiveStep} completedSteps={completedSteps}>
        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", marginBottom: "18px", lineHeight: "1.6" }}>
          Generates a complete Credit Appraisal Memo as a Word document — includes Five Cs analysis, SWOT, financial tables, web intelligence, and credit recommendation.
        </p>
        <button
          onClick={handleDownload}
          disabled={downloading || !researchResult?.report_id}
          style={{ ...S.btn("#f0a500"), opacity: !researchResult?.report_id ? 0.5 : 1, width: "100%", justifyContent: "center", padding: "14px" }}
        >
          {downloading ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Building report...</> : <><FileDown size={16} /> Download CAM Report (.docx)</>}
        </button>
      </StepCard>

      <style>{`@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── Accordion step card ──────────────────────────────────
function StepCard({ id, status, icon, label, activeStep, setActiveStep, completedSteps, children }) {
  const isOpen = id === activeStep;
  const isDone = status === 'done';
  const isPending = id > activeStep && !completedSteps.has(id);

  return (
    <div style={{
      ...S.card,
      border: isOpen ? "1px solid rgba(59,130,246,0.4)" : isDone ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(255,255,255,0.06)",
      opacity: isPending ? 0.5 : 1,
      transition: "all 0.3s ease"
    }}>
      <div
        style={{ ...S.cardHeader, background: isOpen ? "rgba(59,130,246,0.06)" : isDone ? "rgba(34,197,94,0.04)" : "transparent" }}
        onClick={() => !isPending && setActiveStep(isOpen ? 0 : id)}
      >
        <div style={{ width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: isDone ? "#22c55e" : isOpen ? "#3b82f6" : "rgba(255,255,255,0.07)", flexShrink: 0 }}>
          {isDone ? <CheckCircle size={16} color="white" /> : <span style={{ color: isOpen ? "white" : "rgba(255,255,255,0.4)" }}>{icon}</span>}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "14px", fontWeight: "700", color: isDone ? "#22c55e" : isOpen ? "white" : "rgba(255,255,255,0.5)" }}>{label}</div>
          {isDone && <div style={{ fontSize: "11px", color: "#22c55e", marginTop: "2px" }}>Completed ✓</div>}
        </div>
        {!isPending && <ChevronDown size={16} color="rgba(255,255,255,0.3)" style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.3s" }} />}
      </div>
      {isOpen && <div style={S.cardBody}>{children}</div>}
    </div>
  );
}
