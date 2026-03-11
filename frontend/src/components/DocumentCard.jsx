import React, { useRef } from 'react';
import { Upload, X, CheckCircle, FileText } from 'lucide-react';

const DocumentCard = ({ type, description, isOptional, file, onUpload, onRemove, icon }) => {
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
      className={`glass-card rounded-xl p-6 flex flex-col gap-4 border-2 border-dashed transition-all cursor-pointer group relative ${
        file ? 'border-primary/40 bg-primary/5' : 'border-white/10 hover:border-primary/50'
      }`}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={() => !file && fileInputRef.current?.click()}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold text-lg">{type}</h3>
        {file ? (
          <span className="material-symbols-outlined text-green-500 fill-1">check_circle</span>
        ) : (
          <span className="material-symbols-outlined text-slate-500 group-hover:text-primary transition-colors">
            {icon || 'upload_file'}
          </span>
        )}
      </div>

      <div className="flex flex-col items-center justify-center py-4 gap-2">
        {file ? (
          <div className="w-full">
            <div className="w-full bg-slate-900/50 rounded-lg p-4 flex items-center gap-3 border border-white/10 mb-4">
              <span className="material-symbols-outlined text-primary">description</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium truncate">{file.name}</p>
                <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB • Uploaded</p>
              </div>
              <button 
                className="p-1 hover:bg-white/10 rounded-full transition-colors"
                onClick={(e) => { e.stopPropagation(); onRemove(type); }}
              >
                <span className="material-symbols-outlined text-slate-400 text-sm">close</span>
              </button>
            </div>
            <button 
              className="w-full text-primary hover:text-primary/80 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-1 transition-colors"
              onClick={(e) => { e.stopPropagation(); onRemove(type); }}
            >
              <span className="material-symbols-outlined text-sm">delete</span> Remove
            </button>
          </div>
        ) : (
          <>
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-2">
              <span className="material-symbols-outlined text-primary">add</span>
            </div>
            <p className="text-sm text-slate-300 font-medium">Click or drag to upload</p>
            <p className="text-xs text-slate-500">PDF, XLSX up to 10MB</p>
          </>
        )}
      </div>

      {isOptional && !file && (
        <div className="absolute top-2 right-2 opacity-40">
           <p className="text-[10px] text-slate-600 font-medium uppercase tracking-tighter">Optional Document</p>
        </div>
      )}

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
