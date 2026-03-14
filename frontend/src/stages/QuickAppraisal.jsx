import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  FileText, Shield, BarChart3, Globe, Download, 
  CheckCircle2, Loader2, ChevronRight, Upload,
  AlertCircle, TrendingUp, RefreshCcw
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://intelli-credit-7kzw.onrender.com';

const STYLES = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#000',
    color: '#fff',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    padding: '40px 20px',
    paddingTop: '80px'
  },
  card: {
    backgroundColor: '#0a0a0a',
    border: '1px solid #1f2937',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '20px',
    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  activeCard: {
    backgroundColor: '#0f172a',
    borderColor: '#2563eb',
    boxShadow: '0 0 20px rgba(37, 99, 235, 0.1)',
  },
  doneCard: {
    borderColor: '#166534',
  },
  lockedCard: {
    opacity: 0.45,
    pointerEvents: 'none',
  },
  badge: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '700',
    marginRight: '16px',
  },
  metricCard: {
    background: '#050505',
    border: '1px solid #1f2937',
    padding: '16px',
    borderRadius: '12px',
  }
};

const Metric = ({ label, value }) => {
  const isNull = !value || value === 'null' || value === '—';
  let color = '#60a5fa'; // Blue default
  if (isNull) color = '#374151';
  else if (String(value).includes('%')) {
    const num = parseFloat(value);
    if (label.includes('GNPA')) color = num > 5 ? '#ef4444' : '#22c55e';
    if (label.includes('Collection')) color = num < 95 ? '#f59e0b' : '#22c55e';
    if (label.includes('CAR')) color = num < 15 ? '#ef4444' : '#22c55e';
  }

  return (
    <div style={STYLES.metricCard}>
      <div style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
        {label}
      </div>
      <div style={{ fontSize: '18px', fontWeight: '700', color: isNull ? '#374151' : color }}>
        {isNull ? '—' : value}
      </div>
    </div>
  );
};

const StepHeader = ({ step, currentStep, title }) => {
  const isDone = currentStep > step;
  const isActive = currentStep === step;

  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: isActive ? '20px' : '0' }}>
      <div style={{
        ...STYLES.badge,
        backgroundColor: isDone ? '#166534' : isActive ? '#2563eb' : '#1f2937',
        color: '#fff'
      }}>
        {isDone ? <CheckCircle2 size={18} /> : step + 1}
      </div>
      <h3 style={{ 
        fontSize: '18px', 
        fontWeight: '600', 
        color: isActive ? '#fff' : isDone ? '#4ade80' : '#9ca3af',
        margin: 0
      }}>
        {title}
      </h3>
      {isActive && <Loader2 className="animate-spin" size={18} style={{ marginLeft: '12px', color: '#2563eb' }} />}
    </div>
  );
};

