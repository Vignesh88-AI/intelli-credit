import React, { useState } from 'react';
import DocumentCard from '../components/DocumentCard';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import axios from 'axios';

const STYLES = {
  container: { maxWidth: "1200px", margin: "0 auto", padding: "40px 20px" },
  header: { marginBottom: "32px", textAlign: "left" },
  title: { fontSize: "32px", fontWeight: "800", color: "#f0a500", marginBottom: "8px" },
  subtitle: { color: "rgba(255,255,255,0.5)", fontSize: "16px" },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: "24px",
    marginBottom: "40px",
  },
  footer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: "32px",
    borderTop: "1px solid rgba(255,255,255,0.1)",
  },
  button: {
    background: "#f0a500",
    color: "#0a1628",
    fontWeight: "700",
    padding: "12px 32px",
    borderRadius: "50px",
    border: "none",
    cursor: "pointer",
    fontSize: "16px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    transition: "all 0.2s",
  },
  secondaryButton: {
    background: "transparent",
    color: "white",
    border: "1px solid rgba(255,255,255,0.2)",
    padding: "12px 24px",
    borderRadius: "50px",
    cursor: "pointer",
    fontWeight: "600",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  }
};

const Stage2_Upload = ({ onNext, entityData }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [uploads, setUploads] = useState([]);

  const docTypes = [
    { type: 'ALM Statement', description: 'Asset-Liability Management, maturity buckets, liquidity ratios.', mandatory: true },
    { type: 'Shareholding Pattern', description: 'Promoter %, FII %, Public %, Pledge details.', mandatory: true },
    { type: 'Borrowing Profile', description: 'Lender-wise breakup, repayment schedule, total debt.', mandatory: true },
    { type: 'Annual Reports', description: 'P&L, Balance Sheet, Cashflow (last 3 years).', mandatory: true },
    { type: 'Portfolio Cuts', description: 'NPA %, collection efficiency, vintage analysis.', mandatory: false }
  ];

  const handleFileUpload = (type, file) => {
    setUploads(prev => [...prev.filter(u => u.docType !== type), { docType: type, file }]);
  };

  const handleFileRemove = (type) => {
    setUploads(prev => prev.filter(u => u.docType !== type));
  };

  const isMandatoryUploaded = () => {
    const uploadedTypes = uploads.map(u => u.docType);
    return docTypes.filter(d => d.mandatory).every(d => uploadedTypes.includes(d.type));
  };

  const handleProceed = async () => {
    if (uploads.length === 0) return;
    setIsUploading(true);
    setError(null);
    
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://intelli-credit-7kzw.onrender.com';
      console.log('Initiating upload and extraction sequence...');
      
      const uploadForm = new FormData();
      const entityId = entityData?.entity?.cin || 'temp_entity';
      uploadForm.append('entity_id', entityId);
      
      uploads.forEach(u => {
        uploadForm.append('files', u.file);
        uploadForm.append('doc_types', u.docType);
      });
 
      // 1. Upload documents
      console.log('Step 1: Uploading documents...');
      const uploadResponse = await axios.post(`${API_URL}/api/upload`, uploadForm);
      const uploadedFiles = uploadResponse.data;
      console.log('Upload successful:', uploadedFiles);

      // 2. Trigger Extraction
      console.log('Step 2: Triggering AI extraction...');
      const extractForm = new FormData();
      uploadedFiles.forEach(file => {
        extractForm.append('file_paths', file.path);
        extractForm.append('doc_types', file.doc_type);
      });

      const extractResponse = await axios.post(`${API_URL}/api/extract`, extractForm);
      const result = extractResponse.data;
      console.log('Extraction response:', result);

      if (!result || !result.extractions || result.extractions.length === 0) {
        console.error('Extraction failed: Empty result');
        setError('Analysis failed. No data could be extracted. Please try again.');
        return;
      }
      
      onNext({ 
        extractions: result.extractions || [],
        uploads 
      });
    } catch (err) {
      console.error('API Sequence Error:', err);
      setError('Analysis failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div style={STYLES.container}>
      <div style={STYLES.header}>
        <h1 style={STYLES.title}>Document Repository</h1>
        <p style={STYLES.subtitle}>Please upload the mandatory financial records for {entityData?.entity?.companyName || "the entity"}.</p>
      </div>

      {error && (
        <div style={{ 
          background: "rgba(255, 77, 77, 0.1)", 
          border: "1px solid #ff4d4d", 
          color: "#ff4d4d", 
          padding: "16px", 
          borderRadius: "8px", 
          marginBottom: "24px",
          textAlign: "left",
          fontSize: "14px",
          fontWeight: "600"
        }}>
          {error}
        </div>
      )}

      {isUploading ? (
        <div style={{ 
          height: "400px", 
          display: "flex", 
          flexDirection: "column", 
          alignItems: "center", 
          justifyContent: "center",
          background: "rgba(255,255,255,0.02)",
          borderRadius: "16px",
          border: "1px dashed rgba(255,255,255,0.1)"
        }}>
          <Loader2 className="animate-spin" size={64} color="#f0a500" />
          <h3 style={{ marginTop: "24px", fontSize: "20px", fontWeight: "700" }}>AI Analysis in Progress</h3>
          <p style={{ color: "rgba(255,255,255,0.5)", marginTop: "8px" }}>AI is analyzing your documents... (30-60 seconds)</p>
        </div>
      ) : (
        <div style={STYLES.grid}>
          {docTypes.map((doc) => (
            <DocumentCard 
              key={doc.type}
              type={doc.type}
              description={doc.description}
              isOptional={!doc.mandatory}
              file={uploads.find(u => u.docType === doc.type)?.file}
              onUpload={handleFileUpload}
              onRemove={handleFileRemove}
            />
          ))}
        </div>
      )}

      <div style={STYLES.footer}>
        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "14px", fontWeight: "500" }}>
          {uploads.length} of {docTypes.length} files uploaded
        </div>
        
        <button 
          style={{ ...STYLES.button, opacity: (!isMandatoryUploaded() || isUploading) ? 0.5 : 1 }}
          onClick={handleProceed}
          disabled={!isMandatoryUploaded() || isUploading}
        >
          {isUploading ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              Processing...
            </>
          ) : (
            <>
              Confirm & Extract
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default Stage2_Upload;
