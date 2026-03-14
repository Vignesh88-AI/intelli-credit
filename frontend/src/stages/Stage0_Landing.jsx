import { useState, useEffect, useRef } from "react";

const TAGLINES = [
  "Corporate credit intelligence. Redefined.",
  "From documents to decisions in 5 minutes.",
  "AI-powered. India-specific. Bank-grade.",
  "Smarter lending. Zero manual effort.",
];

const STATS = [
  { val: "5 min", label: "Full Appraisal" },
  { val: "5 Cs", label: "Credit Framework" },
  { val: "360", label: "Web Research" },
  { val: "3 Modes", label: "Full / Quick / Research" },
];

const FEATURES = [
  { num: "01", title: "Entity Onboarding", desc: "CIN and PAN validation with sector classification and real-time MCA lookup." },
  { num: "02", title: "Document Intelligence", desc: "ALM statements, shareholding patterns, borrowing profiles, annual reports, portfolio cuts." },
  { num: "03", title: "AI Extraction", desc: "Claude extracts over 10 financial metrics with human-in-loop approval at every step." },
  { num: "04", title: "Credit Report", desc: "Full CAM report with APPROVE or REJECT verdict, risk flags, and PDF download." },
  { num: "05", title: "Research Engine", desc: "Type any company name and receive live web research with financial intelligence." },
  { num: "06", title: "Early Warning Signals", desc: "GSTR reconciliation gaps, NCLT filing detection, promoter pledge alerts." },
];

