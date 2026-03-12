import { useState, useEffect, useRef } from "react";

const TAGLINES = [
  "From raw documents to credit decisions in 5 minutes.",
  "AI-powered. India-specific. Bank-grade.",
  "Smarter lending decisions. Zero manual effort.",
  "The future of corporate credit appraisal.",
];

const STATS = [
  { val: "5 min", label: "Full Appraisal" },
  { val: "5 Cs", label: "Credit Framework" },
  { val: "360°", label: "Web Research" },
  { val: "100%", label: "Explainable AI" },
];

const FEATURES = [
  { icon: "🏢", title: "Entity Onboarding", desc: "CIN, PAN, sector validation with real-time MCA lookup" },
  { icon: "📄", title: "Document Intelligence", desc: "ALM, Shareholding, Borrowing, Annual Reports, Portfolio" },
  { icon: "🤖", title: "AI Extraction + Human Loop", desc: "Claude extracts 10+ financial metrics. You approve." },
  { icon: "📊", title: "Credit Report + CAM", desc: "APPROVE/REJECT verdict with full PDF CAM download" },
  { icon: "🔍", title: "Company Research Engine", desc: "Type any company — live web research in seconds" },
  { icon: "⚡", title: "Early Warning Signals", desc: "GSTR reconciliation, NCLT flags, promoter risk alerts" },
];
const Stage0_Landing = ({ onStart, onResearch }) => {
  const [taglineIdx, setTaglineIdx] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [typing, setTyping] = useState(true);

  useEffect(() => {
    const text = TAGLINES[taglineIdx];
    let i = 0; setDisplayed(""); setTyping(true);
    const t = setInterval(() => { if (i < text.length) setDisplayed(text.slice(0, ++i)); else { setTyping(false); clearInterval(t); } }, 42);
    return () => clearInterval(t);
  }, [taglineIdx]);

  useEffect(() => {
    if (!typing) { const t = setTimeout(() => setTaglineIdx(i => (i + 1) % TAGLINES.length), 2200); return () => clearTimeout(t); }
  }, [typing]);

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(ellipse at 20% 20%, #0d2040 0%, #060d1a 55%, #070e1c 100%)", fontFamily: "'Segoe UI', system-ui, sans-serif", color: "#e2e8f0", overflowX: "hidden" }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(36px)}to{opacity:1;transform:translateY(0)} }
        @keyframes glow { 0%,100%{text-shadow:0 0 20px #f0a50055}50%{text-shadow:0 0 60px #f0a500bb,0 0 100px #f0a50033} }
        @keyframes pulse { 0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.6);opacity:0.6} }
        @keyframes float { 0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)} }
        .feat:hover{transform:translateY(-6px)!important;border-color:#f0a500!important;box-shadow:0 16px 40px #f0a50022!important}
        .pill:hover{background:#f0a50018!important;border-color:#f0a500!important;color:#f0a500!important}
        .tech:hover{transform:translateY(-4px)!important;border-color:#f0a500!important}
        .step:hover{transform:translateY(-4px)!important}
      `}</style>

      {/* Navbar */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 200, height: "60px", padding: "0 48px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#060d1acc", backdropFilter: "blur(16px)", borderBottom: "1px solid #1e3a5f55" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "22px" }}>⚡</span>
          <span style={{ fontWeight: "900", fontSize: "16px", color: "#f0a500", letterSpacing: "3px" }}>INTELLI-CREDIT</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#22c55e", animation: "pulse 2s infinite" }} />
          <span style={{ fontSize: "11px", color: "#22c55e", letterSpacing: "2px" }}>LIVE</span>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "100px 32px 60px", textAlign: "center" }}>
        <h1 style={{ animation: "fadeUp 0.7s ease 0.25s both", fontSize: "clamp(56px,9vw,100px)", fontWeight: "900", lineHeight: 0.95, marginBottom: "16px", letterSpacing: "-2px" }}>
          <span style={{ color: "#fff" }}>INTELLI</span>
          <span style={{ color: "#f0a500", animation: "glow 3s infinite", display: "inline-block" }}>—</span>
          <br />
          <span style={{ color: "#fff" }}>CREDIT</span>
        </h1>
        <div style={{ animation: "fadeUp 0.7s ease 0.4s both", fontSize: "13px", color: "#f0a500", letterSpacing: "5px", marginBottom: "28px", fontWeight: "600" }}>
          AI-POWERED CORPORATE CREDIT APPRAISAL ENGINE
        </div>
        <div style={{ animation: "fadeUp 0.7s ease 0.55s both", height: "28px", fontSize: "16px", color: "#94a3b8", marginBottom: "48px" }}>
          {displayed}<span style={{ color: "#f0a500", opacity: typing ? 1 : 0, transition: "opacity 0.3s" }}>|</span>
        </div>
        <div style={{ animation: "fadeUp 0.7s ease 0.7s both", display: "flex", gap: "56px", marginBottom: "56px", flexWrap: "wrap", justifyContent: "center" }}>
          {STATS.map((s, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ fontSize: "36px", fontWeight: "900", color: "#f0a500", lineHeight: 1 }}>{s.val}</div>
              <div style={{ fontSize: "11px", color: "#475569", letterSpacing: "2px", marginTop: "6px" }}>{s.label}</div>
            </div>
          ))}
        </div>
        <div style={{ animation: "fadeUp 0.7s ease 0.85s both", display: "flex", flexDirection: "column", alignItems: "center", gap: "14px" }}>
          <button 
            data-hover 
            onClick={onStart}
            style={{ padding: "18px 56px", background: "linear-gradient(135deg,#f0a500,#d97706)", color: "#0a1628", border: "none", borderRadius: "50px", fontSize: "16px", fontWeight: "800", cursor: "pointer", boxShadow: "0 4px 30px #f0a50055", transition: "all 0.3s" }}
            onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.05)"; e.currentTarget.style.boxShadow = "0 8px 50px #f0a50077"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 4px 30px #f0a50055"; }}>
            🚀 Start Full Appraisal
          </button>
          <button 
            data-hover 
            onClick={onResearch}
            style={{ 
              padding: "16px 48px", 
              background: "transparent", 
              color: "#f0a500", 
              border: "2px solid #f0a500", 
              borderRadius: "50px", 
              fontSize: "15px", 
              fontWeight: "700", 
              cursor: "pointer", 
              transition: "all 0.3s" 
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#f0a50011"; e.currentTarget.style.borderColor = "#f0a500"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "#f0a500"; }}>
            🔍 Quick Company Research
          </button>
        </div>
        <div style={{ marginTop: "56px", animation: "float 2.5s ease infinite", color: "#334155", fontSize: "11px", letterSpacing: "3px" }}>↓ SCROLL</div>
      </section>

      {/* Pipeline Section */}
      <section style={{ padding: "80px 48px", maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "56px" }}>
          <div style={{ fontSize: "11px", color: "#f0a500", letterSpacing: "4px", marginBottom: "10px" }}>THE PIPELINE</div>
          <h2 style={{ fontSize: "40px", fontWeight: "900" }}>4-Stage Credit Intelligence</h2>
          <p style={{ color: "#475569", marginTop: "10px" }}>From entity onboarding to bank-grade CAM report</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: "8px" }}>
          {[
            { num: "01", title: "Entity Onboarding", desc: "CIN · PAN · Sector", color: "#f0a500" },
            { num: "02", title: "Document Upload", desc: "5 financial doc types", color: "#60a5fa" },
            { num: "03", title: "AI Extraction", desc: "Claude + Human loop", color: "#a78bfa" },
            { num: "04", title: "Credit Report", desc: "APPROVE / REJECT", color: "#34d399" },
          ].map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center" }}>
              <div className="step" data-hover style={{ textAlign: "center", padding: "24px 20px", background: "#0a1628", border: `1px solid ${s.color}33`, borderRadius: "14px", minWidth: "155px", transition: "all 0.3s" }}>
                <div style={{ fontSize: "11px", color: s.color, letterSpacing: "2px", marginBottom: "8px" }}>{s.num}</div>
                <div style={{ fontWeight: "800", fontSize: "14px", marginBottom: "4px" }}>{s.title}</div>
                <div style={{ fontSize: "11px", color: "#475569" }}>{s.desc}</div>
              </div>
              {i < 3 && <div style={{ width: "36px", height: "1px", background: `linear-gradient(90deg,${["#f0a500","#60a5fa","#a78bfa"][i]}88,#1e3a5f)`, flexShrink: 0 }} />}
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section style={{ padding: "60px 48px", maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <div style={{ fontSize: "11px", color: "#f0a500", letterSpacing: "4px", marginBottom: "10px" }}>CAPABILITIES</div>
          <h2 style={{ fontSize: "38px", fontWeight: "900" }}>Everything a Credit Manager Needs</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "18px" }}>
          {FEATURES.map((f, i) => (
            <div key={i} className="feat" data-hover style={{ background: "#0a1628", border: "1px solid #1e3a5f", borderRadius: "16px", padding: "28px", transition: "all 0.3s" }}>
              <div style={{ fontSize: "30px", marginBottom: "12px" }}>{f.icon}</div>
              <div style={{ fontWeight: "800", fontSize: "15px", marginBottom: "8px" }}>{f.title}</div>
              <div style={{ fontSize: "13px", color: "#475569", lineHeight: "1.6" }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* India Specific Section */}
      <section style={{ padding: "80px 48px", background: "#0a162866", borderTop: "1px solid #1e3a5f" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto", textAlign: "center" }}>
          <div style={{ fontSize: "11px", color: "#f0a500", letterSpacing: "4px", marginBottom: "10px" }}>BUILT FOR INDIA</div>
          <h2 style={{ fontSize: "36px", fontWeight: "900", marginBottom: "40px" }}>India-Specific Intelligence</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px" }}>
            {["GSTR-2A vs 3B Reconciliation","CIBIL Commercial Score Signals","MCA & NCLT Filing Detection","RBI Regulatory Compliance","Reports in Crores & Lakhs","Five Cs per RBI Guidelines"].map((item,i) => (
              <div key={i} className="pill" data-hover style={{ padding: "14px 18px", background: "#0a1628", border: "1px solid #1e3a5f", borderRadius: "10px", fontSize: "13px", color: "#94a3b8", display: "flex", alignItems: "center", gap: "8px", transition: "all 0.3s", textAlign: "left" }}>
                <span style={{ color: "#f0a500", fontWeight: "700" }}>✓</span> {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack Section */}
      <section style={{ padding: "80px 48px", maxWidth: "900px", margin: "0 auto", textAlign: "center" }}>
        <div style={{ fontSize: "11px", color: "#f0a500", letterSpacing: "4px", marginBottom: "10px" }}>POWERED BY</div>
        <h2 style={{ fontSize: "36px", fontWeight: "900", marginBottom: "40px" }}>Best-in-Class Tech Stack</h2>
        <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", justifyContent: "center" }}>
          {[
            { name: "Claude Sonnet", role: "AI Engine", color: "#f0a500" },
            { name: "FastAPI", role: "Backend", color: "#60a5fa" },
            { name: "React + Vite", role: "Frontend", color: "#34d399" },
            { name: "pdfplumber", role: "PDF Parsing", color: "#a78bfa" },
            { name: "ReportLab", role: "CAM PDF", color: "#fb923c" },
            { name: "Render + Vercel", role: "Cloud", color: "#38bdf8" },
          ].map((t,i) => (
            <div key={i} className="tech" data-hover style={{ padding: "16px 24px", background: "#0a1628", border: `1px solid ${t.color}44`, borderRadius: "12px", minWidth: "140px", transition: "all 0.3s" }}>
              <div style={{ fontWeight: "800", color: t.color, marginBottom: "4px", fontSize: "14px" }}>{t.name}</div>
              <div style={{ fontSize: "11px", color: "#475569" }}>{t.role}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA Section */}
      <section style={{ padding: "100px 48px", textAlign: "center", borderTop: "1px solid #1e3a5f", background: "radial-gradient(ellipse at center,#0d2040 0%,#060d1a 70%)" }}>
        <div style={{ fontSize: "11px", color: "#f0a500", letterSpacing: "4px", marginBottom: "16px" }}>READY TO APPRAISE?</div>
        <h2 style={{ fontSize: "clamp(36px,6vw,60px)", fontWeight: "900", marginBottom: "16px", animation: "glow 3s infinite" }}>
          3 Weeks → <span style={{ color: "#f0a500" }}>5 Minutes</span>
        </h2>
        <p style={{ color: "#475569", fontSize: "17px", marginBottom: "48px" }}>From manual chaos to AI-powered credit intelligence.</p>
        <button 
          data-hover 
          onClick={onStart}
          style={{ padding: "20px 72px", background: "linear-gradient(135deg,#f0a500,#d97706)", color: "#0a1628", border: "none", borderRadius: "50px", fontSize: "18px", fontWeight: "900", cursor: "pointer", boxShadow: "0 4px 50px #f0a50055", transition: "all 0.3s", letterSpacing: "2px" }}
          onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.05)"; e.currentTarget.style.boxShadow = "0 8px 60px #f0a50088"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 4px 50px #f0a50055"; }}>
          ⚡ LAUNCH INTELLI-CREDIT
        </button>
      </section>
    </div>
  );
};

export default Stage0_Landing;