export default function QuickAppraisal({ onBack }) {
  const [state, setState] = useState({
    step: 0,
    result: null,
    file: null,
    form: { company_name: '', sector: 'NBFC', loan_amount: '50' },
    loading: false,
    loadingMsg: ""
  });

  const fileInputRef = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (file) setState(prev => ({ ...prev, file }));
  };

  const startAppraisal = async () => {
    if (!state.file || !state.form.company_name) return;
    
    setState(prev => ({ ...prev, loading: true, loadingMsg: "AI Extracting Finance..." }));
    
    try {
      const formData = new FormData();
      formData.append('file', state.file);
      formData.append('company_name', state.form.company_name);
      formData.append('sector', state.form.sector);
      formData.append('loan_amount', state.form.loan_amount);

      const res = await axios.post(`${API_URL}/api/quick-appraisal`, formData);
      const result = res.data;

      // START SEQUENTIAL ANIMATION
      setState(prev => ({ ...prev, result, step: 1 }));
      
      setTimeout(() => setState(prev => ({ ...prev, step: 2 })), 1000);
      setTimeout(() => setState(prev => ({ ...prev, step: 3 })), 2000);
      setTimeout(() => setState(prev => ({ ...prev, step: 4 })), 3000);

    } catch (err) {
      console.error(err);
      alert("Analysis failed. Please try a different document.");
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const getStepStyle = (s) => {
    if (state.step === s) return { ...STYLES.card, ...STYLES.activeCard };
    if (state.step > s) return { ...STYLES.card, ...STYLES.doneCard };
    return { ...STYLES.card, ...STYLES.lockedCard };
  };

  const downloadReport = () => {
    const link = document.createElement('a');
    link.href = `${API_URL}/api/quick-report/${state.result.report_id}`;
    link.setAttribute('download', `Veridex_CAM_${state.form.company_name}.docx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={STYLES.container}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '32px' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', padding: '8px', marginRight: '16px' }}>
            <ChevronRight style={{ transform: 'rotate(180deg)' }} />
          </button>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '800', margin: 0 }}>Quick Cognitive Appraisal</h1>
            <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>Step-by-step document intelligence pass</p>
          </div>
        </div>

        {/* STEP 1: UPLOAD */}
        <div style={getStepStyle(0)}>
          <StepHeader step={0} currentStep={state.step} title="Upload Document" />
          {state.step === 0 && (
            <div style={{ marginTop: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px', display: 'block' }}>COMPANY NAME</label>
                  <input 
                    value={state.form.company_name}
                    onChange={e => setState(prev => ({ ...prev, form: { ...prev.form, company_name: e.target.value }}))}
                    style={{ width: '100%', background: '#000', border: '1px solid #374151', borderRadius: '8px', padding: '12px', color: '#fff' }}
                    placeholder="e.g. Tata Motors"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px', display: 'block' }}>REQUESTED LOAN (CR)</label>
                  <input 
                    type="number"
                    value={state.form.loan_amount}
                    onChange={e => setState(prev => ({ ...prev, form: { ...prev.form, loan_amount: e.target.value }}))}
                    style={{ width: '100%', background: '#000', border: '1px solid #374151', borderRadius: '8px', padding: '12px', color: '#fff' }}
                  />
                </div>
              </div>
              
              <div 
                onClick={() => fileInputRef.current.click()}
                style={{
                  border: '2px dashed #374151', borderRadius: '12px', padding: '40px',
                  textAlign: 'center', cursor: 'pointer', background: state.file ? 'rgba(37,99,235,0.05)' : 'transparent',
                  transition: 'all 0.2s'
                }}
              >
                <input type="file" ref={fileInputRef} hidden onChange={handleFile} accept=".pdf,.doc,.docx,.xlsx,.xls" />
                {state.file ? (
                  <div>
                    <FileText size={40} style={{ color: '#2563eb', marginBottom: '12px' }} />
                    <div style={{ fontSize: '16px', fontWeight: '600' }}>{state.file.name}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>{(state.file.size / 1024 / 1024).toFixed(2)} MB</div>
                  </div>
                ) : (
                  <div>
                    <Upload size={40} style={{ color: '#374151', marginBottom: '12px' }} />
                    <div style={{ fontSize: '16px', fontWeight: '600', color: '#9ca3af' }}>Click to select PDF or Financial Doc</div>
                    <div style={{ fontSize: '12px', color: '#4b5563' }}>Supports PDF, Excel, Word</div>
                  </div>
                )}
              </div>

              <button 
                onClick={startAppraisal}
                disabled={!state.file || !state.form.company_name || state.loading}
                style={{
                  width: '100%', marginTop: '20px', padding: '16px',
                  background: (state.file && state.form.company_name) ? '#2563eb' : '#1e2937',
                  color: (state.file && state.form.company_name) ? '#fff' : '#6b7280',
                  border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer'
                }}
              >
                {state.loading ? 'Processing Document...' : 'Run Quick Appraisal'}
              </button>
            </div>
          )}
          {state.step > 0 && (
            <div style={{ marginTop: '12px', color: '#22c55e', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
               <CheckCircle2 size={16} /> Document successfully analyzed ({state.result?.upload?.characters_extracted} chars)
            </div>
          )}
        </div>

        {/* STEP 2: FINANCIALS */}
        <div style={getStepStyle(1)}>
          <StepHeader step={1} currentStep={state.step} title="AI Financials Extracted" />
          {state.step >= 1 && state.result && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '10px',
              margin: '20px 0'
            }}>
              {[
                { label: 'REVENUE', value: state.result.extracted?.annual_report?.revenue, unit: ' Cr' },
                { label: 'NET PROFIT (PAT)', value: state.result.extracted?.annual_report?.pat, unit: ' Cr' },
                { label: 'EBITDA', value: state.result.extracted?.annual_report?.ebitda, unit: ' Cr' },
                { label: 'TOTAL DEBT', value: state.result.extracted?.annual_report?.total_debt || state.result.extracted?.borrowing_profile?.total_debt, unit: ' Cr' },
                { label: 'NET WORTH', value: state.result.extracted?.annual_report?.net_worth, unit: ' Cr' },
                { label: 'TOTAL ASSETS', value: state.result.extracted?.annual_report?.total_assets || state.result.extracted?.alm_statement?.total_assets, unit: ' Cr' },
                { label: 'GNPA %', value: state.result.extracted?.annual_report?.gnpa_percent || state.result.extracted?.portfolio_cuts?.gnpa_percent, unit: '%' },
                { label: 'CAR %', value: state.result.extracted?.annual_report?.car_percent, unit: '%' },
                { label: 'CREDIT RATING', value: state.result.extracted?.borrowing_profile?.credit_rating_long_term, unit: '' },
                { label: 'RATING OUTLOOK', value: state.result.extracted?.borrowing_profile?.rating_outlook, unit: '' },
                { label: 'COLLECTION EFF.', value: state.result.extracted?.portfolio_cuts?.collection_efficiency, unit: '%' },
                { label: 'PROMOTER HOLD.', value: state.result.extracted?.shareholding_pattern?.promoter_holding, unit: '%' },
              ].map((m, i) => {
                const hasValue = m.value && m.value !== 'null' && m.value !== null
                return (
                  <div key={i} style={{
                    background: '#111827',
                    border: '1px solid #1f2937',
                    borderRadius: '8px',
                    padding: '12px'
                  }}>
                    <div style={{fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px'}}>
                      {m.label}
                    </div>
                    <div style={{fontSize: '16px', fontWeight: '700', color: hasValue ? '#60a5fa' : '#374151'}}>
                      {hasValue ? `${m.value}${m.unit}` : '—'}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* STEP 3: CREDIT SCORE */}
        <div style={getStepStyle(2)}>
          <StepHeader step={2} currentStep={state.step} title="Credit Score & Verdict" />
          {state.step >= 2 && state.result?.scoring && (
            <div style={{ marginTop: '20px' }}>
              <div style={{ 
                display: 'flex', gap: '40px', background: '#050505', padding: '24px', 
                borderRadius: '16px', border: '1px solid #1f2937', alignItems: 'center' 
              }}>
                {/* SVG SCORE RING */}
                <div style={{
                  position: 'relative',
                  width: '120px',
                  height: '120px',
                  flexShrink: 0
                }}>
                  <svg width="120" height="120" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="50" fill="none" stroke="#1e293b" strokeWidth="10"/>
                    <circle cx="60" cy="60" r="50" fill="none"
                      stroke={state.result.scoring?.score >= 70 ? '#22c55e' : state.result.scoring?.score >= 45 ? '#f0a500' : '#ef4444'}
                      strokeWidth="10"
                      strokeDasharray={`${2 * Math.PI * 50}`}
                      strokeDashoffset={`${2 * Math.PI * 50 * (1 - (state.result.scoring?.score || 0) / 95)}`}
                      strokeLinecap="round"
                      transform="rotate(-90 60 60)"
                      style={{transition: 'stroke-dashoffset 1.5s ease'}}
                    />
                  </svg>
                  <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center'
                  }}>
                    <span style={{fontSize: '28px', fontWeight: '900', color: 'white', lineHeight: 1}}>
                      {state.result.scoring?.score || 0}
                    </span>
                    <span style={{fontSize: '11px', color: '#64748b'}}>/95</span>
                  </div>
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: `2px solid ${
                      state.result.scoring?.decision === 'APPROVE' ? '#22c55e' :
                      state.result.scoring?.decision?.includes('CONDITION') ? '#f0a500' :
                      state.result.scoring?.decision?.includes('ENHANCED') ? '#f97316' : '#ef4444'
                    }`,
                    color: state.result.scoring?.decision === 'APPROVE' ? '#22c55e' :
                      state.result.scoring?.decision?.includes('CONDITION') ? '#f0a500' :
                      state.result.scoring?.decision?.includes('ENHANCED') ? '#f97316' : '#ef4444',
                    fontWeight: '800',
                    fontSize: '13px',
                    textAlign: 'center',
                    maxWidth: '200px',
                    marginBottom: '16px'
                  }}>
                    {state.result.scoring?.decision || 'CALCULATING...'}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: '#6b7280' }}>GRADE</div>
                      <div style={{ fontSize: '20px', fontWeight: '700' }}>{state.result.scoring?.grade}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#6b7280' }}>RATE</div>
                      <div style={{ fontSize: '20px', fontWeight: '700' }}>{state.result.scoring?.interest_rate}</div>
                    </div>
                  </div>
                  <div style={{ marginTop: '12px' }}>
                    <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>RECOMMENDED LIMIT</div>
                    <div style={{ 
                      fontSize: '20px', fontWeight: '700', 
                      color: state.result.scoring?.recommended_amount > 0 ? '#60a5fa' : '#ef4444'
                    }}>
                      {state.result.scoring?.recommended_amount > 0 
                        ? `INR ${state.result.scoring.recommended_amount} Cr`
                        : 'REJECTED'}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
                <div style={{ background: '#1c0a0a', border: '1px solid #7f1d1d', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ fontSize: '12px', color: '#f87171', fontWeight: '800', marginBottom: '8px' }}>CRITICAL RISK ALERTS</div>
                  {state.result.scoring?.red_flags?.length > 0
                    ? state.result.scoring.red_flags.map((f, i) => (
                      <div key={i} style={{ fontSize: '13px', color: '#fca5a5', marginBottom: '4px' }}>⚠ {f}</div>
                    ))
                    : <p style={{color: '#6b7280', fontSize: '13px', fontStyle: 'italic', margin: 0 }}>No critical alerts identified</p>
                  }
                </div>
                <div style={{ background: '#052e16', border: '1px solid #166534', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ fontSize: '12px', color: '#4ade80', fontWeight: '800', marginBottom: '8px' }}>POSITIVE INDICATORS</div>
                  {state.result.scoring?.green_flags?.length > 0
                    ? state.result.scoring.green_flags.map((f, i) => (
                      <div key={i} style={{ fontSize: '13px', color: '#86efac', marginBottom: '4px' }}>✓ {f}</div>
                    ))
                    : <p style={{color: '#6b7280', fontSize: '13px', fontStyle: 'italic', margin: 0 }}>Awaiting analysis</p>
                  }
                </div>
              </div>

              {/* SWOT GRID */}
              {state.result.scoring?.swot && Object.values(state.result.scoring.swot).some(arr => arr?.length > 0) && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  margin: '20px 0'
                }}>
                  {[
                    {key: 'strengths', color: '#22c55e', bg: 'rgba(34,197,94,0.05)', border: 'rgba(34,197,94,0.2)'},
                    {key: 'weaknesses', color: '#ef4444', bg: 'rgba(239,68,68,0.05)', border: 'rgba(239,68,68,0.2)'},
                    {key: 'opportunities', color: '#3b82f6', bg: 'rgba(59,130,246,0.05)', border: 'rgba(59,130,246,0.2)'},
                    {key: 'threats', color: '#f97316', bg: 'rgba(249,115,22,0.05)', border: 'rgba(249,115,22,0.2)'},
                  ].map(({key, color, bg, border}) => (
                    <div key={key} style={{padding: '16px', borderRadius: '10px', background: bg, border: `1px solid ${border}`}}>
                      <div style={{fontSize: '11px', fontWeight: '800', color, letterSpacing: '1px', marginBottom: '10px'}}>
                        {key.toUpperCase()}
                      </div>
                      {(state.result.scoring?.swot?.[key] || []).map((item, i) => (
                        <div key={i} style={{fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginBottom: '6px', lineHeight: '1.5'}}>
                          • {item}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {/* REASONING ENGINE */}
              <div style={{ marginTop: '24px', background: '#050505', border: '1px solid #1f2937', borderRadius: '12px', padding: '16px' }}>
                <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '800', marginBottom: '12px' }}>⚙ REASONING ENGINE</div>
                <p style={{fontSize: '14px', lineHeight: '1.7', color: 'rgba(255,255,255,0.8)', margin: 0}}>
                  {state.result.scoring?.reasoning || `${state.form.company_name} scored ${state.result.scoring?.score || 0}/95. Decision: ${state.result.scoring?.decision || 'N/A'}.`}
                </p>
              </div>

              <div style={{ marginTop: '24px' }}>
                <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '800', marginBottom: '12px' }}>5Cs BREAKDOWN</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  {Object.entries(state.result.scoring.five_cs).map(([key, val]) => (
                    <div key={key}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', textTransform: 'capitalize' }}>{key}</span>
                        <span style={{ fontSize: '12px', color: '#6b7280' }}>{val}/20</span>
                      </div>
                      <div style={{ height: '4px', background: '#1f2937', borderRadius: '2px' }}>
                        <div style={{ height: '100%', width: `${(val/20)*100}%`, background: '#2563eb', borderRadius: '2px' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* STEP 4: WEB RESEARCH */}
        <div style={getStepStyle(3)}>
          <StepHeader step={3} currentStep={state.step} title="Web Intelligence" />
          {state.step >= 3 && state.result?.research && (
            <div style={{ marginTop: '20px' }}>
              <div style={{ 
                display: 'inline-block', padding: '4px 12px', borderRadius: '8px',
                border: `1px solid ${state.result.research.risk_level === 'LOW' ? '#166534' : '#b91c1c'}`,
                color: state.result.research.risk_level === 'LOW' ? '#4ade80' : '#f87171',
                fontSize: '11px', fontWeight: '800', marginBottom: '16px'
              }}>
                {state.result.research.risk_level} RISK
              </div>
              <p style={{ color: '#9ca3af', lineHeight: '1.6', fontSize: '14px', marginBottom: '20px' }}>
                {state.result.research.summary}
              </p>
              
              {/* FINDINGS LIST */}
              {state.result.findings?.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '800', color: '#6b7280', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Globe size={14} /> WEB SOURCES ({state.result.findings.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {state.result.findings.slice(0, 4).map((f, i) => (
                      <div key={i} style={{
                        background: '#111827',
                        border: '1px solid #1f2937',
                        borderRadius: '8px',
                        padding: '14px'
                      }}>
                        <div style={{fontSize: '13px', fontWeight: '700', color: '#60a5fa', marginBottom: '6px'}}>
                          {f.title || 'Web Source'}
                        </div>
                        <div style={{fontSize: '12px', color: '#9ca3af', lineHeight: '1.6'}}>
                          {f.snippet || f.content || 'No preview available'}
                        </div>
                        <div style={{fontSize: '11px', color: '#374151', marginTop: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                          {f.url}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ marginTop: '12px', color: '#4b5563', fontSize: '12px' }}>
                {state.result.research.sources} real-time web sources analyzed for {state.result.company_name}
              </div>
            </div>
          )}
        </div>

        {/* STEP 5: DOWNLOAD */}
        <div style={getStepStyle(4)}>
          <StepHeader step={4} currentStep={state.step} title="Download CAM" />
          {state.step >= 4 && (
            <div style={{ marginTop: '20px' }}>
               <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '20px' }}>
                 Your high-fidelity Credit Appraisal Memo is ready for internal committee review.
               </p>
               <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  onClick={downloadReport}
                  style={{
                    flex: 1, padding: '16px', background: '#22c55e', color: '#fff',
                    border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                  }}
                >
                  <Download size={20} /> Download CAM Report (.docx)
                </button>
                <button 
                  onClick={() => setState({ 
                    step: 0, result: null, file: null, loading: false, loadingMsg: "",
                    form: { company_name: '', sector: 'NBFC', loan_amount: '50' } 
                  })}
                  style={{
                    padding: '16px', background: '#1f2937', color: '#9ca3af',
                    border: 'none', borderRadius: '12px', cursor: 'pointer'
                  }}
                >
                  <RefreshCcw size={20} />
                </button>
               </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
