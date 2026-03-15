import React, { useRef } from 'react';
import { Upload, X, CheckCircle, FileText, Trash2 } from 'lucide-react';

const STYLES = {
  card: {
    background: "rgba(255,255,255,0.05)",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "16px",
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    transition: "all 0.3s ease",
    cursor: "pointer",
    position: "relative",
    height: "100%",
  },
  cardActive: {
    borderColor: "rgba(240, 165, 0, 0.4)",
    background: "rgba(240, 165, 0, 0.05)",
  },
  title: {
    fontSize: "18px",
    fontWeight: "700",
    color: "white",
    margin: 0,
  },
  description: {
    fontSize: "12px",
    color: "rgba(255,255,255,0.5)",
    lineHeight: "1.4",
  },
  uploadZone: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    borderRadius: "12px",
    background: "rgba(255,255,255,0.03)",
    border: "1px dashed rgba(255,255,255,0.2)",
    gap: "8px",
  },
  fileInfo: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px",
    background: "rgba(10, 22, 40, 0.4)",
    borderRadius: "8px",
    border: "1px solid rgba(255,255,255,0.1)",
    width: "100%",
  },
  fileName: {
    fontSize: "13px",
    fontWeight: "500",
    color: "white",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    flex: 1,
  },
  removeBtn: {
    background: "transparent",
    border: "none",
    color: "#ff4d4d",
    cursor: "pointer",
    padding: "4px",
    display: "flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "12px",
    fontWeight: "600",
    marginTop: "8px",
    justifyContent: "center",
  }
};

const DocumentCard = ({ type, description, isOptional, file, onUpload, onRemove }) => {
  const fileInputRef = useRef(null);
  const [isHovered, setIsHovered] = React.useState(false);

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
      style={{
        ...STYLES.card,
        ...(file ? STYLES.cardActive : {}),
        ...(isHovered ? {
          transform: "translateY(-4px)",
          boxShadow: "0 8px 30px rgba(240, 165, 0, 0.2)",
          borderColor: "#f0a500",
        } : {})
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={() => !file && fileInputRef.current?.click()}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <h3 style={STYLES.title}>{type}</h3>
        {file ? (
          <CheckCircle size={20} color="#22c55e" />
        ) : (
          <Upload size={20} color="rgba(255,255,255,0.3)" />
        )}
      </div>

      <p style={STYLES.description}>{description}</p>

      <div style={STYLES.uploadZone}>
        {file ? (
          <div style={{ width: "100%" }}>
            <div style={STYLES.fileInfo}>
              <FileText size={18} color="#f0a500" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={STYLES.fileName}>{file.name}</div>
                <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)" }}>
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </div>
              </div>
            </div>
            <button 
              style={STYLES.removeBtn}
              onClick={(e) => { e.stopPropagation(); onRemove(type); }}
            >
              <Trash2 size={14} /> Remove
            </button>
          </div>
        ) : (
          <>
            <div style={{ 
              width: "40px", 
              height: "40px", 
              borderRadius: "50%", 
              background: "rgba(255,255,255,0.05)", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center" 
            }}>
              <Upload size={18} color="#f0a500" />
            </div>
            <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)", fontWeight: "500" }}>
              Upload File
            </span>
            <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)" }}>
              PDF or XLSX up to 100MB
            </span>
          </>
        )}
      </div>

      {isOptional && !file && (
        <div style={{ position: "absolute", bottom: "8px", right: "12px" }}>
          <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "1px" }}>
            Optional
          </span>
        </div>
      )}

      <input 
        type="file" 
        className="hidden" 
        style={{ display: "none" }}
        ref={fileInputRef} 
        onChange={handleFileInput}
        accept=".pdf,.xlsx"
      />
    </div>
  );
};

export default DocumentCard;
