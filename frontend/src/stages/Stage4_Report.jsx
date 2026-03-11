import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, ShieldAlert, TrendingUp, Briefcase, Scale, Loader2, CheckCircle, XCircle } from 'lucide-react';
import axios from 'axios';

const Stage4_Report = ({ formData, setFormData, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [research, setResearch] = useState(null);
  const [verdict, setVerdict] = useState(null);

  useEffect(() => {
    const runFinalAnalysis = async () => {
      try {
        const researchForm = new FormData();
        researchForm.append('company_name', formData.entity.companyName);
        researchForm.append('sector', formData.entity.sector);
        
        const API_URL = import.meta.env.VITE_API_URL || '';
        const res = await axios.post(`${API_URL}/api/research`, researchForm);
        setResearch(res.data);
        
        // Mock verdict logic for demo
        setVerdict({
          status: res.data.overall_sentiment === 'Positive' ? 'APPROVE' : 'REJECT',
          reasoning: [
            "Strong debt-to-equity ratio observed in recent annual reports.",
            "Promoter background appears stable with no recent legal flags.",
            "Sector outlook for " + formData.entity.sector + " remains favorable post-RBI guidelines."
          ],
          swot: {
            strengths: ["Low debt", "Experienced promoters"],
            weaknesses: ["Geographic concentration"],
            opportunities: ["Market expansion"],
            threats: ["Regulatory changes"]
          }
        });
      } catch (error) {
        console.error('Research failed', error);
      } finally {
        setLoading(false);
      }
    };

    runFinalAnalysis();
  }, [formData.entity]);

  const handleDownloadReport = async () => {
    try {
      const allData = JSON.stringify({
        entity: formData.entity,
        loan: formData.loan,
        extracted: formData.extractedData,
        research: research
      });
      
      const form = new FormData();
      form.append('data', allData);
      
      const API_URL = import.meta.env.VITE_API_URL || '';
      const response = await axios.post(`${API_URL}/api/generate-report`, form, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Credit_Appraisal_${formData.entity.companyName}.pdf`);
      document.body.appendChild(link);
      link.click();
    } catch (error) {
      console.error('Report generation failed', error);
      alert('Failed to generate report.');
    }
  };

  const riskScore = 82; // Using design placeholder

  return (
    <div className="fade-in max-w-7xl mx-auto w-full px-6 py-4 space-y-8">
      {/* Onboarding Progress */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Analysis Progress</h3>
          <span className="text-primary font-bold">Step 4 of 4</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden flex">
            <div className="w-1/4 h-full bg-success"></div>
            <div className="w-1/4 h-full bg-success"></div>
            <div className="w-1/4 h-full bg-success"></div>
            <div className="w-1/4 h-full bg-primary relative">
              <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
            </div>
          </div>
        </div>
        <div className="flex justify-between mt-4">
          <div className="flex items-center gap-2 text-success text-xs"><CheckCircle size={14} /> Entity Verification</div>
          <div className="flex items-center gap-2 text-success text-xs"><CheckCircle size={14} /> Financial Audit</div>
          <div className="flex items-center gap-2 text-success text-xs"><CheckCircle size={14} /> Risk Assessment</div>
          <div className="flex items-center gap-2 text-primary text-xs font-bold"><Loader2 size={14} className="animate-spin" /> Final Report</div>
        </div>
      </div>

      {/* Verdict Banner */}
      <div className="glass-banner rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl"></div>
        <div className="flex flex-col gap-2">
          <span className="text-primary text-xs font-bold uppercase tracking-widest">Final Credit Decision</span>
          <h1 className="text-4xl font-extrabold text-white">Analysis Complete</h1>
          <p className="text-slate-400 max-w-md">
            The subject entity <span className="text-white font-medium">{formData.entity.companyName}</span> has passed all automated compliance checks. 
            Creditworthiness is established based on historical cash flows and market position.
          </p>
        </div>
        <div className="flex flex-col items-center gap-3">
          <div className={`border px-8 py-4 rounded-xl ${verdict.status === 'APPROVE' ? 'bg-success/20 border-success/40' : 'bg-red-500/20 border-red-500/40'}`}>
            <span className={`${verdict.status === 'APPROVE' ? 'text-success' : 'text-red-500'} text-3xl font-black tracking-tighter uppercase`}>
              VERDICT: {verdict.status}
            </span>
          </div>
          <p className="text-slate-500 text-xs">Decision timestamp: {new Date().toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* SWOT Matrix */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">analytics</span> SWOT Analysis
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            <div className="glass-card p-6 rounded-xl border-l-4 border-l-success">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-success/10 rounded-lg text-success"><span className="material-symbols-outlined">trending_up</span></div>
                <h4 className="font-bold text-lg">Strengths</h4>
              </div>
              <ul className="text-sm text-slate-400 space-y-2">
                {verdict.swot.strengths.map((s, i) => <li key={i} className="flex items-start gap-2">• {s}</li>)}
              </ul>
            </div>
            <div className="glass-card p-6 rounded-xl border-l-4 border-l-red-500">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-red-500/10 rounded-lg text-red-500"><span className="material-symbols-outlined">warning</span></div>
                <h4 className="font-bold text-lg">Weaknesses</h4>
              </div>
              <ul className="text-sm text-slate-400 space-y-2">
                {verdict.swot.weaknesses.map((s, i) => <li key={i} className="flex items-start gap-2">• {s}</li>)}
              </ul>
            </div>
            <div className="glass-card p-6 rounded-xl border-l-4 border-l-blue-500">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500"><span className="material-symbols-outlined">lightbulb</span></div>
                <h4 className="font-bold text-lg">Opportunities</h4>
              </div>
              <ul className="text-sm text-slate-400 space-y-2">
                {verdict.swot.opportunities.map((s, i) => <li key={i} className="flex items-start gap-2">• {s}</li>)}
              </ul>
            </div>
            <div className="glass-card p-6 rounded-xl border-l-4 border-l-warning">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-warning/10 rounded-lg text-warning"><span className="material-symbols-outlined">shield_with_heart</span></div>
                <h4 className="font-bold text-lg">Threats</h4>
              </div>
              <ul className="text-sm text-slate-400 space-y-2">
                {verdict.swot.threats.map((s, i) => <li key={i} className="flex items-start gap-2">• {s}</li>)}
              </ul>
            </div>
          </div>
        </div>

        {/* Risk Assessment Gauge */}
        <div className="flex flex-col gap-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">speed</span> Risk Assessment
          </h3>
          <div className="glass-card rounded-xl p-8 flex flex-col items-center justify-center flex-grow text-center">
            <div className="relative w-48 h-48 mb-6">
              <svg className="w-full h-full transform -rotate-90">
                <circle className="text-slate-800" cx="96" cy="96" fill="transparent" r="80" stroke="currentColor" strokeWidth="12" />
                <circle 
                  className="text-primary transition-all duration-1000" 
                  cx="96" cy="96" fill="transparent" r="80" stroke="currentColor" strokeWidth="12"
                  strokeDasharray="502.6"
                  strokeDashoffset={502.6 - (502.6 * riskScore / 100)}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center transform rotate-90">
                <span className="text-5xl font-black text-white">{riskScore}</span>
                <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">out of 100</span>
              </div>
            </div>
            <div className="flex flex-col gap-1 text-center">
              <span className="text-success font-bold text-lg">LOW RISK</span>
              <p className="text-sm text-slate-400">The entity qualifies for premium credit terms based on current liquidity.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Action Bar */}
      <div className="flex justify-between items-center glass-card p-6 rounded-2xl border-white/10">
        <button 
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors font-semibold"
          onClick={onBack}
        >
          <ArrowLeft size={18} /> Back to Extraction
        </button>
        <div className="flex gap-4">
          <button className="px-6 py-3 border border-white/10 rounded-lg text-slate-300 font-bold hover:bg-white/5 transition-all flex items-center gap-2">
            <span className="material-symbols-outlined">share</span> Share Analysis
          </button>
          <button 
            className="px-8 py-3 bg-primary text-background-dark rounded-lg font-black text-lg hover:brightness-110 shadow-[0_0_20px_rgba(240,164,0,0.3)] transition-all flex items-center gap-2"
            onClick={handleDownloadReport}
          >
            <span className="material-symbols-outlined">download</span> Download Appraisal Report
          </button>
        </div>
      </div>
    </div>
  );
};

export default Stage4_Report;
