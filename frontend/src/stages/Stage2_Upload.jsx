import React, { useState } from 'react';
import DocumentCard from '../components/DocumentCard';
import { ArrowLeft, Play, Loader2 } from 'lucide-react';
import axios from 'axios';

const Stage2_Upload = ({ formData, setFormData, onNext, onBack }) => {
  const [isUploading, setIsUploading] = useState(false);

  const docTypes = [
    { type: 'ALM Statement', description: 'Asset-Liability Management, maturity buckets, liquidity ratios.', mandatory: true },
    { type: 'Shareholding Pattern', description: 'Promoter %, FII %, Public %, Pledge details.', mandatory: true },
    { type: 'Borrowing Profile', description: 'Lender-wise breakup, repayment schedule, total debt.', mandatory: true },
    { type: 'Annual Reports', description: 'P&L, Balance Sheet, Cashflow (last 3 years).', mandatory: true },
    { type: 'Portfolio Cuts', description: 'NPA %, collection efficiency, vintage analysis.', mandatory: false }
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
      // Generate a dummy entity_id if not present for /tmp storage
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
    <div className="fade-in">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold">Document Repository</h2>
          <p className="text-secondary">Upload the required corporate documents for AI-powered analysis.</p>
        </div>
        <div className="flex gap-4">
          <button className="btn btn-secondary flex items-center gap-2" onClick={onBack}>
            <ArrowLeft size={18} /> Back
          </button>
          <button 
            className="btn btn-primary flex items-center gap-2 disabled:opacity-50" 
            disabled={!isMandatoryUploaded() || isUploading}
            onClick={handleProceed}
          >
            {isUploading ? <Loader2 className="animate-spin" size={18} /> : <Play size={18} />}
            {isUploading ? 'Analyzing...' : 'Proceed to Analysis'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {docTypes.map((doc) => (
          <DocumentCard 
            key={doc.type}
            type={doc.type}
            description={doc.description}
            isOptional={!doc.mandatory}
            file={formData.uploads.find(u => u.docType === doc.type)?.file}
            onUpload={handleFileUpload}
            onRemove={handleFileRemove}
          />
        ))}
      </div>
    </div>
  );
};

export default Stage2_Upload;
