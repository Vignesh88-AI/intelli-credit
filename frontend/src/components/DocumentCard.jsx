import React, { useRef } from 'react';
import { Upload, X, CheckCircle, FileText } from 'lucide-react';

const DocumentCard = ({ type, description, isOptional, file, onUpload, onRemove }) => {
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) onUpload(type, droppedFile);
  };

  const handleFileInput = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) onUpload(type, selectedFile);
  };

  return (
    <div 
      className={`glass-card p-4 border-2 border-dashed transition-all duration-300 relative ${
        file ? 'border-[#00c853]' : 'border-white/10 hover:border-[#f0a500]'
      }`}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {isOptional && (
        <span className="absolute top-2 right-2 text-[10px] bg-[#30363d] text-gray-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
          Optional
        </span>
      )}
      
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-lg ${file ? 'bg-[#00c853]/20 text-[#00c853]' : 'bg-white/5 text-gray-400'}`}>
          {file ? <CheckCircle size={24} /> : <FileText size={24} />}
        </div>
        
        <div className="flex-1">
          <h4 className="text-sm font-bold">{type}</h4>
          <p className="text-xs text-secondary mt-1">{description}</p>
          
          {file ? (
            <div className="mt-3 flex items-center justify-between bg-[#0d1117] p-2 rounded border border-[#30363d]">
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-medium truncate">{file.name}</span>
                <span className="text-[10px] text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
              </div>
              <button 
                onClick={() => onRemove(type)}
                className="p-1 hover:bg-red-500/20 text-gray-400 hover:text-red-500 rounded transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="mt-3 w-full py-2 flex items-center justify-center gap-2 bg-[#161b22] hover:bg-[#21262d] text-xs font-semibold rounded border border-[#30363d] transition-colors"
            >
              <Upload size={14} /> Browse Files
            </button>
          )}
        </div>
      </div>
      
      <input 
        type="file" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileInput}
        accept=".pdf,.xlsx,.jpg,.png"
      />
    </div>
  );
};

export default DocumentCard;
