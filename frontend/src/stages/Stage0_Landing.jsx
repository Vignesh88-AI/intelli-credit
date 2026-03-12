import React from 'react';
import { Shield, Search, FileText, ArrowRight, Zap } from 'lucide-react';

const STYLES = {
  container: {
    minHeight: "100vh",
    background: "radial-gradient(circle at center, #1a2a44 0%, #0a1628 100%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 20px 60px 20px", // Increased bottom padding
    position: "relative",
    overflow: "hidden",
    textAlign: "center",
  },
  animatedBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "url('https://www.transparenttextures.com/patterns/carbon-fibre.png')",
    opacity: 0.1,
    zIndex: 0,
  },
  glow: {
    position: "absolute",
    width: "600px",
    height: "600px",
    background: "rgba(240, 165, 0, 0.05)",
    filter: "blur(100px)",
    borderRadius: "50%",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    zIndex: 0,
  },
  content: {
    position: "relative",
    zIndex: 1,
    maxWidth: "1000px",
    width: "100%",
  },
  logo: {
    fontSize: "48px",
    fontWeight: "900",
    color: "#f0a500",
    letterSpacing: "4px",
    marginBottom: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    textShadow: "0 0 20px rgba(240, 165, 0, 0.3)",
  },
  tagline: {
    fontSize: "36px",
    fontWeight: "800",
    color: "white",
    marginBottom: "16px",
    lineHeight: "1.2",
  },
  subtitle: {
    fontSize: "18px",
    color: "rgba(255, 255, 255, 0.6)",
    marginBottom: "48px",
    maxWidth: "700px",
    margin: "0 auto 48px auto",
    lineHeight: "1.6",
  },
  cardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "24px",
    marginBottom: "80px", // Increased spacing before buttons
    width: "100%",
  },
  card: {
    background: "rgba(255, 255, 255, 0.03)",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "20px",
    padding: "32px",
    transition: "transform 0.3s ease, border-color 0.3s ease",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
  },
  cardIcon: {
    width: "48px",
    height: "48px",
    background: "rgba(240, 165, 0, 0.1)",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#f0a500",
    marginBottom: "20px",
  },
  cardTitle: {
    fontSize: "18px",
    fontWeight: "700",
    color: "white",
    marginBottom: "12px",
  },
  cardText: {
    fontSize: "14px",
    color: "rgba(255, 255, 255, 0.5)",
    lineHeight: "1.5",
  },
  button: {
    background: "#f0a500",
    color: "#0a1628",
    padding: "20px 48px",
    borderRadius: "50px",
    fontSize: "18px",
    fontWeight: "800",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    transition: "all 0.3s ease",
    boxShadow: "0 10px 30px rgba(240, 165, 0, 0.2)",
    marginBottom: "32px",
  },
  footer: {
    fontSize: "14px",
    color: "rgba(255, 255, 255, 0.4)",
    fontWeight: "500",
    letterSpacing: "1px",
    textTransform: "uppercase",
  }
};

const Stage0_Landing = ({ onStart, onResearch }) => {
  return (
    <div style={STYLES.container}>
      <div style={STYLES.animatedBg} />
      <div style={STYLES.glow} />
      
      <div style={STYLES.content}>
        <div style={STYLES.logo}>
          <Zap size={40} fill="#f0a500" /> INTELLI-CREDIT
        </div>
        
        <h1 style={STYLES.tagline}>AI-Powered Corporate Credit Appraisal</h1>
        <p style={STYLES.subtitle}>
          From raw financial documents to a complete 
          Credit Appraisal Memo in under 5 minutes.
        </p>
        
        <div style={STYLES.cardGrid}>
          <div style={STYLES.card}>
            <div style={STYLES.cardIcon}><Shield size={24} /></div>
            <h3 style={STYLES.cardTitle}>AI Document Analysis</h3>
            <p style={STYLES.cardText}>Extract financial data instantly with high precision transformer models.</p>
          </div>
          
          <div style={STYLES.card}>
            <div style={STYLES.cardIcon}><Search size={24} /></div>
            <h3 style={STYLES.cardTitle}>360° Research</h3>
            <p style={STYLES.cardText}>Real-time web intelligence on company, promoters, and sector outlook.</p>
          </div>
          
          <div style={STYLES.card}>
            <div style={STYLES.cardIcon}><FileText size={24} /></div>
            <h3 style={STYLES.cardTitle}>CAM Report</h3>
            <p style={STYLES.cardText}>Automated bank-grade credit memo generation in one click.</p>
          </div>
        </div>
        
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", marginTop: "40px" }}>
          <button 
            style={STYLES.button} 
            onClick={onStart}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "translateY(-5px)";
              e.currentTarget.style.boxShadow = "0 15px 40px rgba(240, 165, 0, 0.4)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 10px 30px rgba(240, 165, 0, 0.2)";
            }}
          >
            Start Full Appraisal <ArrowRight size={22} />
          </button>

          <button 
            onClick={onResearch}
            style={{
              background: "transparent",
              color: "#f0a500",
              border: "2px solid #f0a500",
              padding: "20px 48px", // Matched with main button
              borderRadius: "50px",
              fontSize: "18px", // Matched with main button
              fontWeight: "700",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              transition: "all 0.3s ease",
            }}
            onMouseOver={(e) => e.currentTarget.style.background = "rgba(240, 165, 0, 0.1)"}
            onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
          >
            🔍 Quick Company Research
          </button>
        </div>
        
        <div style={STYLES.footer}>
          Trusted by credit analysts | Powered by Claude AI
        </div>
      </div>
    </div>
  );
};

export default Stage0_Landing;
