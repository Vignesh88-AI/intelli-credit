import React, { useState } from 'react';
import { ArrowRight, ArrowLeft } from 'lucide-react';

const STYLES = {
  container: { maxWidth: "800px", margin: "0 auto", padding: "40px 20px" },
  card: {
    background: "rgba(255,255,255,0.05)",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "16px",
    padding: "40px",
    boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
  },
  input: {
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: "8px",
    padding: "12px 16px",
    color: "white",
    width: "100%",
    fontSize: "14px",
    marginTop: "8px",
    outline: "none",
  },
  label: { fontSize: "14px", color: "rgba(255,255,255,0.7)", fontWeight: "500" },
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
    transition: "transform 0.2s",
  },
  secondaryButton: {
    background: "transparent",
    color: "white",
    border: "1px solid rgba(255,255,255,0.2)",
    padding: "12px 24px",
    borderRadius: "50px",
    cursor: "pointer",
    fontWeight: "600",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  error: { color: "#ff4d4d", fontSize: "12px", marginTop: "4px" }
};

const Stage1_Onboarding = ({ onNext }) => {
  const [step, setStep] = useState(1);
  const [localData, setLocalData] = useState({
    entity: {},
    loan: {}
  });
  const [errors, setErrors] = useState({});

  const sectors = ['NBFC', 'Manufacturing', 'Real Estate', 'Infrastructure', 'Retail', 'IT Services', 'Healthcare', 'Pharma', 'Logistics', 'Other'];
  const loanTypes = ['Term Loan', 'Working Capital', 'CC Limit', 'LC/BG', 'ECB'];

  const validateCIN = (cin) => /^[LU]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}$/.test(cin);
  const validatePAN = (pan) => /^[A-Z]{5}\d{4}[A-Z]{1}$/.test(pan);

  const handleChange = (section, field, value) => {
    setLocalData(prev => ({
      ...prev,
      [section]: { ...prev[section], [field]: value }
    }));

    if (field === 'cin' || field === 'pan') {
      const isValid = field === 'cin' ? validateCIN(value) : validatePAN(value);
      setErrors(prev => ({
        ...prev,
        [field]: !isValid && value.length > 0 ? `Invalid ${field.toUpperCase()} format` : null
      }));
    }
  };

  const isStep1Valid = () => {
    const { companyName, cin, pan, sector } = localData.entity;
    return companyName && cin && pan && sector && !errors.cin && !errors.pan;
  };

  const isStep2Valid = () => {
    const { loanType, amount, tenure } = localData.loan;
    return loanType && amount && tenure;
  };

  const handleNext = () => {
    if (step === 1) setStep(2);
    else onNext(localData);
  };

  return (
    <div style={STYLES.container}>
      <div style={STYLES.card}>
        <div style={{ marginBottom: "32px", textAlign: "left" }}>
          <h2 style={{ fontSize: "28px", fontWeight: "800", marginBottom: "8px", color: "#f0a500" }}>
            {step === 1 ? "Entity Onboarding" : "Loan Requirements"}
          </h2>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px" }}>
            {step === 1 
              ? "Provide legal registration details for credit assessment." 
              : "Specify loan amount, tenure and purpose for appraisal."}
          </p>
        </div>

        {step === 1 ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
            <div style={{ textAlign: "left" }}>
              <label style={STYLES.label}>Company Name *</label>
              <input 
                style={STYLES.input} 
                placeholder="Legal Entity Name" 
                value={localData.entity.companyName || ""} 
                onChange={(e) => handleChange('entity', 'companyName', e.target.value)}
              />
            </div>
            <div style={{ textAlign: "left" }}>
              <label style={STYLES.label}>CIN Number *</label>
              <input 
                style={{ ...STYLES.input, borderColor: errors.cin ? "#ff4d4d" : STYLES.input.borderColor }} 
                placeholder="21-digit CIN" 
                value={localData.entity.cin || ""} 
                onChange={(e) => handleChange('entity', 'cin', e.target.value.toUpperCase())}
              />
              {errors.cin && <div style={STYLES.error}>{errors.cin}</div>}
            </div>
            <div style={{ textAlign: "left" }}>
              <label style={STYLES.label}>PAN Number *</label>
              <input 
                style={{ ...STYLES.input, borderColor: errors.pan ? "#ff4d4d" : STYLES.input.borderColor }} 
                placeholder="10-digit PAN" 
                value={localData.entity.pan || ""} 
                onChange={(e) => handleChange('entity', 'pan', e.target.value.toUpperCase())}
              />
              {errors.pan && <div style={STYLES.error}>{errors.pan}</div>}
            </div>
            <div style={{ textAlign: "left" }}>
              <label style={STYLES.label}>Sector *</label>
              <select 
                style={{...STYLES.input, background:"#0f2035", color:"white"}} 
                value={localData.entity.sector || ""} 
                onChange={(e) => handleChange('entity', 'sector', e.target.value)}
              >
                <option value="">Select Sector</option>
                {sectors.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ textAlign: "left" }}>
              <label style={STYLES.label}>Sub-sector</label>
              <input 
                style={STYLES.input} 
                placeholder="e.g. Fintech" 
                value={localData.entity.subSector || ""} 
                onChange={(e) => handleChange('entity', 'subSector', e.target.value)}
              />
            </div>
            <div style={{ textAlign: "left" }}>
              <label style={STYLES.label}>Annual Turnover (INR Crores)</label>
              <input 
                style={STYLES.input} 
                type="number" 
                placeholder="Turnover" 
                value={localData.entity.turnover || ""} 
                onChange={(e) => handleChange('entity', 'turnover', e.target.value)}
              />
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
            <div style={{ textAlign: "left" }}>
              <label style={STYLES.label}>Loan Type *</label>
              <select style={{...STYLES.input, background:"#0f2035", color:"white"}} value={localData.loan.loanType || ""} onChange={(e) => handleChange('loan', 'loanType', e.target.value)}>
                <option value="">Select Type</option>
                {loanTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ textAlign: "left" }}>
              <label style={STYLES.label}>Amount (₹ Crores) *</label>
              <input style={STYLES.input} type="number" value={localData.loan.amount || ""} onChange={(e) => handleChange('loan', 'amount', e.target.value)} />
            </div>
            <div style={{ textAlign: "left" }}>
              <label style={STYLES.label}>Tenure (Months) *</label>
              <input style={STYLES.input} type="number" value={localData.loan.tenure || ""} onChange={(e) => handleChange('loan', 'tenure', e.target.value)} />
            </div>
            <div style={{ textAlign: "left" }}>
              <label style={STYLES.label}>Interest Rate (%)</label>
              <input style={STYLES.input} type="number" step="0.1" value={localData.loan.rate || ""} onChange={(e) => handleChange('loan', 'rate', e.target.value)} />
            </div>
            <div style={{ gridColumn: "span 2", textAlign: "left" }}>
              <label style={STYLES.label}>Purpose of Loan</label>
              <textarea style={{ ...STYLES.input, height: "100px", resize: "none" }} value={localData.loan.purpose || ""} onChange={(e) => handleChange('loan', 'purpose', e.target.value)} />
            </div>
          </div>
        )}

        <div style={{ marginTop: "40px", display: "flex", justifyContent: step === 2 ? "space-between" : "flex-end" }}>
          {step === 2 && (
            <button style={STYLES.secondaryButton} onClick={() => setStep(1)}>
              <ArrowLeft size={18} /> Back
            </button>
          )}
          <button 
            style={{ ...STYLES.button, opacity: (step === 1 ? !isStep1Valid() : !isStep2Valid()) ? 0.5 : 1 }} 
            disabled={step === 1 ? !isStep1Valid() : !isStep2Valid()}
            onClick={handleNext}
          >
            {step === 1 ? "Next Step" : "Proceed to Upload"}
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Stage1_Onboarding;
