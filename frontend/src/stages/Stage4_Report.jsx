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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="animate-spin text-[#f0a500] mb-4" size={48} />
        <h3 className="text-xl font-bold">Generating Final Appraisal Report...</h3>
        <p className="text-secondary">Synthesizing financials with secondary research.</p>
      </div>
    );
  }

  return (
    <div className="fade-in">
      {/* Verdict Banner */}
      <div className={`p-6 rounded-xl mb-8 flex items-center justify-between ${
        verdict.status === 'APPROVE' ? 'bg-[#238636]/20 border border-[#238636]' : 'bg-red-500/20 border border-red-500'
      }`}>
        <div className="flex items-center gap-4">
          {verdict.status === 'APPROVE' ? <CheckCircle className="text-[#238636]" size={40} /> : <XCircle className="text-red-500" size={40} />}
          <div>
            <h2 className={`text-2xl font-black ${verdict.status === 'APPROVE' ? 'text-[#238636]' : 'text-red-500'}`}>
              VERDICT: {verdict.status}
            </h2>
            <p className="text-secondary text-sm">Based on AI analysis of financials and secondary research findings.</p>
          </div>
        </div>
        <button onClick={handleDownloadReport} className="btn btn-primary flex items-center gap-2">
          <Download size={18} /> Download Full CAM
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Research Findings */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-[#f0a500]" /> Research Insights
          </h3>
          <div className="space-y-4">
            <div className="bg-[#0d1117] p-4 rounded border border-[#30363d]">
              <h4 className="text-xs font-bold text-secondary uppercase mb-2">Promoter Risk</h4>
              <p className="text-sm">{research.promoter_risk}</p>
            </div>
            <div className="bg-[#0d1117] p-4 rounded border border-[#30363d]">
              <h4 className="text-xs font-bold text-secondary uppercase mb-2">Sector Outlook</h4>
              <p className="text-sm">{research.sector_outlook}</p>
            </div>
          </div>
        </div>

        {/* SWOT Analysis */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Briefcase size={20} className="text-[#f0a500]" /> SWOT Matrix
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-green-500/10 p-3 rounded border border-green-500/20">
              <span className="text-[10px] font-bold text-green-500 uppercase">Strengths</span>
              <ul className="text-[11px] list-disc list-inside mt-1 text-gray-400">
                {verdict.swot.strengths.map(s => <li key={s}>{s}</li>)}
              </ul>
            </div>
            <div className="bg-yellow-500/10 p-3 rounded border border-yellow-500/20">
              <span className="text-[10px] font-bold text-yellow-500 uppercase">Weaknesses</span>
              <ul className="text-[11px] list-disc list-inside mt-1 text-gray-400">
                {verdict.swot.weaknesses.map(s => <li key={s}>{s}</li>)}
              </ul>
            </div>
            <div className="bg-blue-500/10 p-3 rounded border border-blue-500/20">
              <span className="text-[10px] font-bold text-blue-500 uppercase">Opportunities</span>
              <ul className="text-[11px] list-disc list-inside mt-1 text-gray-400">
                {verdict.swot.opportunities.map(s => <li key={s}>{s}</li>)}
              </ul>
            </div>
            <div className="bg-red-500/10 p-3 rounded border border-red-500/20">
              <span className="text-[10px] font-bold text-red-500 uppercase">Threats</span>
              <ul className="text-[11px] list-disc list-inside mt-1 text-gray-400">
                {verdict.swot.threats.map(s => <li key={s}>{s}</li>)}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-start">
        <button className="btn btn-secondary flex items-center gap-2" onClick={onBack}>
          <ArrowLeft size={18} /> Back to Extraction
        </button>
      </div>
    </div>
  );
};

export default Stage4_Report;