export default function Stage0_Landing({ onStart, onResearch, onQuick }) {
  const [taglineIdx, setTaglineIdx] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [typing, setTyping] = useState(true);
  const [visible, setVisible] = useState(false);
  const lineRef = useRef(null);

  useEffect(() => { setTimeout(() => setVisible(true), 100); }, []);

  useEffect(() => {
    const text = TAGLINES[taglineIdx];
    let i = 0; setDisplayed(""); setTyping(true);
    const t = setInterval(() => {
      if (i < text.length) setDisplayed(text.slice(0, ++i));
      else { setTyping(false); clearInterval(t); }
    }, 38);
    return () => clearInterval(t);
  }, [taglineIdx]);

  useEffect(() => {
    if (!typing) {
      const t = setTimeout(() => setTaglineIdx(i => (i + 1) % TAGLINES.length), 2500);
      return () => clearTimeout(t);
    }
  }, [typing]);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#080c14",
      fontFamily: "'Cormorant Garamond', Georgia, serif",
      color: "#e8e0d0",
      overflowX: "hidden",
      position: "relative",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&family=Rajdhani:wght@300;400;500;600;700&display=swap');

        :root {
          --gold: #c9a84c;
          --gold-light: #e8c97a;
          --gold-dim: #8a6f2e;
          --bg: #080c14;
          --bg2: #0d1320;
          --border: #1a2236;
          --text: #e8e0d0;
          --muted: #4a5568;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(32px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes lineExpand {
          from { width: 0; }
          to { width: 100%; }
        }
        @keyframes pulseGold {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes rotateRing {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }

        .nav-link {
          color: var(--muted);
          font-family: 'Rajdhani', sans-serif;
          font-size: 13px;
          letter-spacing: 2px;
          text-transform: uppercase;
          cursor: pointer;
          transition: color 0.3s ease;
          text-decoration: none;
        }
        .nav-link:hover { color: var(--gold); }

        .feat-card {
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: 2px;
          padding: 36px 32px;
          transition: all 0.4s ease;
          position: relative;
          overflow: hidden;
        }
        .feat-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0;
          width: 3px; height: 0;
          background: var(--gold);
          transition: height 0.4s ease;
        }
        .feat-card:hover {
          border-color: #2a3550;
          transform: translateY(-4px);
          box-shadow: 0 20px 60px rgba(0,0,0,0.4);
        }
        .feat-card:hover::before { height: 100%; }

        .india-pill {
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: 2px;
          padding: 14px 20px;
          font-family: 'Rajdhani', sans-serif;
          font-size: 13px;
          letter-spacing: 1px;
          color: #6b7fa3;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: all 0.3s ease;
        }
        .india-pill:hover {
          border-color: var(--gold-dim);
          color: var(--gold-light);
        }

        .tech-card {
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: 2px;
          padding: 20px 28px;
          transition: all 0.3s ease;
          text-align: center;
        }
        .tech-card:hover {
          border-color: var(--gold-dim);
          transform: translateY(-3px);
        }

        .btn-primary {
          background: transparent;
          border: 1px solid var(--gold);
          color: var(--gold);
          font-family: 'Rajdhani', sans-serif;
          font-size: 13px;
          letter-spacing: 3px;
          text-transform: uppercase;
          padding: 18px 56px;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        .btn-primary::before {
          content: '';
          position: absolute;
          inset: 0;
          background: var(--gold);
          transform: translateX(-100%);
          transition: transform 0.3s ease;
          z-index: 0;
        }
        .btn-primary:hover::before { transform: translateX(0); }
        .btn-primary:hover { color: #080c14; }
        .btn-primary span { position: relative; z-index: 1; }

        .btn-secondary {
          background: transparent;
          border: 1px solid var(--border);
          color: #6b7fa3;
          font-family: 'Rajdhani', sans-serif;
          font-size: 13px;
          letter-spacing: 3px;
          text-transform: uppercase;
          padding: 18px 56px;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .btn-secondary:hover {
          border-color: #2a3550;
          color: var(--text);
        }

        .btn-quick {
          padding: 14px 32px;
          font-family: 'Rajdhani', sans-serif;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.1em;
          background: transparent;
          color: #C8960C;
          border: 1px solid #C8960C;
          cursor: pointer;
          transition: all 0.2s;
          text-transform: uppercase;
        }
        .btn-quick:hover {
          background: rgba(200, 150, 12, 0.1);
        }

        .step-node {
          width: 48px; height: 48px;
          border: 1px solid var(--gold-dim);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Rajdhani', sans-serif;
          font-size: 13px;
          color: var(--gold);
          letter-spacing: 1px;
          flex-shrink: 0;
          transition: all 0.3s;
        }
        .step-row:hover .step-node {
          background: var(--gold);
          color: #080c14;
          border-color: var(--gold);
        }

        .grid-bg {
          background-image:
            linear-gradient(rgba(201,168,76,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(201,168,76,0.03) 1px, transparent 1px);
          background-size: 60px 60px;
        }

        .shimmer-text {
          background: linear-gradient(90deg, var(--gold) 0%, var(--gold-light) 40%, var(--gold) 60%, var(--gold-light) 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 4s linear infinite;
        }

        .section-label {
          font-family: 'Rajdhani', sans-serif;
          font-size: 11px;
          letter-spacing: 4px;
          text-transform: uppercase;
          color: var(--gold-dim);
          margin-bottom: 16px;
        }

        .divider {
          width: 40px;
          height: 1px;
          background: var(--gold);
          margin: 20px 0;
        }
      `}</style>

      {/* Background grid */}
      <div className="grid-bg" style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }} />

      {/* Ambient glow */}
      <div style={{
        position: "fixed", top: "20%", left: "50%", transform: "translateX(-50%)",
        width: "600px", height: "600px", borderRadius: "50%",
        background: "radial-gradient(circle, rgba(201,168,76,0.04) 0%, transparent 70%)",
        pointerEvents: "none", zIndex: 0,
      }} />

      {/* NAVBAR */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 200,
        height: "64px", padding: "0 56px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "rgba(8,12,20,0.92)", backdropFilter: "blur(20px)",
        borderBottom: "1px solid #1a2236",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "28px", height: "28px", border: "1px solid #c9a84c",
            display: "flex", alignItems: "center", justifyContent: "center",
            position: "relative",
          }}>
            <div style={{ width: "10px", height: "10px", background: "#c9a84c", transform: "rotate(45deg)" }} />
          </div>
          <span style={{
            fontFamily: "'Rajdhani', sans-serif", fontWeight: "700",
            fontSize: "18px", color: "#e8e0d0", letterSpacing: "4px",
          }}>VERIDEX</span>
        </div>

        <div style={{ display: "flex", gap: "36px" }}>
          {["Platform", "Pipeline", "Research", "India"].map(n => (
            <span key={n} className="nav-link">{n}</span>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{
            width: "6px", height: "6px", borderRadius: "50%",
            background: "#22c55e", animation: "pulseGold 2s infinite",
          }} />
          <span style={{
            fontFamily: "'Rajdhani', sans-serif", fontSize: "11px",
            color: "#22c55e", letterSpacing: "3px",
          }}>SYSTEM ONLINE</span>
        </div>
      </nav>

      {/* HERO */}
      <section style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "120px 56px 80px", textAlign: "center",
        position: "relative", zIndex: 1,
      }}>

        {/* Top label */}
        <div className="section-label" style={{
          animation: "fadeUp 0.8s ease 0.1s both",
          marginBottom: "32px",
        }}>
          Corporate Credit Intelligence Platform
        </div>

        {/* Main title */}
        <h1 style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: "clamp(72px, 11vw, 140px)",
          fontWeight: "300",
          lineHeight: 0.9,
          letterSpacing: "-2px",
          marginBottom: "24px",
          animation: "fadeUp 0.8s ease 0.25s both",
        }}>
          <span className="shimmer-text">VERIDEX</span>
        </h1>

        {/* Thin gold line */}
        <div style={{
          width: "1px", height: "48px",
          background: "linear-gradient(to bottom, #c9a84c, transparent)",
          margin: "0 auto 32px",
          animation: "fadeIn 1s ease 0.5s both",
        }} />

        {/* Subtitle */}
        <p style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: "18px", fontWeight: "300",
          color: "#6b7fa3", letterSpacing: "1px",
          marginBottom: "16px",
          animation: "fadeUp 0.8s ease 0.6s both",
        }}>
          AI-Powered Corporate Credit Appraisal Engine
        </p>

        {/* Typewriter */}
        <div style={{
          height: "28px", fontSize: "15px",
          fontFamily: "'Rajdhani', sans-serif",
          fontWeight: "400", letterSpacing: "1px",
          color: "#c9a84c", marginBottom: "56px",
          animation: "fadeUp 0.8s ease 0.75s both",
        }}>
          {displayed}
          <span style={{ opacity: typing ? 1 : 0, transition: "opacity 0.3s" }}>_</span>
        </div>

        {/* Stats */}
        <div style={{
          display: "flex", gap: "0",
          marginBottom: "64px",
          animation: "fadeUp 0.8s ease 0.9s both",
          border: "1px solid #1a2236",
        }}>
          {STATS.map((s, i) => (
            <div key={i} style={{
              padding: "24px 48px", textAlign: "center",
              borderRight: i < STATS.length - 1 ? "1px solid #1a2236" : "none",
            }}>
              <div style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "32px", fontWeight: "600",
                color: "#c9a84c", lineHeight: 1,
              }}>{s.val}</div>
              <div style={{
                fontFamily: "'Rajdhani', sans-serif",
                fontSize: "11px", color: "#4a5568",
                letterSpacing: "2px", marginTop: "6px",
              }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div style={{
          display: "flex", gap: "16px",
          animation: "fadeUp 0.8s ease 1.05s both",
          flexWrap: "wrap", justifyContent: "center",
        }}>
          <button className="btn-primary" onClick={onStart}>
            <span>BEGIN APPRAISAL</span>
          </button>
          <button className="btn-quick" onClick={onQuick}>
            <span>QUICK APPRAISAL</span>
          </button>
          <button className="btn-secondary" onClick={onResearch}>
            <span>RESEARCH ENGINE</span>
          </button>
        </div>

        {/* Scroll */}
        <div style={{
          position: "absolute", bottom: "36px", left: "50%",
          transform: "translateX(-50%)",
          animation: "float 3s ease infinite",
          fontFamily: "'Rajdhani', sans-serif",
          fontSize: "11px", color: "#2a3550", letterSpacing: "3px",
        }}>
          SCROLL
        </div>
      </section>

      {/* PIPELINE */}
      <section style={{ padding: "100px 56px", maxWidth: "1000px", margin: "0 auto", position: "relative", zIndex: 1 }}>
        <div style={{ marginBottom: "64px" }}>
          <div className="section-label">The Pipeline</div>
          <h2 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "clamp(36px, 4vw, 52px)", fontWeight: "300",
            color: "#e8e0d0", letterSpacing: "-1px",
          }}>
            Four stages. One decision.
          </h2>
          <div className="divider" />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
          {[
            { num: "01", title: "Entity Onboarding", desc: "CIN, PAN, sector classification", sub: "Real-time MCA validation" },
            { num: "02", title: "Document Upload", desc: "Five financial document types", sub: "ALM, Shareholding, Borrowing, Annual, Portfolio" },
            { num: "03", title: "AI Extraction", desc: "Claude intelligence with human approval", sub: "10+ metrics, editable, fully transparent" },
            { num: "04", title: "Credit Report", desc: "Full CAM with verdict", sub: "APPROVE / REJECT / REFER - with PDF download" },
          ].map((s, i) => (
            <div key={i} className="step-row" style={{
              display: "flex", alignItems: "flex-start", gap: "32px",
              padding: "32px 0",
              borderBottom: i < 3 ? "1px solid #1a2236" : "none",
              cursor: "default", transition: "all 0.3s",
            }}>
              <div className="step-node">{s.num}</div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: "22px", fontWeight: "500",
                  color: "#e8e0d0", marginBottom: "6px",
                }}>{s.title}</div>
                <div style={{
                  fontFamily: "'Rajdhani', sans-serif",
                  fontSize: "14px", color: "#6b7fa3",
                  letterSpacing: "1px", marginBottom: "4px",
                }}>{s.desc}</div>
                <div style={{
                  fontFamily: "'Rajdhani', sans-serif",
                  fontSize: "12px", color: "#2a3550", letterSpacing: "1px",
                }}>{s.sub}</div>
              </div>
              <div style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "64px", fontWeight: "300",
                color: "#1a2236", lineHeight: 1, userSelect: "none",
              }}>{s.num}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ padding: "100px 56px", background: "#0d1320", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div style={{ marginBottom: "64px" }}>
            <div className="section-label">Capabilities</div>
            <h2 style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "clamp(36px, 4vw, 52px)", fontWeight: "300",
              color: "#e8e0d0", letterSpacing: "-1px",
            }}>
              Everything a credit analyst needs.
            </h2>
            <div className="divider" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1px", background: "#1a2236" }}>
            {FEATURES.map((f, i) => (
              <div key={i} className="feat-card" style={{ borderRadius: 0, border: "none" }}>
                <div style={{
                  fontFamily: "'Rajdhani', sans-serif",
                  fontSize: "11px", color: "#c9a84c",
                  letterSpacing: "2px", marginBottom: "16px",
                }}>{f.num}</div>
                <div style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: "20px", fontWeight: "500",
                  color: "#e8e0d0", marginBottom: "12px",
                }}>{f.title}</div>
                <div style={{
                  fontFamily: "'Rajdhani', sans-serif",
                  fontSize: "14px", color: "#4a5568",
                  lineHeight: "1.7", letterSpacing: "0.5px",
                }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INDIA SPECIFIC */}
      <section style={{ padding: "100px 56px", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <div style={{ marginBottom: "64px" }}>
            <div className="section-label">Built for India</div>
            <h2 style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "clamp(36px, 4vw, 52px)", fontWeight: "300",
              color: "#e8e0d0", letterSpacing: "-1px",
            }}>
              India-specific intelligence.
            </h2>
            <div className="divider" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1px", background: "#1a2236" }}>
            {[
              "GSTR-2A vs 3B Reconciliation",
              "CIBIL Commercial Score Signals",
              "MCA and NCLT Filing Detection",
              "RBI Regulatory Compliance",
              "Reports in Crores and Lakhs",
              "Five Cs per RBI Guidelines",
            ].map((item, i) => (
              <div key={i} className="india-pill" style={{ borderRadius: 0, border: "none" }}>
                <div style={{ width: "4px", height: "4px", background: "#c9a84c", borderRadius: "50%", flexShrink: 0 }} />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TECH STACK */}
      <section style={{ padding: "100px 56px", background: "#0d1320", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: "900px", margin: "0 auto", textAlign: "center" }}>
          <div className="section-label" style={{ textAlign: "center" }}>Powered By</div>
          <h2 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "clamp(36px, 4vw, 52px)", fontWeight: "300",
            color: "#e8e0d0", letterSpacing: "-1px", marginBottom: "16px",
          }}>
            Best-in-class infrastructure.
          </h2>
          <div className="divider" style={{ margin: "20px auto 56px" }} />
          <div style={{ display: "flex", gap: "1px", flexWrap: "wrap", justifyContent: "center", background: "#1a2236" }}>
            {[
              { name: "Claude Sonnet", role: "AI Engine" },
              { name: "FastAPI", role: "Backend" },
              { name: "React + Vite", role: "Frontend" },
              { name: "pdfplumber", role: "PDF Parsing" },
              { name: "ReportLab", role: "CAM PDF" },
              { name: "Render + Vercel", role: "Cloud" },
            ].map((t, i) => (
              <div key={i} className="tech-card" style={{ minWidth: "160px", border: "none", borderRadius: 0 }}>
                <div style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: "500", fontSize: "18px",
                  color: "#e8e0d0", marginBottom: "6px",
                }}>{t.name}</div>
                <div style={{
                  fontFamily: "'Rajdhani', sans-serif",
                  fontSize: "11px", color: "#4a5568",
                  letterSpacing: "2px",
                }}>{t.role}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={{
        padding: "120px 56px", textAlign: "center",
        borderTop: "1px solid #1a2236",
        position: "relative", zIndex: 1,
      }}>
        <div className="section-label" style={{ textAlign: "center", marginBottom: "24px" }}>
          Ready to Appraise
        </div>
        <h2 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: "clamp(48px, 7vw, 88px)", fontWeight: "300",
          letterSpacing: "-2px", marginBottom: "16px", lineHeight: 0.95,
        }}>
          <span style={{ color: "#e8e0d0" }}>3 weeks of work.</span>
          <br />
          <span className="shimmer-text">5 minutes with Veridex.</span>
        </h2>
        <div className="divider" style={{ margin: "32px auto" }} />
        <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
          <button className="btn-primary" onClick={onStart}>
            <span>LAUNCH PLATFORM</span>
          </button>
          <button className="btn-quick" onClick={onQuick}>
            <span>QUICK APPRAISAL</span>
          </button>
          <button className="btn-secondary" onClick={onResearch}>
            <span>RESEARCH ENGINE</span>
          </button>
        </div>
        <div style={{
          marginTop: "48px", fontFamily: "'Rajdhani', sans-serif",
          fontSize: "11px", color: "#2a3550", letterSpacing: "2px",
        }}>
          veridex.vercel.app
        </div>
      </section>
    </div>
  );
}
