import React, { useState } from 'react';
import DocumentCard from '../components/DocumentCard';
import { ArrowLeft, Play, Loader2 } from 'lucide-react';
import axios from 'axios';
import '../styles/stage2.css';

const Stage2_Upload = ({ formData, setFormData, onNext, onBack }) => {
  const [isUploading, setIsUploading] = useState(false);

  const docTypes = [
    { type: 'ALM Statement', description: 'Asset-Liability Management, maturity buckets, liquidity ratios.', mandatory: true, icon: 'upload_file' },
    { type: 'Shareholding Pattern', description: 'Promoter %, FII %, Public %, Pledge details.', mandatory: true, icon: 'groups' },
    { type: 'Borrowing Profile', description: 'Lender-wise breakup, repayment schedule, total debt.', mandatory: true, icon: 'account_balance' },
    { type: 'Annual Reports', description: 'P&L, Balance Sheet, Cashflow (last 3 years).', mandatory: true, icon: 'description' },
    { type: 'Portfolio Cuts', description: 'NPA %, collection efficiency, vintage analysis.', mandatory: false, icon: 'pie_chart' }
  ];

  const handleFileUpload = (type, file) => {
    setFormData(prev => ({
      ...prev,
      uploads: [...prev.uploads.filter(u => u.docType !== type), { docType: type, file }]
    }));
  };

  const handleFileRemove = (type) => {
    setFormData(prev => ({
      ...prev,
      uploads: prev.uploads.filter(u => u.docType !== type)
    }));
  };

  const isMandatoryUploaded = () => {
    const uploadedTypes = formData.uploads.map(u => u.docType);
    return docTypes.filter(d => d.mandatory).every(d => uploadedTypes.includes(d.type));
  };

  const handleProceed = async () => {
    setIsUploading(true);
    try {
      const uploadForm = new FormData();
      const entityId = formData.entity.cin || 'temp_entity';
      uploadForm.append('entity_id', entityId);
      
      formData.uploads.forEach(u => {
        uploadForm.append('files', u.file);
        uploadForm.append('doc_types', u.docType);
      });

      const API_URL = import.meta.env.VITE_API_URL || '';
      const response = await axios.post(`${API_URL}/api/upload`, uploadForm);
      
      setFormData(prev => ({
        ...prev,
        uploadedResults: response.data
      }));
      
      onNext();
    } catch (error) {
      console.error('Upload failed', error);
      alert('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="relative flex flex-col w-full min-h-screen overflow-x-hidden pt-4">

      <main className="flex-1 flex flex-col items-center px-6 py-6 lg:px-20 max-w-7xl mx-auto w-full fade-in">
        {/* Progress Stepper */}
        <div className="w-full mb-12">
          <div className="flex justify-between max-w-4xl mx-auto relative">
            <div className="absolute top-5 left-0 w-full h-0.5 bg-white/10 -z-10">
              <div className="h-full bg-primary transition-all duration-500" style={{ width: '35%' }}></div>
            </div>
            
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-primary text-background-dark flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-sm">check</span>
              </div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Entity</span>
            </div>
            
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-primary text-background-dark flex items-center justify-center font-bold ring-4 ring-primary/20 transition-all duration-500">
                2
              </div>
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">Documents</span>
            </div>
            
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-white/10 text-slate-500 flex items-center justify-center font-bold transition-all duration-500">
                3
              </div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Extraction</span>
            </div>
            
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-white/10 text-slate-500 flex items-center justify-center font-bold transition-all duration-500">
                4
              </div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Report</span>
            </div>
          </div>
        </div>

        {/* Page Header */}
        <div className="w-full text-left mb-8">
          <h1 className="text-white text-3xl font-extrabold tracking-tight mb-2">Upload Financial Documents</h1>
          <p className="text-slate-400 text-lg">Provide the following entity records to begin our automated credit analysis.</p>
        </div>

        {/* Upload Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full mb-12">
          {docTypes.map((doc) => (
            <DocumentCard 
              key={doc.type}
              type={doc.type}
              description={doc.description}
              isOptional={!doc.mandatory}
              icon={doc.icon}
              file={formData.uploads.find(u => u.docType === doc.type)?.file}
              onUpload={handleFileUpload}
              onRemove={handleFileRemove}
            />
          ))}
          {/* Optional empty state card to match Stitch design */}
          <div className="glass-card rounded-xl p-6 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-white/5 opacity-40">
             <span className="material-symbols-outlined text-slate-600">post_add</span>
             <p className="text-xs text-slate-600 font-medium uppercase tracking-tighter">Additional Support Files</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-4 pt-8 border-t border-white/10">
          <button 
            className="w-full sm:w-auto px-8 py-3 rounded-lg border border-white/10 text-slate-300 font-semibold hover:bg-white/5 transition-all flex items-center gap-2"
            onClick={onBack}
          >
            <ArrowLeft size={18} /> Back to Entity
          </button>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <p className="text-slate-500 text-sm hidden md:block">
              {formData.uploads.length} of {docTypes.length} documents uploaded
            </p>
            <button 
              className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-background-dark px-10 py-3 rounded-lg font-bold shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              onClick={handleProceed}
              disabled={!isMandatoryUploaded() || isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Analyzing...
                </>
              ) : (
                <>
                  Continue to Extraction
                  <span className="material-symbols-outlined">arrow_forward</span>
                </>
              )}
            </button>
          </div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent"></div>
    </div>
  );
};

export default Stage2_Upload;
