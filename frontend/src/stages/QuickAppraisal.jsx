import React, { useState, useRef } from 'react';
import axios from 'axios';
import { Upload, Brain, BarChart2, Globe, FileDown, CheckCircle, AlertTriangle, Loader2, ArrowLeft, Zap, ChevronDown } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://intelli-credit-7kzw.onrender.com';

const getDecision = s => {
  if (s >= 80) return { label:"APPROVE", color:"#22c55e", grade:"A", rate:"Base + 0.75%" };
  if (s >= 65) return { label:"APPROVE WITH CONDITIONS", color:"#f0a500", grade:"B", rate:"Base + 1.5%" };
  if (s >= 50) return { label:"REFER TO CREDIT COMMITTEE", color:"#f97316", grade:"C", rate:"Base + 2.5%" };
  return { label:"REJECT", color:"#ef4444", grade:"D", rate:"N/A" };
};

const SECTORS = ['NBFC','Manufacturing','Real Estate','Infrastructure','Retail','IT Services','Healthcare','Pharma','Logistics','Other'];

const STEPS = [
  { id:1, icon:<Upload size={16}/>,    label:"Upload Document" },
  { id:2, icon:<Brain size={16}/>,     label:"AI Analysis"     },
  { id:3, icon:<BarChart2 size={16}/>, label:"Credit Score"    },
  { id:4, icon:<Globe size={16}/>,     label:"Web Research"    },
  { id:5, icon:<FileDown size={16}/>,  label:"Download Report" },
];

// VERIDEX theme styles
const T = {
  page: { maxWidth:'780px', margin:'0 auto', padding:'40px 20px', fontFamily:"'Inter',sans-serif", color:'white' },
  card: (active, done) => ({
    background: done ? 'rgba(34,197,94,0.04)' : active ? 'rgba(240,165,0,0.04)' : 'rgba(255,255,255,0.02)',
    border: `1px solid ${done ? 'rgba(34,197,94,0.3)' : active ? 'rgba(240,165,0,0.3)' : 'rgba(255,255,255,0.07)'}`,
    borderRadius:'14px', marginBottom:'10px', overflow:'hidden',
    transition:'all 0.3s ease'
  }),
  cardHead: (active, done) => ({
    padding:'18px 22px', display:'flex', alignItems:'center', gap:'14px',
    background: done ? 'rgba(34,197,94,0.06)' : active ? 'rgba(240,165,0,0.06)' : 'transparent',
    cursor:'default'
  }),
  cardBody: { padding:'0 22px 22px' },
  input: { background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'8px', padding:'11px 14px', color:'white', width:'100%', fontSize:'14px', outline:'none', boxSizing:'border-box', fontFamily:'Inter,sans-serif' },
  label: { fontSize:'11px', color:'rgba(255,255,255,0.5)', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:'6px', display:'block' },
  btn: (color='#f0a500', disabled=false) => ({ background:disabled?'rgba(255,255,255,0.1)':color, color:color==='#f0a500'?'#0a1628':'white', border:'none', borderRadius:'8px', padding:'11px 20px', fontSize:'13px', fontWeight:'800', cursor:disabled?'not-allowed':'pointer', display:'flex', alignItems:'center', gap:'8px', opacity:disabled?0.5:1, transition:'all 0.2s', fontFamily:'Inter,sans-serif' }),
  metricCard: { background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'10px', padding:'14px 16px' },
};

