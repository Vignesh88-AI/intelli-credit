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
    <div className="fade-in max-w-5xl mx-auto w-full px-6 py-4">
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold tracking-tight">
            {step === 1 ? 'Entity Onboarding' : 'Loan Requirements'}
          </h1>
          <span className="text-sm font-medium text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
            Step {step} of 2
          </span>
        </div>
      </div>

      <div className="glass-card rounded-xl p-8 shadow-2xl">
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-2">
            {step === 1 ? 'Company Information' : 'Loan Details'}
          </h2>
          <p className="text-slate-400 text-sm">
            {step === 1 ? 'Please provide the legal registration details of the entity for credit assessment.' : 'Specify the loan amount, tenure and purpose for appraisal.'}
          </p>
        </div>

        <form className="space-y-6">
          {step === 1 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Company Name *</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-3 text-slate-100 focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-slate-600"
                  value={formData.entity.companyName || ''} 
                  onChange={(e) => handleChange('entity', 'companyName', e.target.value)}
                  placeholder="e.g. Tata Motors Ltd"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">CIN Number *</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-3 text-slate-100 focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-slate-600"
                  value={formData.entity.cin || ''} 
                  onChange={(e) => handleChange('entity', 'cin', e.target.value.toUpperCase())}
                  placeholder="L12345MH2000PLC123456"
                />
                {errors.cin && <span className="text-red-500 text-xs mt-1">{errors.cin}</span>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">PAN Number *</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-3 text-slate-100 focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-slate-600"
                  value={formData.entity.pan || ''} 
                  onChange={(e) => handleChange('entity', 'pan', e.target.value.toUpperCase())}
                  placeholder="ABCDE1234F"
                />
                {errors.pan && <span className="text-red-500 text-xs mt-1">{errors.pan}</span>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Sector *</label>
                <select 
                  className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-3 text-slate-100 focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  value={formData.entity.sector || ''} 
                  onChange={(e) => handleChange('entity', 'sector', e.target.value)}
                >
                  <option value="">Select Sector</option>
                  {sectors.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Sub-sector</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-3 text-slate-100 focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-slate-600"
                  value={formData.entity.subSector || ''} 
                  onChange={(e) => handleChange('entity', 'subSector', e.target.value)}
                  placeholder="e.g. Fintech, Pharma"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Annual Turnover (₹ Crores)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">₹</span>
                  <input 
                    type="number" 
                    className="w-full bg-slate-900/50 border border-white/10 rounded-lg pl-8 pr-4 py-3 text-slate-100 focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-slate-600"
                    value={formData.entity.turnover || ''} 
                    onChange={(e) => handleChange('entity', 'turnover', e.target.value)}
                    placeholder="Enter turnover"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Years in Operation</label>
                <input 
                  type="number" 
                  className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-3 text-slate-100 focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-slate-600"
                  value={formData.entity.years || ''} 
                  onChange={(e) => handleChange('entity', 'years', e.target.value)}
                  placeholder="e.g. 5"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">City & State</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-3 text-slate-100 focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-slate-600"
                  value={formData.entity.location || ''} 
                  onChange={(e) => handleChange('entity', 'location', e.target.value)}
                  placeholder="Mumbai, Maharashtra"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Loan Type *</label>
                <select 
                  className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-3 text-slate-100 focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  value={formData.loan.loanType || ''} 
                  onChange={(e) => handleChange('loan', 'loanType', e.target.value)}
                >
                  <option value="">Select Type</option>
                  {loanTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Loan Amount (₹ Crores) *</label>
                <input 
                  type="number" 
                  className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-3 text-slate-100 focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-slate-600"
                  value={formData.loan.amount || ''} 
                  onChange={(e) => handleChange('loan', 'amount', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Tenure (Months) *</label>
                <input 
                  type="number" 
                  className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-3 text-slate-100 focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-slate-600"
                  value={formData.loan.tenure || ''} 
                  onChange={(e) => handleChange('loan', 'tenure', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Interest Rate (%)</label>
                <input 
                  type="number" 
                  step="0.1"
                  className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-3 text-slate-100 focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-slate-600"
                  value={formData.loan.rate || ''} 
                  onChange={(e) => handleChange('loan', 'rate', e.target.value)}
                />
              </div>
              <div className="col-span-full space-y-2">
                <label className="text-sm font-medium text-slate-300">Purpose of Loan</label>
                <textarea 
                  rows="3"
                  className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-3 text-slate-100 focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-slate-600"
                  value={formData.loan.purpose || ''} 
                  onChange={(e) => handleChange('loan', 'purpose', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Existing Banker</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-3 text-slate-100 focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-slate-600"
                  value={formData.loan.banker || ''} 
                  onChange={(e) => handleChange('loan', 'banker', e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="pt-8 flex justify-between items-center border-t border-white/10">
            {step === 2 ? (
              <button 
                type="button"
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors font-semibold" 
                onClick={() => setStep(1)}
              >
                <ArrowLeft size={18} /> Back to Entity
              </button>
            ) : (
              <div /> // Spacer
            )}
            
            <button 
              type="button"
              className="bg-primary hover:bg-primary/90 text-slate-900 font-bold px-10 py-3 rounded-lg flex items-center gap-2 transition-all transform hover:scale-[1.02] active:scale-95 shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed" 
              disabled={step === 1 ? !isStep1Valid() : !isStep2Valid()}
              onClick={step === 1 ? () => setStep(2) : onNext}
            >
              {step === 1 ? 'Next' : 'Proceed to Upload'}
              {step === 1 ? <ArrowRight size={18} /> : <CheckCircle size={18} />}
            </button>
          </div>
        </form>
      </div>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex gap-4 items-start">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <span className="material-symbols-outlined">security</span>
          </div>
          <div>
            <h4 className="text-sm font-semibold">Secure Encryption</h4>
            <p className="text-xs text-slate-500 mt-1">Your data is encrypted with bank-grade 256-bit security protocols.</p>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex gap-4 items-start">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <span className="material-symbols-outlined">speed</span>
          </div>
          <div>
            <h4 className="text-sm font-semibold">Real-time Extraction</h4>
            <p className="text-xs text-slate-500 mt-1">AI-powered data extraction from documents in under 60 seconds.</p>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex gap-4 items-start">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <span className="material-symbols-outlined">analytics</span>
          </div>
          <div>
            <h4 className="text-sm font-semibold">Advanced Scoring</h4>
            <p className="text-xs text-slate-500 mt-1">Multi-dimensional credit scoring engine for precise risk assessment.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Stage1_Onboarding;
