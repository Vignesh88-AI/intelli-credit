import React, { useState } from 'react';
import { ArrowRight, ArrowLeft, Zap, FileText } from 'lucide-react';

const STYLES = {
  container: { maxWidth: "860px", margin: "0 auto", padding: "40px 20px" },
  card: {
    background: "rgba(255,255,255,0.05)", backdropFilter: "blur(10px)",
    border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px",
    padding: "40px", boxShadow: "0 8px 32px 0 rgba(0,0,0,0.37)",
  },
  input: {
    background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: "8px", padding: "12px 16px", color: "white",
    width: "100%", fontSize: "14px", marginTop: "8px", outline: "none", boxSizing: "border-box"
  },
  label: { fontSize: "13px", color: "rgba(255,255,255,0.6)", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" },
  error: { color: "#ff4d4d", fontSize: "12px", marginTop: "4px" }
};

const Stage1_Onboarding = ({ onNext, onQuick }) => {
  const [step, setStep] = useState(1);
  const [localData, setLocalData] = useState({ entity: {}, loan: { amount: "50", tenure: "36" } });
  const [errors, setErrors] = useState({});

  const sectors = ['NBFC','Manufacturing','Real Estate','Infrastructure','Retail','IT Services','Healthcare','Pharma','Logistics','Other'];
  const loanTypes = ['Term Loan','Working Capital','CC Limit','LC/BG','ECB'];
  const validateCIN = (v) => /^[LU]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}$/.test(v);
  const validatePAN = (v) => /^[A-Z]{5}\d{4}[A-Z]{1}$/.test(v);

  const handleChange = (section, field, value) => {
    setLocalData(prev => ({ ...prev, [section]: { ...prev[section], [field]: value } }));
    if (field === 'cin') setErrors(prev => ({ ...prev, cin: !validateCIN(value) && value.length > 0 ? "Invalid CIN format (e.g. L12345AB1234ABC123456)" : null }));
    if (field === 'pan') setErrors(prev => ({ ...prev, pan: !validatePAN(value) && value.length > 0 ? "Invalid PAN format (e.g. ABCDE1234F)" : null }));
  };

  const isStep1Valid = () => { const { companyName, cin, pan, sector } = localData.entity; return companyName && cin && pan && sector && !errors.cin && !errors.pan; };
  const isStep2Valid = () => { const { loanType, amount, tenure } = localData.loan; return loanType && amount && tenure; };

  return (
    <div style={STYLES.container}>
      <div style={STYLES.card}>
        <div style={{ marginBottom: "32px" }}>
          <h2 style={{ fontSize: "28px", fontWeight: "800", marginBottom: "8px", color: "#f0a500" }}>
            {step === 1 ? "Entity Onboarding" : "Loan Requirements"}
          </h2>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px" }}>
            {step === 1 ? "Provide legal registration details for credit assessment." : "Specify loan details for the underwriting analysis."}
          </p>
        </div>

        {/* MODE SELECTOR */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "32px" }}>
          <div style={{
            padding: "20px 24px", borderRadius: "12px", cursor: "pointer",
            background: "rgba(240,165,0,0.08)", border: "2px solid rgba(240,165,0,0.4)",
            display: "flex", alignItems: "center", gap: "16px"
          }}>
            <FileText size={28} color="#f0a500" />
            <div>
              <div style={{ fontWeight: "800", fontSize: "14px", letterSpacing: "1px" }}>FULL APPRAISAL</div>
              <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginTop: "2px" }}>5 documents · Complete CAM Report</div>
            </div>
          </div>
          <div
            onClick={() => onQuick && onQuick({})}
            style={{
              padding: "20px 24px", borderRadius: "12px", cursor: "pointer",
              background: "rgba(59,130,246,0.08)", border: "2px solid rgba(59,130,246,0.4)",
              display: "flex", alignItems: "center", gap: "16px",
              transition: "all 0.2s ease"
            }}
            onMouseOver={e => e.currentTarget.style.background = "rgba(59,130,246,0.15)"}
            onMouseOut={e => e.currentTarget.style.background = "rgba(59,130,246,0.08)"}
          >
            <Zap size={28} color="#3b82f6" />
            <div>
              <div style={{ fontWeight: "800", fontSize: "14px", letterSpacing: "1px", color: "#3b82f6" }}>QUICK APPRAISAL</div>
              <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginTop: "2px" }}>1 document · Instant results</div>
            </div>
          </div>
        </div>

        {/* FULL APPRAISAL FORM */}
        {step === 1 ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div>
              <label style={STYLES.label}>Company Name *</label>
              <input style={STYLES.input} placeholder="Legal Entity Name" value={localData.entity.companyName || ""} onChange={e => handleChange('entity','companyName',e.target.value)} />
            </div>
            <div>
              <label style={STYLES.label}>CIN Number *</label>
              <input style={{ ...STYLES.input, borderColor: errors.cin ? "#ff4d4d" : "" }} placeholder="L12345AB1234ABC123456" value={localData.entity.cin || ""} onChange={e => handleChange('entity','cin',e.target.value.toUpperCase())} />
              {errors.cin && <div style={STYLES.error}>{errors.cin}</div>}
            </div>
            <div>
              <label style={STYLES.label}>PAN Number *</label>
              <input style={{ ...STYLES.input, borderColor: errors.pan ? "#ff4d4d" : "" }} placeholder="ABCDE1234F" value={localData.entity.pan || ""} onChange={e => handleChange('entity','pan',e.target.value.toUpperCase())} />
              {errors.pan && <div style={STYLES.error}>{errors.pan}</div>}
            </div>
            <div>
              <label style={STYLES.label}>Sector *</label>
              <select style={{ ...STYLES.input, background: "#0f2035" }} value={localData.entity.sector || ""} onChange={e => handleChange('entity','sector',e.target.value)}>
                <option value="">Select Sector</option>
                {sectors.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={STYLES.label}>Annual Turnover (INR Crores)</label>
              <input style={STYLES.input} type="number" placeholder="e.g. 500" value={localData.entity.turnover || ""} onChange={e => handleChange('entity','turnover',e.target.value)} />
            </div>
            <div>
              <label style={STYLES.label}>Sub-sector</label>
              <input style={STYLES.input} placeholder="e.g. Microfinance" value={localData.entity.subSector || ""} onChange={e => handleChange('entity','subSector',e.target.value)} />
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div>
              <label style={STYLES.label}>Loan Type *</label>
              <select style={{ ...STYLES.input, background: "#0f2035" }} value={localData.loan.loanType || ""} onChange={e => handleChange('loan','loanType',e.target.value)}>
                <option value="">Select Type</option>
                {loanTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={STYLES.label}>Amount (INR Crores) *</label>
              <input style={STYLES.input} type="number" value={localData.loan.amount || ""} onChange={e => handleChange('loan','amount',e.target.value)} />
            </div>
            <div>
              <label style={STYLES.label}>Tenure (Months) *</label>
              <input style={STYLES.input} type="number" value={localData.loan.tenure || ""} onChange={e => handleChange('loan','tenure',e.target.value)} />
            </div>
            <div>
              <label style={STYLES.label}>Interest Rate (%)</label>
              <input style={STYLES.input} type="number" step="0.1" value={localData.loan.rate || ""} onChange={e => handleChange('loan','rate',e.target.value)} />
            </div>
            <div style={{ gridColumn: "span 2" }}>
              <label style={STYLES.label}>Purpose of Loan</label>
              <textarea style={{ ...STYLES.input, height: "90px", resize: "none" }} value={localData.loan.purpose || ""} onChange={e => handleChange('loan','purpose',e.target.value)} />
            </div>
          </div>
        )}

        <div style={{ marginTop: "36px", display: "flex", justifyContent: step === 2 ? "space-between" : "flex-end" }}>
          {step === 2 && (
            <button onClick={() => setStep(1)} style={{ background: "transparent", color: "white", border: "1px solid rgba(255,255,255,0.2)", padding: "12px 24px", borderRadius: "50px", cursor: "pointer", fontWeight: "600", display: "flex", alignItems: "center", gap: "8px" }}>
              <ArrowLeft size={18} /> Back
            </button>
          )}
          <button
            disabled={step === 1 ? !isStep1Valid() : !isStep2Valid()}
            onClick={() => step === 1 ? setStep(2) : onNext(localData)}
            style={{ background: "#f0a500", color: "#0a1628", fontWeight: "700", padding: "12px 32px", borderRadius: "50px", border: "none", cursor: "pointer", fontSize: "16px", display: "flex", alignItems: "center", gap: "8px", opacity: (step === 1 ? !isStep1Valid() : !isStep2Valid()) ? 0.5 : 1 }}
          >
            {step === 1 ? "Next Step" : "Proceed to Upload"} <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Stage1_Onboarding;
