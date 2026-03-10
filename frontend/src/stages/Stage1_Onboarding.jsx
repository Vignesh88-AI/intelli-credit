import React, { useState, useEffect } from 'react';
import { ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';

const Stage1_Onboarding = ({ formData, setFormData, onNext }) => {
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState({});

  const sectors = ['NBFC', 'Manufacturing', 'Real Estate', 'Infrastructure', 'Retail', 'IT Services', 'Healthcare', 'Other'];
  const loanTypes = ['Term Loan', 'Working Capital', 'CC Limit', 'LC/BG', 'ECB'];

  const validateCIN = (cin) => {
    // L/U + 5 digits + state + year + type + 6 digits
    const cinRegex = /^[LU]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}$/;
    return cinRegex.test(cin);
  };

  const validatePAN = (pan) => {
    // 5 chars + 4 digits + 1 char
    const panRegex = /^[A-Z]{5}\d{4}[A-Z]{1}$/;
    return panRegex.test(pan);
  };

  const handleChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));

    // Real-time validation
    if (field === 'cin' || field === 'pan') {
      const isValid = field === 'cin' ? validateCIN(value) : validatePAN(value);
      setErrors(prev => ({
        ...prev,
        [field]: !isValid && value.length > 0 ? `Invalid ${field.toUpperCase()} format` : null
      }));
    }
  };

  const isStep1Valid = () => {
    const { companyName, cin, pan, sector } = formData.entity;
    return companyName && cin && pan && sector && !errors.cin && !errors.pan;
  };

  const isStep2Valid = () => {
    const { loanType, amount, tenure } = formData.loan;
    return loanType && amount && tenure;
  };

  return (
    <div className="fade-in max-w-3xl mx-auto">
      <div className="glass p-8 mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">
            {step === 1 ? 'Entity Details' : 'Loan Requirements'}
          </h2>
          <span className="text-sm font-medium bg-[#30363d] px-3 py-1 rounded-full text-gray-300">
            Step {step} of 2
          </span>
        </div>

        {step === 1 ? (
          <div className="grid grid-2">
            <div>
              <label>Company Name *</label>
              <input 
                type="text" 
                value={formData.entity.companyName || ''} 
                onChange={(e) => handleChange('entity', 'companyName', e.target.value)}
                placeholder="e.g. Tata Motors Ltd"
              />
            </div>
            <div>
              <label>CIN Number *</label>
              <input 
                type="text" 
                value={formData.entity.cin || ''} 
                onChange={(e) => handleChange('entity', 'cin', e.target.value.toUpperCase())}
                placeholder="L12345MH2000PLC123456"
              />
              {errors.cin && <span className="text-red-500 text-xs mt-1">{errors.cin}</span>}
            </div>
            <div>
              <label>PAN Number *</label>
              <input 
                type="text" 
                value={formData.entity.pan || ''} 
                onChange={(e) => handleChange('entity', 'pan', e.target.value.toUpperCase())}
                placeholder="ABCDE1234F"
              />
              {errors.pan && <span className="text-red-500 text-xs mt-1">{errors.pan}</span>}
            </div>
            <div>
              <label>Sector *</label>
              <select 
                value={formData.entity.sector || ''} 
                onChange={(e) => handleChange('entity', 'sector', e.target.value)}
              >
                <option value="">Select Sector</option>
                {sectors.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label>Sub-sector</label>
              <input 
                type="text" 
                value={formData.entity.subSector || ''} 
                onChange={(e) => handleChange('entity', 'subSector', e.target.value)}
              />
            </div>
            <div>
              <label>Annual Turnover (₹ Crores)</label>
              <input 
                type="number" 
                value={formData.entity.turnover || ''} 
                onChange={(e) => handleChange('entity', 'turnover', e.target.value)}
              />
            </div>
            <div>
              <label>Years in Operation</label>
              <input 
                type="number" 
                value={formData.entity.years || ''} 
                onChange={(e) => handleChange('entity', 'years', e.target.value)}
              />
            </div>
            <div>
              <label>City & State</label>
              <input 
                type="text" 
                value={formData.entity.location || ''} 
                onChange={(e) => handleChange('entity', 'location', e.target.value)}
                placeholder="Mumbai, Maharashtra"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-2">
            <div>
              <label>Loan Type *</label>
              <select 
                value={formData.loan.loanType || ''} 
                onChange={(e) => handleChange('loan', 'loanType', e.target.value)}
              >
                <option value="">Select Type</option>
                {loanTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label>Loan Amount (₹ Crores) *</label>
              <input 
                type="number" 
                value={formData.loan.amount || ''} 
                onChange={(e) => handleChange('loan', 'amount', e.target.value)}
              />
            </div>
            <div>
              <label>Tenure (Months) *</label>
              <input 
                type="number" 
                value={formData.loan.tenure || ''} 
                onChange={(e) => handleChange('loan', 'tenure', e.target.value)}
              />
            </div>
            <div>
              <label>Interest Rate (%)</label>
              <input 
                type="number" 
                step="0.1"
                value={formData.loan.rate || ''} 
                onChange={(e) => handleChange('loan', 'rate', e.target.value)}
              />
            </div>
            <div className="col-span-full">
              <label>Purpose of Loan</label>
              <textarea 
                rows="3"
                value={formData.loan.purpose || ''} 
                onChange={(e) => handleChange('loan', 'purpose', e.target.value)}
              />
            </div>
            <div>
              <label>Existing Banker</label>
              <input 
                type="text" 
                value={formData.loan.banker || ''} 
                onChange={(e) => handleChange('loan', 'banker', e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="flex justify-between mt-8">
          {step === 2 && (
            <button className="btn btn-secondary flex items-center gap-2" onClick={() => setStep(1)}>
              <ArrowLeft size={18} /> Back
            </button>
          )}
          <div className="ml-auto">
            {step === 1 ? (
              <button 
                className="btn btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed" 
                disabled={!isStep1Valid()}
                onClick={() => setStep(2)}
              >
                Next <ArrowRight size={18} />
              </button>
            ) : (
              <button 
                className="btn btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!isStep2Valid()}
                onClick={onNext}
              >
                Proceed to Upload <CheckCircle size={18} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Stage1_Onboarding;
