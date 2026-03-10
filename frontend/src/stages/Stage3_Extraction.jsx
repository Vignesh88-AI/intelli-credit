import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle, AlertCircle, Edit2, Save, X, Loader2 } from 'lucide-react';
import axios from 'axios';

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

        const response = await axios.post('/api/extract', extractForm);
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

  return (
    <div className="fade-in">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold">Extraction Review</h2>
          <p className="text-secondary">Verify and correct the data extracted by AI before finalizing.</p>
        </div>
        <div className="flex gap-4">
          <button className="btn btn-secondary flex items-center gap-2" onClick={onBack}>
            <ArrowLeft size={18} /> Back
          </button>
          <button className="btn btn-primary flex items-center gap-2" onClick={handleConfirm}>
            Confirm & Proceed <CheckCircle size={18} />
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {results.map((res, idx) => (
          <div key={idx} className="glass p-6">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold">{res.original_type}</h3>
                <span className="text-[10px] bg-[#238636]/20 text-[#238636] px-2 py-0.5 rounded-full font-bold uppercase">
                  Detected: {res.detected_type}
                </span>
              </div>
              <button className="text-xs text-[#f0a500] flex items-center gap-1 hover:underline">
                <AlertCircle size={14} /> View Original
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#30363d] text-left text-secondary">
                    <th className="pb-2 font-medium">Metric</th>
                    <th className="pb-2 font-medium">Value</th>
                    <th className="pb-2 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(res.data).map(([key, val]) => (
                    key !== 'document_type' && (
                      <tr key={key} className="border-b border-[#30363d]/50">
                        <td className="py-3 capitalize font-medium">{key.replace(/_/g, ' ')}</td>
                        <td className="py-3 text-gray-300">
                          {editingId === `${idx}-${key}` ? (
                            <input 
                              type="text" 
                              className="m-0 py-1 px-2 text-xs"
                              value={typeof val === 'object' ? JSON.stringify(val) : val}
                              onChange={(e) => handleFieldChange(idx, key, e.target.value)}
                            />
                          ) : (
                            <span>{typeof val === 'object' ? 'Structured Data' : val}</span>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          {editingId === `${idx}-${key}` ? (
                            <button onClick={() => setEditingId(null)} className="text-[#238636]"><Save size={16} /></button>
                          ) : (
                            <button onClick={() => setEditingId(`${idx}-${key}`)} className="text-gray-500 hover:text-[#f0a500]"><Edit2 size={16} /></button>
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
      </div>
    </div>
  );
};

export default Stage3_Extraction;
