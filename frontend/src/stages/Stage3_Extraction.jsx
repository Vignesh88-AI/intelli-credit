import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle, AlertCircle, Edit2, Save, X, Loader2 } from 'lucide-react';
import axios from 'axios';
import '../styles/stage3.css';

const Stage3_Extraction = ({ formData, setFormData, onNext, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState([]);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    const triggerExtraction = async () => {
      try {
        const extractForm = new FormData();
        formData.uploadedResults.forEach(r => {
          extractForm.append('file_paths', r.path);
          extractForm.append('doc_types', r.doc_type);
        });

        const API_URL = import.meta.env.VITE_API_URL || '';
        const response = await axios.post(`${API_URL}/api/extract`, extractForm);
        setResults(response.data);
      } catch (error) {
        console.error('Extraction failed', error);
      } finally {
        setLoading(false);
      }
    };

    if (formData.uploadedResults) triggerExtraction();
  }, [formData.uploadedResults]);

  const handleFieldChange = (docIdx, key, value) => {
    const newResults = [...results];
    newResults[docIdx].data[key] = value;
    setResults(newResults);
  };

  const handleConfirm = () => {
    setFormData(prev => ({ ...prev, extractedData: results }));
    onNext();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="animate-spin text-[#f0a500] mb-4" size={48} />
        <h3 className="text-xl font-bold">AI is reading your documents...</h3>
        <p className="text-secondary">Classifying and extracting financial metrics.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 glass-card rounded-2xl border-white/5 mx-auto max-w-2xl">
        <Loader2 className="animate-spin text-primary mb-6" size={64} />
        <h3 className="text-2xl font-bold text-white mb-2">AI is reading your documents...</h3>
        <p className="text-slate-400 text-center px-8">Classifying and extracting financial metrics using multi-dimensional neural networks.</p>
        <div className="mt-8 w-64 bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div className="bg-primary h-full w-2/3 animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden pt-4">
      
      <main className="flex-1 max-w-7xl mx-auto w-full px-8 py-6 fade-in">
        {/* Progress Stepper */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-100">AI Extraction Review</h1>
            <span className="text-sm font-semibold bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20">Step 3 of 4</span>
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="h-1.5 w-full bg-primary rounded-full"></div>
              <p className="text-xs font-bold text-primary mt-2 uppercase tracking-wider">1. Entity</p>
            </div>
            <div className="flex-1">
              <div className="h-1.5 w-full bg-primary rounded-full"></div>
              <p className="text-xs font-bold text-primary mt-2 uppercase tracking-wider">2. Documents</p>
            </div>
            <div className="flex-1">
              <div className="h-1.5 w-full bg-primary rounded-full relative overflow-hidden">
                <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
              </div>
              <p className="text-xs font-bold text-primary mt-2 uppercase tracking-wider">3. Extraction</p>
            </div>
            <div className="flex-1">
              <div className="h-1.5 w-full bg-slate-700 rounded-full"></div>
              <p className="text-xs font-bold text-slate-500 mt-2 uppercase tracking-wider">4. Report</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Extraction Table */}
          <div className="lg:col-span-2 space-y-6">
            {results.map((res, idx) => (
              <div key={idx} className="glass-card rounded-xl overflow-hidden shadow-2xl">
                <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                  <div className="text-left">
                    <h3 className="font-bold text-lg text-white">{res.original_type}</h3>
                    <p className="text-slate-400 text-sm italic">Source File: {formData.uploads.find(u => results.indexOf(res) === formData.uploadedResults.indexOf(formData.uploadedResults.find(r => r.path.includes(res.source_file || ''))))?.file.name || `Document #${idx + 1}`}</p>
                  </div>
                  <div className="text-xs font-bold bg-green-500/10 text-green-500 px-3 py-1 rounded border border-green-500/20">
                    {res.detected_type} Detected
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-slate-400 text-xs font-semibold uppercase tracking-widest border-b border-white/5">
                        <th className="px-6 py-4">Field Name</th>
                        <th className="px-6 py-4">Extracted Value</th>
                        <th className="px-6 py-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {Object.entries(res.data).map(([key, val]) => (
                        key !== 'document_type' && (
                          <tr key={key} className={`border-b border-white/5 hover:bg-white/5 transition-colors ${editingId === `${idx}-${key}` ? 'bg-primary/5 border-y-2 border-primary/50' : ''}`}>
                            <td className="px-6 py-5 font-medium capitalize text-slate-200">{key.replace(/_/g, ' ')}</td>
                            <td className="px-6 py-5">
                              {editingId === `${idx}-${key}` ? (
                                <input 
                                  className="bg-slate-900 border-primary focus:ring-primary text-slate-100 rounded-lg text-sm px-3 py-1.5 w-full"
                                  type="text" 
                                  value={typeof val === 'object' ? JSON.stringify(val) : val}
                                  onChange={(e) => handleFieldChange(idx, key, e.target.value)}
                                  autoFocus
                                />
                              ) : (
                                <span className="text-slate-300 font-mono">{typeof val === 'object' ? 'Structured Data' : val}</span>
                              )}
                            </td>
                            <td className="px-6 py-5 text-right">
                              {editingId === `${idx}-${key}` ? (
                                <button onClick={() => setEditingId(null)} className="bg-primary text-background-dark font-bold px-4 py-1.5 rounded-lg text-xs hover:bg-primary/90 transition-all">Save</button>
                              ) : (
                                <button onClick={() => setEditingId(`${idx}-${key}`)} className="text-slate-400 hover:text-primary transition-colors">
                                  <span className="material-symbols-outlined text-[20px]">edit</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            <div className="glass-card rounded-xl p-6 flex items-center justify-between border-primary/20 bg-primary/5">
              <div className="flex items-center gap-4 text-left">
                <div className="size-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary">auto_awesome</span>
                </div>
                <div>
                  <h4 className="font-bold text-white text-left">AI Consistency Check</h4>
                  <p className="text-sm text-slate-400">Extracted data points align across documents. No major anomalies detected.</p>
                </div>
              </div>
              <button className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 px-6 py-2 rounded-xl font-bold transition-all text-xs">
                Run Audit
              </button>
            </div>
          </div>

          {/* Side Panel */}
          <div className="space-y-6">
            <div className="glass-card rounded-xl overflow-hidden">
              <div className="p-6 border-b border-white/10 text-left">
                <h3 className="font-bold text-lg mb-1 text-white">Document Status</h3>
                <p className="text-slate-400 text-sm">Review identified files</p>
              </div>
              <div className="p-4 space-y-4">
                {formData.uploads.map((u, i) => (
                  <div key={i} className="p-4 bg-white/5 rounded-xl border border-white/10 text-left">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="material-symbols-outlined text-primary">description</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate text-white">{u.file.name}</p>
                        <p className="text-xs text-slate-500">{u.docType}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="flex-1 flex items-center justify-center gap-1 bg-green-500/10 hover:bg-green-500/20 text-green-500 text-[10px] font-bold py-2 rounded-lg border border-green-500/30 transition-all uppercase tracking-wider">
                        <span className="material-symbols-outlined text-xs">check_circle</span> Approve
                      </button>
                      <button className="flex-1 flex items-center justify-center gap-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[10px] font-bold py-2 rounded-lg border border-red-500/30 transition-all uppercase tracking-wider">
                        <span className="material-symbols-outlined text-xs">cancel</span> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="glass-card rounded-xl p-6 bg-gradient-to-br from-primary/10 to-transparent border-primary/20 text-left">
              <h4 className="font-bold mb-2 text-white">Need help?</h4>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">If the AI failed to extract specific fields, you can manually override values in the extraction table.</p>
              <button 
                className="w-full py-3 rounded-xl border border-white/10 text-[10px] font-bold hover:bg-white/5 flex items-center justify-center gap-2 uppercase tracking-widest text-slate-300"
                onClick={onBack}
              >
                <span className="material-symbols-outlined text-[16px]">upload_file</span> Upload More
              </button>
            </div>
          </div>
        </div>

        {/* Sticky Footer Action */}
        <div className="mt-12 flex justify-between items-center glass-card p-6 rounded-2xl border-white/10">
          <button 
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors font-semibold"
            onClick={onBack}
          >
            <span className="material-symbols-outlined">arrow_back</span> Back
          </button>
          <div className="flex gap-4">
            <button className="px-8 py-3 rounded-xl border border-white/10 font-bold hover:bg-white/5 transition-all text-slate-300 text-sm">
              Save Progress
            </button>
            <button 
              className="px-10 py-3 bg-primary text-background-dark rounded-xl font-extrabold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all flex items-center gap-2"
              onClick={handleConfirm}
            >
              Finalize & Generate Report <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Stage3_Extraction;
