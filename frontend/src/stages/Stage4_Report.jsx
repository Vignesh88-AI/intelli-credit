import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, ShieldAlert, TrendingUp, Briefcase, Scale, Loader2, CheckCircle, XCircle } from 'lucide-react';
import axios from 'axios';
import '../styles/stage4.css';

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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 glass-card rounded-2xl border-white/5 mx-auto max-w-2xl">
        <Loader2 className="animate-spin text-primary mb-6" size={64} />
        <h3 className="text-2xl font-bold text-white mb-2">Finalizing Intelligence...</h3>
        <p className="text-slate-400 text-center px-8">Synthesizing extracted data with real-time market research and sector outlooks.</p>
        <div className="mt-8 w-64 bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div className="bg-primary h-full w-3/4 animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (!verdict) return null;

  return (
    <div className="relative flex flex-col w-full min-h-screen overflow-x-hidden pt-4">

      <main className="flex-1 flex flex-col items-center px-6 py-4 lg:px-20 max-w-7xl mx-auto w-full fade-in">
        {/* Analysis Status Bar */}
        <div className="w-full glass-card rounded-xl p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Analysis Lifecycle</h3>
                <span className="text-primary font-black text-xs">FINAL STAGE</span>
            </div>
            <div className="flex items-center gap-4">
                <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
                    <div className="w-full h-full bg-success"></div>
                </div>
            </div>
            <div className="flex justify-between mt-4">
                <div className="flex items-center gap-2 text-green-500 text-[10px] font-bold uppercase tracking-wider"><span className="material-symbols-outlined text-xs">check_circle</span> Entity Verified</div>
                <div className="flex items-center gap-2 text-green-500 text-[10px] font-bold uppercase tracking-wider"><span className="material-symbols-outlined text-xs">check_circle</span> Data Extracted</div>
                <div className="flex items-center gap-2 text-green-500 text-[10px] font-bold uppercase tracking-wider"><span className="material-symbols-outlined text-xs">check_circle</span> Risk Indexed</div>
                <div className="flex items-center gap-2 text-primary text-[10px] font-bold uppercase tracking-wider"><span className="material-symbols-outlined text-xs animate-spin">sync</span> Report Ready</div>
            </div>
        </div>

        {/* Verdict Hero Section */}
        <section className="w-full glass-banner rounded-2xl p-8 mb-8 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden shadow-2xl">
            <div className="absolute -right-20 -top-20 w-80 h-80 bg-primary/5 rounded-full blur-3xl -z-10"></div>
            <div className="flex flex-col gap-2 text-left">
                <span className="text-primary text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                    <span className="material-symbols-outlined text-xs">verified</span> Final Credit Decision
                </span>
                <h1 className="text-4xl font-black text-white leading-tight">Analysis Complete</h1>
                <p className="text-slate-400 max-w-md text-sm leading-relaxed">
                    Subject <span className="text-white font-bold">{formData.entity.companyName}</span> has passed all automated compliance & risk filters. 
                    Historical cash-flow analysis suggests strong debt serviceability.
                </p>
            </div>
            <div className="flex flex-col items-center gap-4">
                <div className={`border-2 px-10 py-5 rounded-2xl flex flex-col items-center gap-1 shadow-[0_0_40px_rgba(240,165,0,0.1)] ${verdict.status === 'APPROVE' ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">System Verdict</span>
                    <span className={`text-4xl font-black tracking-tighter ${verdict.status === 'APPROVE' ? 'text-green-500' : 'text-red-500'}`}>
                        {verdict.status}
                    </span>
                </div>
                <p className="text-slate-500 text-[10px] font-medium uppercase tracking-widest">Certified: {new Date().toLocaleDateString()}</p>
            </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full mb-12">
            {/* SWOT Matrix */}
            <div className="lg:col-span-2 flex flex-col gap-4">
                <h3 className="text-white font-bold flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-lg">analytics</span> Intelligence Matrix
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="glass-card p-6 rounded-xl border-t-2 border-green-500/40 text-left">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="size-10 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500">
                                <span className="material-symbols-outlined">trending_up</span>
                            </div>
                            <h4 className="font-bold text-white uppercase tracking-wider text-sm">Strengths</h4>
                        </div>
                        <ul className="space-y-3">
                            {verdict.swot.strengths.map((s, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-slate-400 font-medium">
                                <span className="text-green-500 text-lg leading-none">•</span> {s}
                              </li>
                            ))}
                        </ul>
                    </div>
                    <div className="glass-card p-6 rounded-xl border-t-2 border-red-500/40 text-left">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="size-10 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500">
                                <span className="material-symbols-outlined">warning</span>
                            </div>
                            <h4 className="font-bold text-white uppercase tracking-wider text-sm">Weaknesses</h4>
                        </div>
                        <ul className="space-y-3">
                            {verdict.swot.weaknesses.map((s, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-slate-400 font-medium">
                                <span className="text-red-500 text-lg leading-none">•</span> {s}
                              </li>
                            ))}
                        </ul>
                    </div>
                    <div className="glass-card p-6 rounded-xl border-t-2 border-blue-500/40 text-left">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="size-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                                <span className="material-symbols-outlined">lightbulb</span>
                            </div>
                            <h4 className="font-bold text-white uppercase tracking-wider text-sm">Opportunities</h4>
                        </div>
                        <ul className="space-y-3">
                            {verdict.swot.opportunities.map((s, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-slate-400 font-medium">
                                <span className="text-blue-500 text-lg leading-none">•</span> {s}
                              </li>
                            ))}
                        </ul>
                    </div>
                    <div className="glass-card p-6 rounded-xl border-t-2 border-orange-500/40 text-left">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="size-10 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500">
                                <span className="material-symbols-outlined">shield_with_heart</span>
                            </div>
                            <h4 className="font-bold text-white uppercase tracking-wider text-sm">Threats</h4>
                        </div>
                        <ul className="space-y-3">
                            {verdict.swot.threats.map((s, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-slate-400 font-medium">
                                <span className="text-orange-500 text-lg leading-none">•</span> {s}
                              </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            {/* Risk Gauge */}
            <div className="flex flex-col gap-4">
                <h3 className="text-white font-bold flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-lg">speed</span> Risk Assessment
                </h3>
                <div className="glass-card rounded-xl p-8 flex flex-col items-center justify-center flex-1">
                    <div className="relative size-48 mb-8">
                        <svg className="size-full transform -rotate-90">
                            <circle className="text-white/5" cx="96" cy="96" fill="transparent" r="88" stroke="currentColor" strokeWidth="12" />
                            <circle 
                                className="text-primary transition-all duration-[2000ms] ease-out" 
                                cx="96" cy="96" fill="transparent" r="88" stroke="currentColor" strokeWidth="12"
                                strokeDasharray="553"
                                strokeDashoffset={553 - (553 * riskScore / 100)}
                                strokeLinecap="round"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center transform rotate-90">
                            <span className="text-5xl font-black text-white">{riskScore}</span>
                            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">out of 100</span>
                        </div>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                        <span className="text-green-500 font-black text-xl tracking-tighter">LOW RISK PROFILE</span>
                        <p className="text-slate-500 text-xs font-medium max-w-[200px] leading-relaxed">
                            Entity qualifies for Tier-1 interest rates and preferential processing.
                        </p>
                    </div>
                </div>
            </div>
        </div>

        {/* Global Action Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-4 pt-8 border-t border-white/10">
            <button 
                className="w-full sm:w-auto px-8 py-3 rounded-xl border border-white/10 text-slate-400 font-bold hover:bg-white/5 transition-all flex items-center gap-2 text-sm"
                onClick={onBack}
            >
                <ArrowLeft size={18} /> Back to Analysis
            </button>
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                <button className="w-full sm:w-auto px-6 py-3 border border-white/10 rounded-xl text-slate-300 font-bold hover:bg-white/5 transition-all flex items-center justify-center gap-2 text-xs">
                    <span className="material-symbols-outlined text-sm">share</span> Share Report
                </button>
                <button 
                  className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-background-dark px-10 py-4 rounded-xl font-black shadow-[0_0_30px_rgba(240,165,0,0.2)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 text-sm"
                  onClick={handleDownloadReport}
                >
                    <span className="material-symbols-outlined">download</span> Download Appraisal Dossier
                </button>
            </div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent"></div>
    </div>
  );
};

export default Stage4_Report;