export default function QuickAppraisal({ onBack }) {
  const sessionId = useRef(`qa_${Date.now()}`).current;
  const [activeStep, setActiveStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState(new Set());

  const [file, setFile]                   = useState(null);
  const [uploading, setUploading]         = useState(false);
  const [uploadDone, setUploadDone]       = useState(false);
  const [charsExtracted, setCharsExtracted] = useState(0);

  const [companyName, setCompanyName]     = useState('');
  const [sector, setSector]               = useState('NBFC');
  const [loanAmt, setLoanAmt]             = useState('50');
  const [analyzing, setAnalyzing]         = useState(false);
  const [financials, setFinancials]       = useState(null);

  const [scoring, setScoring]             = useState(false);
  const [scoreResult, setScoreResult]     = useState(null);

  const [researching, setResearching]     = useState(false);
  const [researchResult, setResearchResult] = useState(null);
  const [downloading, setDownloading]     = useState(false);
  const [analyzeStatus, setAnalyzeStatus] = useState('');

  const complete = (step) => {
    setCompletedSteps(prev => new Set([...prev, step]));
    setActiveStep(step + 1);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setAnalyzeStatus('Uploading document...');
    
    const attemptUpload = async () => {
      const form = new FormData();
      form.append('file', file);
      form.append('session_id', sessionId);
      return await axios.post(`${API_URL}/api/quick/upload`, form, { timeout: 180000 });
    };

    try {
      const wakeTimer = setTimeout(() => {
        setAnalyzeStatus('Waking up server... please wait (30-60 seconds)');
      }, 8000);

      let res;
      try {
        res = await attemptUpload();
      } catch (firstErr) {
        setAnalyzeStatus('Retrying... server is starting up');
        await new Promise(r => setTimeout(r, 5000));
        res = await attemptUpload();
      }
      
      clearTimeout(wakeTimer);
      setCharsExtracted(res.data.characters_extracted);
      setUploadDone(true);
      complete(1);
    } catch(e) {
      alert('Upload failed: ' + (e.response?.data?.detail || e.message));
    } finally {
      setUploading(false);
      setAnalyzeStatus('');
    }
  };

  const handleAnalyze = async () => {
    if (!companyName.trim()) return;
    setAnalyzing(true);
    setAnalyzeStatus('Extracting financials...');
    
    const attemptAnalyze = async () => {
      const form = new FormData();
      form.append('company_name', companyName);
      form.append('session_id', sessionId);
      return await axios.post(`${API_URL}/api/quick/analyze`, form, { timeout: 180000 });
    };

    try {
      // Show wake-up message after 8 seconds
      const wakeTimer = setTimeout(() => {
        setAnalyzeStatus('Waking up server... please wait (30-60 seconds)');
      }, 8000);

      let res;
      try {
        res = await attemptAnalyze();
      } catch (firstErr) {
        // Retry once after 5 seconds
        setAnalyzeStatus('Retrying... server is starting up');
        await new Promise(r => setTimeout(r, 5000));
        res = await attemptAnalyze();
      }
      
      clearTimeout(wakeTimer);
      setFinancials(res.data.financials);
      complete(2);
    } catch(e) {
      alert('Analysis failed: ' + (e.response?.data?.detail || e.message));
    } finally {
      setAnalyzing(false);
      setAnalyzeStatus('');
    }
  };

  const handleScore = async () => {
    setScoring(true);
    setAnalyzeStatus('Calculating credit score...');

    const attemptScore = async () => {
      const form = new FormData();
      form.append('session_id', sessionId);
      form.append('loan_amount', loanAmt);
      form.append('sector', sector);
      form.append('tenure', '36');
      form.append('interest_rate', '11.5');
      return await axios.post(`${API_URL}/api/quick/score`, form, { timeout: 180000 });
    };

    try {
      const wakeTimer = setTimeout(() => {
        setAnalyzeStatus('Waking up server... please wait (30-60 seconds)');
      }, 8000);

      let res;
      try {
        res = await attemptScore();
      } catch (firstErr) {
        setAnalyzeStatus('Retrying... server is starting up');
        await new Promise(r => setTimeout(r, 5000));
        res = await attemptScore();
      }

      clearTimeout(wakeTimer);
      setScoreResult(res.data);
      complete(3);
    } catch(e) {
      alert('Scoring failed: ' + (e.response?.data?.detail || e.message));
    } finally {
      setScoring(false);
      setAnalyzeStatus('');
    }
  };

  const handleResearch = async () => {
    setResearching(true);
    try {
      const form = new FormData();
      form.append('session_id', sessionId);
      const res = await axios.post(`${API_URL}/api/quick/research`, form, { timeout: 90000 });
      setResearchResult(res.data);
      complete(4);
    } catch(e) { alert('Research failed: ' + (e.response?.data?.detail || e.message)); }
    finally { setResearching(false); }
  };

  const handleDownload = async () => {
    if (!researchResult?.report_id) return;
    setDownloading(true);
    try {
      const res = await axios.get(`${API_URL}/api/quick/report/${researchResult.report_id}`, { responseType:'blob', timeout: 60000 });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url;
      a.setAttribute('download', `QuickCAM_${companyName.replace(/\s+/g,'_')}.docx`);
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      complete(5);
    } catch(e) { alert('Download failed: ' + (e.message)); }
    finally { setDownloading(false); }
  };

  const dec = scoreResult ? getDecision(scoreResult.score) : null;

  const StepCircle = ({ step }) => {
    const done   = completedSteps.has(step.id);
    const active = step.id === activeStep;
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'5px', flex:1 }}>
        <div style={{
          width:'34px', height:'34px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
          background: done ? '#22c55e' : active ? '#f0a500' : 'rgba(255,255,255,0.05)',
          border: `2px solid ${done ? '#22c55e' : active ? '#f0a500' : 'rgba(255,255,255,0.12)'}`,
          color: done ? 'white' : active ? '#0a1628' : 'rgba(255,255,255,0.3)',
          boxShadow: active ? '0 0 14px rgba(240,165,0,0.4)' : done ? '0 0 8px rgba(34,197,94,0.3)' : 'none',
          transition:'all 0.3s'
        }}>
          {done ? <CheckCircle size={16}/> : step.icon}
        </div>
        <span style={{ fontSize:'10px', fontWeight:'700', letterSpacing:'0.5px', textAlign:'center',
          color: done ? '#22c55e' : active ? '#f0a500' : 'rgba(255,255,255,0.3)' }}>
          {step.label}
        </span>
      </div>
    );
  };

  return (
    <div style={T.page}>
      <style>{`@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:'16px', marginBottom:'32px' }}>
        <button onClick={onBack} style={{ background:'transparent', border:'1px solid rgba(255,255,255,0.15)', color:'rgba(255,255,255,0.5)', borderRadius:'8px', padding:'8px 14px', cursor:'pointer', display:'flex', alignItems:'center', gap:'6px', fontSize:'13px' }}>
          <ArrowLeft size={14}/> Back
        </button>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            <Zap size={22} color="#f0a500"/>
            <h1 style={{ margin:0, fontSize:'24px', fontWeight:'900', color:'white' }}>Quick Appraisal</h1>
          </div>
          <p style={{ margin:'3px 0 0', fontSize:'13px', color:'rgba(255,255,255,0.4)' }}>Upload 1 document · AI extraction · Credit score · Web research · CAM report</p>
        </div>
      </div>

      {/* Progress */}
      <div style={{ display:'flex', alignItems:'flex-start', gap:'4px', marginBottom:'28px', padding:'18px 20px', background:'rgba(255,255,255,0.02)', borderRadius:'12px', border:'1px solid rgba(255,255,255,0.06)' }}>
        {STEPS.map((step, i) => (
          <React.Fragment key={step.id}>
            <StepCircle step={step}/>
            {i < STEPS.length - 1 && (
              <div style={{ height:'2px', flex:1, background: completedSteps.has(step.id) ? '#22c55e' : 'rgba(255,255,255,0.07)', borderRadius:'2px', marginTop:'16px', transition:'background 0.3s' }}/>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* ── STEP 1: UPLOAD ── */}
      <div style={T.card(activeStep===1, completedSteps.has(1))}>
        <div style={T.cardHead(activeStep===1, completedSteps.has(1))}>
          <div style={{ width:'32px', height:'32px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', background: completedSteps.has(1) ? '#22c55e' : activeStep===1 ? '#f0a500' : 'rgba(255,255,255,0.07)', flexShrink:0 }}>
            {completedSteps.has(1) ? <CheckCircle size={16} color="white"/> : <Upload size={16} color={activeStep===1?'#0a1628':'rgba(255,255,255,0.4)'}/>}
          </div>
          <div>
            <div style={{ fontSize:'14px', fontWeight:'700', color: completedSteps.has(1)?'#22c55e':activeStep===1?'white':'rgba(255,255,255,0.4)' }}>Upload Document</div>
            {completedSteps.has(1) && <div style={{ fontSize:'11px', color:'#22c55e', marginTop:'2px' }}>✓ {charsExtracted.toLocaleString()} characters extracted</div>}
          </div>
        </div>
        {/* Always show body for active OR completed */}
        {(activeStep === 1 || completedSteps.has(1)) && (
          <div style={T.cardBody}>
            {uploadDone ? (
              <div style={{ display:'flex', alignItems:'center', gap:'12px', padding:'14px', background:'rgba(34,197,94,0.08)', borderRadius:'10px', border:'1px solid rgba(34,197,94,0.2)' }}>
                <CheckCircle size={20} color="#22c55e"/>
                <div>
                  <div style={{ fontWeight:'700', fontSize:'14px' }}>{file.name}</div>
                  <div style={{ fontSize:'12px', color:'#22c55e', marginTop:'2px' }}>✓ {charsExtracted.toLocaleString()} characters extracted</div>
                </div>
              </div>
            ) : (
              <>
                <div onClick={() => document.getElementById('qa-file').click()} style={{ border:'2px dashed rgba(240,165,0,0.3)', borderRadius:'12px', padding:'28px', textAlign:'center', cursor:'pointer', marginBottom:'14px', background:'rgba(240,165,0,0.02)' }}>
                  <input id="qa-file" type="file" hidden accept=".pdf,.xlsx,.xls,.docx" onChange={e => setFile(e.target.files[0])}/>
                  <Upload size={28} color="#f0a500" style={{ margin:'0 auto 10px' }}/>
                  <div style={{ fontSize:'14px', fontWeight:'600', color:'rgba(255,255,255,0.8)' }}>{file ? `✓ ${file.name}` : 'Click to select PDF, Excel or Word'}</div>
                  <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.3)', marginTop:'6px' }}>Annual Reports, Bank Statements, Audit Reports — up to 20MB</div>
                </div>
                <button onClick={handleUpload} disabled={!file||uploading} style={T.btn('#f0a500', !file||uploading)}>
                  {uploading ? <><Loader2 size={15} style={{animation:'spin 1s linear infinite'}}/> {analyzeStatus || 'Extracting...'}</> : 'Upload & Extract Text'}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── STEP 2: AI ANALYSIS ── */}
      <div style={T.card(activeStep===2, completedSteps.has(2))}>
        <div style={T.cardHead(activeStep===2, completedSteps.has(2))}>
          <div style={{ width:'32px', height:'32px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', background: completedSteps.has(2) ? '#22c55e' : activeStep===2 ? '#f0a500' : 'rgba(255,255,255,0.07)', flexShrink:0 }}>
            {completedSteps.has(2) ? <CheckCircle size={16} color="white"/> : <Brain size={16} color={activeStep===2?'#0a1628':'rgba(255,255,255,0.4)'}/>}
          </div>
          <div>
            <div style={{ fontSize:'14px', fontWeight:'700', color: completedSteps.has(2)?'#22c55e':activeStep===2?'white':'rgba(255,255,255,0.4)' }}>AI Financial Analysis</div>
            {completedSteps.has(2) && <div style={{ fontSize:'11px', color:'#22c55e', marginTop:'2px' }}>✓ Financials extracted for {companyName}</div>}
          </div>
        </div>
        {(activeStep === 2 || completedSteps.has(2)) && (
          <div style={T.cardBody}>
            {financials ? (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px' }}>
                {Object.entries(financials).slice(0,9).map(([k,v]) => (
                  <div key={k} style={T.metricCard}>
                    <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.4)', marginBottom:'4px', textTransform:'uppercase', letterSpacing:'0.5px' }}>{k}</div>
                    <div style={{ fontSize:'16px', fontWeight:'800', color:'#f0a500' }}>{v}</div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div style={{ marginBottom:'14px' }}>
                  <label style={T.label}>Company Name</label>
                  <input style={T.input} placeholder="e.g. Tata Capital Limited" value={companyName} onChange={e => setCompanyName(e.target.value)} onKeyDown={e => e.key==='Enter' && handleAnalyze()}/>
                </div>
                <button onClick={handleAnalyze} disabled={!companyName.trim()||analyzing} style={T.btn('#f0a500', !companyName.trim()||analyzing)}>
                  {analyzing ? <><Loader2 size={15} style={{animation:'spin 1s linear infinite'}}/> {analyzeStatus || 'Extracting financials...'}</> : 'Run AI Analysis'}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── STEP 3: CREDIT SCORE ── */}
      <div style={T.card(activeStep===3, completedSteps.has(3))}>
        <div style={T.cardHead(activeStep===3, completedSteps.has(3))}>
          <div style={{ width:'32px', height:'32px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', background: completedSteps.has(3) ? '#22c55e' : activeStep===3 ? '#f0a500' : 'rgba(255,255,255,0.07)', flexShrink:0 }}>
            {completedSteps.has(3) ? <CheckCircle size={16} color="white"/> : <BarChart2 size={16} color={activeStep===3?'#0a1628':'rgba(255,255,255,0.4)'}/>}
          </div>
          <div>
            <div style={{ fontSize:'14px', fontWeight:'700', color: completedSteps.has(3)?'#22c55e':activeStep===3?'white':'rgba(255,255,255,0.4)' }}>Credit Score</div>
            {completedSteps.has(3) && scoreResult && <div style={{ fontSize:'11px', color:'#22c55e', marginTop:'2px' }}>✓ Score: {scoreResult.score}/100 — {scoreResult.decision}</div>}
          </div>
        </div>
        {(activeStep === 3 || completedSteps.has(3)) && (
          <div style={T.cardBody}>
            {scoreResult ? (() => {
              const d = getDecision(scoreResult.score);
              return (
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:'20px', marginBottom:'16px', flexWrap:'wrap' }}>
                    <div style={{ fontSize:'56px', fontWeight:'900', color:d.color, lineHeight:1 }}>{scoreResult.score}</div>
                    <div>
                      <div style={{ fontSize:'20px', fontWeight:'900', color:d.color }}>{scoreResult.decision}</div>
                      <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.5)', marginTop:'4px' }}>Grade {d.grade} · {d.rate}</div>
                      <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.5)' }}>Limit: ₹{scoreResult.recommended_amount} Cr</div>
                    </div>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                    {(scoreResult.red_flags||[]).slice(0,3).map((f,i) => <div key={i} style={{ padding:'9px 12px', background:'rgba(239,68,68,0.07)', borderRadius:'7px', fontSize:'12px', color:'#ef4444', borderLeft:'3px solid #ef4444' }}>⚠ {f}</div>)}
                    {(scoreResult.green_flags||[]).slice(0,2).map((f,i) => <div key={i} style={{ padding:'9px 12px', background:'rgba(34,197,94,0.07)', borderRadius:'7px', fontSize:'12px', color:'#22c55e', borderLeft:'3px solid #22c55e' }}>✓ {f}</div>)}
                  </div>
                </div>
              );
            })() : (
              <>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px', marginBottom:'14px' }}>
                  <div>
                    <label style={T.label}>Sector</label>
                    <select style={{ ...T.input, background:'#0f2035' }} value={sector} onChange={e => setSector(e.target.value)}>
                      {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={T.label}>Loan Amount (INR Cr)</label>
                    <input style={T.input} type="number" value={loanAmt} onChange={e => setLoanAmt(e.target.value)}/>
                  </div>
                </div>
                <button onClick={handleScore} disabled={scoring} style={T.btn('#f0a500', scoring)}>
                  {scoring ? <><Loader2 size={15} style={{animation:'spin 1s linear infinite'}}/> {analyzeStatus || 'Calculating...'}</> : 'Calculate Credit Score'}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── STEP 4: WEB RESEARCH ── */}
      <div style={T.card(activeStep===4, completedSteps.has(4))}>
        <div style={T.cardHead(activeStep===4, completedSteps.has(4))}>
          <div style={{ width:'32px', height:'32px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', background: completedSteps.has(4) ? '#22c55e' : activeStep===4 ? '#f0a500' : 'rgba(255,255,255,0.07)', flexShrink:0 }}>
            {completedSteps.has(4) ? <CheckCircle size={16} color="white"/> : <Globe size={16} color={activeStep===4?'#0a1628':'rgba(255,255,255,0.4)'}/>}
          </div>
          <div>
            <div style={{ fontSize:'14px', fontWeight:'700', color: completedSteps.has(4)?'#22c55e':activeStep===4?'white':'rgba(255,255,255,0.4)' }}>Web Research</div>
            {completedSteps.has(4) && researchResult && <div style={{ fontSize:'11px', color:'#22c55e', marginTop:'2px' }}>✓ Risk: {researchResult.risk_level} · {researchResult.sources} sources</div>}
          </div>
        </div>
        {(activeStep === 4 || completedSteps.has(4)) && (
          <div style={T.cardBody}>
            {researchResult ? (
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'12px' }}>
                  <span style={{ padding:'5px 14px', borderRadius:'20px', fontSize:'13px', fontWeight:'800',
                    background: researchResult.risk_level==='LOW'?'rgba(34,197,94,0.12)':researchResult.risk_level==='HIGH'||researchResult.risk_level==='CRITICAL'?'rgba(239,68,68,0.12)':'rgba(240,165,0,0.12)',
                    color: researchResult.risk_level==='LOW'?'#22c55e':researchResult.risk_level==='HIGH'||researchResult.risk_level==='CRITICAL'?'#ef4444':'#f0a500',
                    border:'1px solid currentColor' }}>
                    Risk: {researchResult.risk_level}
                  </span>
                  <span style={{ fontSize:'12px', color:'rgba(255,255,255,0.4)' }}>{researchResult.sources} sources analyzed</span>
                </div>
                <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.7)', lineHeight:'1.7', background:'rgba(255,255,255,0.02)', borderRadius:'8px', padding:'14px', whiteSpace:'pre-line' }}>
                  {researchResult.summary?.replace(/^\d+\.\s*/gm,'').replace(/\*\s*/g,'• ')}
                </div>
              </div>
            ) : (
              <>
                <p style={{ fontSize:'13px', color:'rgba(255,255,255,0.4)', marginBottom:'16px', lineHeight:'1.6' }}>
                  Searches news, court records, RBI/SEBI regulatory filings, and promoter background using 4 targeted queries.
                </p>
                <button onClick={handleResearch} disabled={researching} style={T.btn('#f0a500', researching)}>
                  {researching ? <><Loader2 size={15} style={{animation:'spin 1s linear infinite'}}/> Researching...</> : 'Run Web Research'}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── STEP 5: DOWNLOAD ── */}
      <div style={T.card(activeStep===5, completedSteps.has(5))}>
        <div style={T.cardHead(activeStep===5, completedSteps.has(5))}>
          <div style={{ width:'32px', height:'32px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', background: completedSteps.has(5) ? '#22c55e' : activeStep===5 ? '#f0a500' : 'rgba(255,255,255,0.07)', flexShrink:0 }}>
            {completedSteps.has(5) ? <CheckCircle size={16} color="white"/> : <FileDown size={16} color={activeStep===5?'#0a1628':'rgba(255,255,255,0.4)'}/>}
          </div>
          <div>
            <div style={{ fontSize:'14px', fontWeight:'700', color: completedSteps.has(5)?'#22c55e':activeStep===5?'white':'rgba(255,255,255,0.4)' }}>Download CAM Report</div>
          </div>
        </div>
        {(activeStep === 5 || completedSteps.has(5)) && (
          <div style={T.cardBody}>
            <p style={{ fontSize:'13px', color:'rgba(255,255,255,0.4)', marginBottom:'16px', lineHeight:'1.6' }}>
              Generates a professional Credit Appraisal Memo as a Word document with Five Cs analysis, SWOT, financial tables, web intelligence, and credit recommendation.
            </p>
            <button onClick={handleDownload} disabled={downloading || !researchResult?.report_id} style={{ ...T.btn('#f0a500', downloading || !researchResult?.report_id), width:'100%', justifyContent:'center', padding:'14px' }}>
              {downloading ? <><Loader2 size={16} style={{animation:'spin 1s linear infinite'}}/> Building report...</> : <><FileDown size={16}/> Download CAM Report (.docx)</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
