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
    <div className="relative flex flex-col w-full min-h-screen overflow-x-hidden pt-4">
      <style>{`
        .glass-card {
            background: rgba(255, 255, 255, 0.03);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
      `}</style>
      
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-6 fade-in">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold tracking-tight text-white">
              {step === 1 ? 'Entity Onboarding' : 'Loan Requirements'}
            </h1>
            <span className="text-sm font-medium text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
              {step === 1 ? 'Step 1 of 2' : 'Step 2 of 2'}
            </span>
          </div>
          
          <div className="relative flex items-center justify-between w-full mb-8">
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-700 -z-10 transform -translate-y-1/2"></div>
            <div className={`absolute top-1/2 left-0 ${step === 1 ? 'w-1/4' : 'w-1/2'} h-0.5 bg-primary -z-10 transform -translate-y-1/2 transition-all duration-500`}></div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-slate-900 font-bold">1</div>
              <span className="text-xs font-semibold text-primary">Entity</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className={`w-10 h-10 rounded-full ${step === 2 ? 'bg-primary text-slate-900' : 'bg-slate-800 text-slate-400'} border border-slate-700 flex items-center justify-center font-bold transition-all duration-500`}>2</div>
              <span className={`text-xs font-semibold ${step === 2 ? 'text-primary' : 'text-slate-500'}`}>Loan Details</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 font-bold">3</div>
              <span className="text-xs font-semibold text-slate-500">Extraction</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 font-bold">4</div>
              <span className="text-xs font-semibold text-slate-500">Report</span>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-8 shadow-2xl">
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-2 text-white">
              {step === 1 ? 'Company Information' : 'Financial Requirements'}
            </h2>
            <p className="text-slate-400 text-sm">
              {step === 1 ? 'Please provide the legal registration details of the entity for credit assessment.' : 'Specify the loan amount, tenure and purpose for appraisal.'}
            </p>
          </div>

          <form className="space-y-6">
            {step === 1 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 text-left">
                  <label className="text-sm font-medium text-slate-300">Company Name *</label>
                  <input 
                    className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-3 text-slate-100 focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-slate-600" 
                    placeholder="Enter legal entity name" 
                    type="text"
                    value={formData.entity.companyName || ''} 
                    onChange={(e) => handleChange('entity', 'companyName', e.target.value)}
                  />
                </div>
                <div className="space-y-2 text-left">
                  <label className="text-sm font-medium text-slate-300">CIN Number *</label>
                  <input 
                    className={`w-full bg-slate-900/50 border ${errors.cin ? 'border-red-500' : 'border-white/10'} rounded-lg px-4 py-3 text-slate-100 focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-slate-600`} 
                    placeholder="21-digit Corporate Identity Number" 
                    type="text"
                    value={formData.entity.cin || ''} 
                    onChange={(e) => handleChange('entity', 'cin', e.target.value.toUpperCase())}
                  />
                  {errors.cin && <p className="text-red-500 text-xs mt-1">{errors.cin}</p>}
                </div>
                <div className="space-y-2 text-left">
                  <label className="text-sm font-medium text-slate-300">PAN Number *</label>
                  <input 
                    className={`w-full bg-slate-900/50 border ${errors.pan ? 'border-red-500' : 'border-white/10'} rounded-lg px-4 py-3 text-slate-100 focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-slate-600`} 
                    placeholder="10-digit Permanent Account Number" 
                    type="text"
                    value={formData.entity.pan || ''} 
                    onChange={(e) => handleChange('entity', 'pan', e.target.value.toUpperCase())}
                  />
                  {errors.pan && <p className="text-red-500 text-xs mt-1">{errors.pan}</p>}
                </div>
                <div className="space-y-2 text-left">
                  <label className="text-sm font-medium text-slate-300">Sector *</label>
                  <select 
                    className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-3 text-slate-100 focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    value={formData.entity.sector || ''} 
                    onChange={(e) => handleChange('entity', 'sector', e.target.value)}
                  >
                    <option disabled value="">Select industry sector</option>
                    {sectors.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-2 text-left">
                  <label className="text-sm font-medium text-slate-300">Sub-sector</label>
                  <input 
                    className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-3 text-slate-100 focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-slate-600" 
                    placeholder="e.g. Fintech, Pharma, Textile" 
                    type="text"
                    value={formData.entity.subSector || ''} 
                    onChange={(e) => handleChange('entity', 'subSector', e.target.value)}
                  />
                </div>
                <div className="space-y-2 text-left">
                  <label className="text-sm font-medium text-slate-300">Annual Turnover (INR Crores)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">₹</span>
                    <input 
                      className="w-full bg-slate-900/50 border border-white/10 rounded-lg pl-8 pr-4 py-3 text-slate-100 focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-slate-600" 
                      placeholder="Enter annual revenue" 
                      type="number"
                      value={formData.entity.turnover || ''} 
                      onChange={(e) => handleChange('entity', 'turnover', e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2 text-left">
                  <label className="text-sm font-medium text-slate-300">Years in Operation</label>
                  <input 
                    className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-3 text-slate-100 focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-slate-600" 
                    placeholder="e.g. 5" 
                    type="number"
                    value={formData.entity.years || ''} 
                    onChange={(e) => handleChange('entity', 'years', e.target.value)}
                  />
                </div>
                <div className="space-y-2 text-left">
                  <label className="text-sm font-medium text-slate-300">City & State</label>
                  <input 
                    className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-3 text-slate-100 focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-slate-600" 
                    placeholder="e.g. Mumbai, Maharashtra" 
                    type="text"
                    value={formData.entity.location || ''} 
                    onChange={(e) => handleChange('entity', 'location', e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 text-left">
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
                <div className="space-y-2 text-left">
                  <label className="text-sm font-medium text-slate-300">Loan Amount (₹ Crores) *</label>
                  <input 
                    className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-3 text-slate-100 focus:border-primary focus:ring-1 focus:ring-primary transition-all" 
                    type="number" 
                    value={formData.loan.amount || ''} 
                    onChange={(e) => handleChange('loan', 'amount', e.target.value)}
                  />
                </div>
                <div className="space-y-2 text-left">
                  <label className="text-sm font-medium text-slate-300">Tenure (Months) *</label>
                  <input 
                    className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-3 text-slate-100 focus:border-primary focus:ring-1 focus:ring-primary transition-all" 
                    type="number"
                    value={formData.loan.tenure || ''} 
                    onChange={(e) => handleChange('loan', 'tenure', e.target.value)}
                  />
                </div>
                <div className="space-y-2 text-left">
                  <label className="text-sm font-medium text-slate-300">Interest Rate (%)</label>
                  <input 
                    className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-3 text-slate-100 focus:border-primary focus:ring-1 focus:ring-primary transition-all" 
                    type="number" step="0.1"
                    value={formData.loan.rate || ''} 
                    onChange={(e) => handleChange('loan', 'rate', e.target.value)}
                  />
                </div>
                <div className="col-span-full space-y-2 text-left">
                  <label className="text-sm font-medium text-slate-300">Purpose of Loan</label>
                  <textarea 
                    rows="3"
                    className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-3 text-slate-100 focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    value={formData.loan.purpose || ''} 
                    onChange={(e) => handleChange('loan', 'purpose', e.target.value)}
                  />
                </div>
                <div className="space-y-2 text-left">
                  <label className="text-sm font-medium text-slate-300">Existing Banker</label>
                  <input 
                    className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-3 text-slate-100 focus:border-primary focus:ring-1 focus:ring-primary transition-all" 
                    type="text"
                    value={formData.loan.banker || ''} 
                    onChange={(e) => handleChange('loan', 'banker', e.target.value)}
                  />
                </div>
              </div>
            )}
            
            <div className={`pt-8 flex ${step === 2 ? 'justify-between' : 'justify-end'}`}>
              {step === 2 && (
                <button 
                  className="px-8 py-3 rounded-lg border border-white/10 text-slate-300 font-semibold hover:bg-white/5 transition-all flex items-center gap-2"
                  type="button"
                  onClick={() => setStep(1)}
                >
                  <ArrowLeft size={18} /> Back
                </button>
              )}
              <button 
                className="bg-primary hover:bg-primary/90 text-slate-900 font-bold px-10 py-3 rounded-lg flex items-center gap-2 transition-all transform hover:scale-[1.02] active:scale-95 shadow-lg shadow-primary/20 disabled:opacity-50" 
                type="button"
                disabled={step === 1 ? !isStep1Valid() : !isStep2Valid()}
                onClick={step === 1 ? () => setStep(2) : onNext}
              >
                {step === 1 ? 'Next' : 'Proceed to Upload'}
                <span className="material-symbols-outlined">{step === 1 ? 'arrow_forward' : 'check_circle'}</span>
              </button>
            </div>
          </form>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex gap-4 items-start text-left">
            <span className="material-symbols-outlined text-primary bg-primary/10 p-2 rounded-lg">security</span>
            <div>
              <h4 className="text-sm font-semibold">Secure Encryption</h4>
              <p className="text-xs text-slate-500 mt-1">Your data is encrypted with bank-grade 256-bit security protocols.</p>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex gap-4 items-start text-left">
            <span className="material-symbols-outlined text-primary bg-primary/10 p-2 rounded-lg">speed</span>
            <div>
              <h4 className="text-sm font-semibold">Real-time Extraction</h4>
              <p className="text-xs text-slate-500 mt-1">AI-powered data extraction from documents in under 60 seconds.</p>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex gap-4 items-start text-left">
            <span className="material-symbols-outlined text-primary bg-primary/10 p-2 rounded-lg">analytics</span>
            <div>
              <h4 className="text-sm font-semibold">Advanced Scoring</h4>
              <p className="text-xs text-slate-500 mt-1">Multi-dimensional credit scoring engine for precise risk assessment.</p>
            </div>
          </div>
        </div>
      </main>
      
      <footer className="w-full border-t border-white/5 px-6 py-8 mt-auto text-center">
        <p className="text-slate-600 text-xs text-center">© 2024 Intelli-Credit FinTech Solutions. All rights reserved. Registered RBI NBFC Partner.</p>
      </footer>
    </div>
  );
};

export default Stage1_Onboarding;
