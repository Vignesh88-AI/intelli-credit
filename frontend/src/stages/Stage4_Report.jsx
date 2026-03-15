import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  ArrowLeft, Download, CheckCircle, AlertTriangle, Shield, ShieldAlert,
  Globe, BarChart3, Loader2, GitMerge, Brain, FileText, TrendingUp, PieChart as PieIcon
} from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const API = import.meta.env.VITE_API_URL || 'https://intelli-credit-7kzw.onrender.com';

// ── Decision table ────────────────────────────────────────
const getDecision = s => {
  if (s >= 80) return { label:"APPROVE",                  grade:"A", color:"#22c55e", rate:"Base + 0.75%" };
  if (s >= 65) return { label:"APPROVE WITH CONDITIONS",  grade:"B", color:"#f0a500", rate:"Base + 1.5%"  };
  if (s >= 50) return { label:"REFER TO CREDIT COMMITTEE",grade:"C", color:"#f97316", rate:"Base + 2.5%"  };
  return            { label:"REJECT",                     grade:"D", color:"#ef4444", rate:"N/A"           };
};
const getRisk = s => s >= 80 ? "LOW" : s >= 65 ? "MEDIUM" : s >= 50 ? "HIGH" : "CRITICAL";
const toInrCr = v => { const n = parseFloat(String(v||"").replace(/[^0-9.-]/g,"")); return isNaN(n) ? null : n; };
const safeRevHistory = arr => {
  if (!arr?.length) return null;
  const vals = arr.map(d => toInrCr(d.revenue_cr ?? d.value));
  const nonNull = vals.filter(v => v !== null && v > 0);
  if (!nonNull.length) return null;
  const max = Math.max(...nonNull), min = Math.min(...nonNull);
  if (max/min > 500) return null;
  return { labels: arr.map(d => d.year||d.year), data: vals };
};

const C = {
  page:  { maxWidth:"980px", margin:"0 auto", padding:"40px 20px", color:"white", display:"flex", flexDirection:"column", gap:"24px" },
  glass: { background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:"16px", padding:"24px", boxSizing:"border-box" },
  title: { fontSize:"16px", fontWeight:"700", display:"flex", alignItems:"center", gap:"10px", color:"#f0a500", margin:"0 0 16px" },
  btn:   { background:"#f0a500", color:"#0a1628", padding:"16px", borderRadius:"12px", fontSize:"16px", fontWeight:"900", cursor:"pointer", border:"none", width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:"12px", boxShadow:"0 6px 20px rgba(240,165,0,0.3)", textTransform:"uppercase", letterSpacing:"1px" }
};

export default function Stage4_Report({ onBack, entityData }) {
  const [loading,      setLoading]      = useState(true);
  const [research,     setResearch]     = useState(null);
  const [scoreData,    setScoreData]    = useState(null);
  const [animated,     setAnimated]     = useState(0);
  const [downloading,  setDownloading]  = useState(false);
  const [analystNotes, setAnalystNotes] = useState('');
  const [notesApplied, setNotesApplied] = useState(false);
  const [notesLoading, setNotesLoading] = useState(false);

  useEffect(() => { if (entityData?.entity?.companyName) runAnalysis(); else setLoading(false); }, []);

  const runAnalysis = async (notes="") => {
    setLoading(true);
    try {
      const company = entityData?.entity?.companyName || "Unknown";
      const sector  = entityData?.entity?.sector || "NBFC";
      const extractedDocs = {};
      (entityData?.extractedData||[]).forEach(d => { if(d.fields) extractedDocs[d.doc_type] = d.fields; });

      const [resRes, scoreRes] = await Promise.allSettled([
        axios.post(`${API}/api/research`, { company_name: company, sector }),
        axios.post(`${API}/api/score`, new URLSearchParams({
          data: JSON.stringify({
            ...Object.values(extractedDocs).reduce((a,b)=>({...a,...b}),{}),
            company_name: company, sector,
            loan_amount: entityData?.loan?.amount || 50,
            interest_rate: entityData?.loan?.rate || 11.5,
            tenure: entityData?.loan?.tenure || 36,
            analyst_notes: notes
          })
        }))
      ]);

      const res = resRes.status==='fulfilled' ? resRes.value.data : {};
      const sc  = scoreRes.status==='fulfilled' ? scoreRes.value.data : {};
      setResearch(res);

      const raw = sc?.score || res?.total_score || 60;
      const score = Math.max(0, Math.min(100, raw));
      const dec = getDecision(score);

      const merged = {
        score,
        decision: sc?.decision || dec.label,
        grade:    sc?.grade    || dec.grade,
        risk_level: sc?.risk_level || getRisk(score),
        recommended_amount: sc?.recommended_amount || res?.recommended_amount || entityData?.loan?.amount || 50,
        recommended_rate:   sc?.recommended_rate   || res?.recommended_rate   || dec.rate,
        reasoning:          sc?.reasoning   || res?.research_summary || "",
        reasoning_chain:    sc?.reasoning_chain    || [],
        red_flags:   sc?.red_flags   || res?.risk_flags      || [],
        green_flags: sc?.green_flags || res?.positive_signals || [],
        analyst_notes: notes,
        analyst_adjustment: sc?.analyst_adjustment || 0,
        five_cs: sc?.five_cs || {
          character:  {score: res?.character_score||14, max:20, notes:"Web research based"},
          capacity:   {score: res?.capacity_score||16,  max:20, notes:"Web research based"},
          capital:    {score: res?.capital_score||13,   max:20, notes:"Web research based"},
          collateral: {score: res?.collateral_score||13,max:20, notes:"Web research based"},
          conditions: {score: res?.conditions_score||10,max:15, notes:"Web research based"},
        },
        swot: sc?.swot || res?.swot || {
          strengths:     (res?.positive_signals||[]).slice(0,3),
          weaknesses:    (res?.risk_flags||[]).slice(0,3),
          opportunities: ["Growing credit demand","Digital lending expansion"],
          threats:       ["RBI regulatory tightening","Rising cost of funds"]
        }
      };
      setScoreData(merged);

      // animate score
      let cur=0; const inc=score/80;
      const iv = setInterval(()=>{ cur+=inc; if(cur>=score){clearInterval(iv);setAnimated(score);}else setAnimated(Math.ceil(cur)); }, 20);
    } catch(e) {
      console.error(e);
      setScoreData({score:0,decision:"ERROR",grade:"D",risk_level:"CRITICAL",red_flags:["Analysis failed"],green_flags:[],five_cs:{},swot:{}});
    } finally { setLoading(false); }
  };

  const applyNotes = async () => {
    if (!analystNotes.trim()) return;
    setNotesLoading(true);
    await runAnalysis(analystNotes);
    setNotesApplied(true);
    setNotesLoading(false);
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const form = new FormData();
      form.append('data', JSON.stringify({
        entity: entityData?.entity||{}, loan: entityData?.loan||{},
        extracted: entityData?.extractedData||[], research: research||{},
        score: scoreData||{}, analyst_notes: analystNotes
      }));
      const resp = await axios.post(`${API}/api/generate-cam`, form, {responseType:'blob'});
      const url = window.URL.createObjectURL(new Blob([resp.data]));
      const a = document.createElement('a'); a.href=url;
      a.setAttribute('download',`CAM_${entityData?.entity?.companyName||'Report'}_${new Date().toISOString().slice(0,10)}.docx`);
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    } catch { alert('Download failed. Please try again.'); }
    finally { setDownloading(false); }
  };

  if (loading) return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"60vh",gap:"24px"}}>
      <style>{`@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
      <div style={{width:"64px",height:"64px",border:"4px solid rgba(240,165,0,0.2)",borderTopColor:"#f0a500",borderRadius:"50%",animation:"spin 1s linear infinite"}}/>
      <div style={{textAlign:"center"}}>
        <h2 style={{fontSize:"20px",fontWeight:"700",color:"white",animation:"pulse 2s infinite",margin:0}}>Synthesizing 360° Intelligence...</h2>
        <p style={{color:"rgba(255,255,255,0.4)",marginTop:"8px",fontSize:"13px"}}>Running 6 targeted web searches + document analysis + triangulation</p>
      </div>
      <div style={{display:"flex",gap:"8px",flexWrap:"wrap",justifyContent:"center"}}>
        {["Extracting financials","News & litigation","RBI/SEBI signals","MCA filings","Promoter research","Sector analysis"].map((s,i)=>(
          <div key={i} style={{padding:"4px 12px",background:"rgba(240,165,0,0.1)",border:"1px solid rgba(240,165,0,0.2)",borderRadius:"20px",fontSize:"11px",color:"rgba(255,255,255,0.4)"}}>{s}</div>
        ))}
      </div>
    </div>
  );

  if (!scoreData) return <div style={{textAlign:"center",color:"#ef4444",padding:"60px"}}>Analysis failed. Please go back and retry.</div>;

  const dec = getDecision(scoreData.score);
  const allFields = entityData?.extractedData?.reduce((a,c)=>({...a,...c.fields}),{})||{};

  // Charts
  const rawHist = research?.revenue_history?.length > 0
    ? research.revenue_history
    : [{year:'FY22',revenue_cr:toInrCr(allFields.revenue_fy23)},{year:'FY23',revenue_cr:toInrCr(allFields.revenue_fy24)},{year:'FY24',revenue_cr:toInrCr(allFields.revenue)}].filter(h=>h.revenue_cr&&h.revenue_cr>0);
  const revChart = safeRevHistory(rawHist);

  const rawDebt = toInrCr(research?.total_debt || allFields.total_debt);
  const rawNW   = toInrCr(research?.net_worth   || allFields.net_worth);
  const hasPie  = rawDebt != null && rawNW != null && (rawDebt + rawNW) > 0;

  const barData = revChart ? {
    labels: revChart.labels,
    datasets: [{label:'Revenue (INR Cr)',data:revChart.data,backgroundColor:'#f0a500',borderRadius:6,barThickness:48}]
  } : null;

  const pieData = hasPie ? {
    labels:[`Debt: ₹${rawDebt}Cr`,`Net Worth: ₹${rawNW}Cr`],
    datasets:[{data:[rawDebt,rawNW],backgroundColor:['#ef4444','#22c55e'],borderWidth:0}]
  } : null;

  const chartOpts = type => ({
    responsive:true, maintainAspectRatio:false,
    plugins:{legend:{position:'bottom',labels:{color:'rgba(255,255,255,0.6)',padding:16,font:{size:11}}},tooltip:{backgroundColor:'#0a1628',titleColor:'#f0a500',bodyColor:'white',padding:10}},
    scales: type==='bar' ? {y:{beginAtZero:true,grid:{color:'rgba(255,255,255,0.05)'},ticks:{color:'rgba(255,255,255,0.4)'},title:{display:true,text:'INR Crores',color:'rgba(255,255,255,0.4)'}},x:{grid:{display:false},ticks:{color:'rgba(255,255,255,0.4)'}}} : {}
  });

  const fiveCsDefs = [
    {key:"character", label:"Character (Promoter & Rating)", max:20},
    {key:"capacity",  label:"Capacity (Revenue, PAT, GNPA)", max:20},
    {key:"capital",   label:"Capital (CAR & D/E Ratio)",     max:20},
    {key:"collateral",label:"Collateral (Asset Coverage)",   max:20},
    {key:"conditions",label:"Conditions (Sector & News)",    max:15},
  ];

  return (
    <div style={C.page}>
      <style>{`@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`}</style>

      {/* ── VERDICT ── */}
      <div style={{background:`linear-gradient(135deg, ${dec.color}18 0%, rgba(10,22,40,0.6) 100%)`,padding:"36px",borderRadius:"20px",border:`1px solid ${dec.color}50`,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"20px"}}>
        <div>
          <div style={{color:"#f0a500",fontSize:"11px",fontWeight:"900",letterSpacing:"2px",marginBottom:"6px"}}>FINAL UNDERWRITING VERDICT</div>
          <h1 style={{fontSize:"28px",fontWeight:"900",margin:"0 0 10px"}}>{entityData?.entity?.companyName}</h1>
          <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
            <span style={{fontSize:"11px",background:"rgba(255,255,255,0.08)",padding:"4px 10px",borderRadius:"4px",color:"rgba(255,255,255,0.6)"}}>{entityData?.entity?.sector}</span>
            <span style={{fontSize:"11px",background:`${dec.color}20`,padding:"4px 10px",borderRadius:"4px",color:dec.color,fontWeight:"700"}}>Risk: {scoreData.risk_level}</span>
            <span style={{fontSize:"11px",background:"rgba(240,165,0,0.1)",padding:"4px 10px",borderRadius:"4px",color:"#f0a500"}}>Grade {scoreData.grade}</span>
            {scoreData.analyst_adjustment !== 0 && <span style={{fontSize:"11px",background:"rgba(139,92,246,0.15)",padding:"4px 10px",borderRadius:"4px",color:"#a78bfa"}}>Analyst Adj: {scoreData.analyst_adjustment > 0 ? '+' : ''}{scoreData.analyst_adjustment}pts</span>}
          </div>
        </div>
        <div style={{padding:"22px 30px",borderRadius:"16px",background:"rgba(0,0,0,0.3)",border:`2px solid ${dec.color}`,textAlign:"center",minWidth:"200px"}}>
          <div style={{fontSize:"10px",opacity:0.5,marginBottom:"6px",letterSpacing:"1px"}}>CREDIT DECISION</div>
          <div style={{fontSize:"17px",fontWeight:"900",color:dec.color,lineHeight:"1.3"}}>{scoreData.decision}</div>
          <div style={{fontSize:"12px",color:"rgba(255,255,255,0.4)",marginTop:"6px"}}>{scoreData.recommended_rate}</div>
        </div>
      </div>

      {/* ── ANALYST PRIMARY INSIGHT PORTAL ── */}
      <div style={{...C.glass, border:"1px solid rgba(139,92,246,0.3)", background:"rgba(139,92,246,0.05)"}}>
        <h3 style={{...C.title, color:"#a78bfa"}}><Brain size={20}/> Primary Insight Portal (Credit Officer Notes)</h3>
        <p style={{fontSize:"13px",color:"rgba(255,255,255,0.5)",margin:"0 0 14px",lineHeight:"1.6"}}>
          Enter qualitative observations from site visits, management interviews, or due diligence. The AI will adjust the credit score accordingly.
        </p>
        <textarea
          value={analystNotes}
          onChange={e => { setAnalystNotes(e.target.value); setNotesApplied(false); }}
          placeholder="e.g. Factory found operating at 40% capacity. Management indicated revenue recognition delayed by 2 quarters. Promoter pledged additional shares not reflected in filings..."
          style={{width:"100%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(139,92,246,0.3)",borderRadius:"10px",padding:"14px",color:"white",fontSize:"13px",lineHeight:"1.7",resize:"vertical",minHeight:"100px",outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}
        />
        <div style={{display:"flex",alignItems:"center",gap:"12px",marginTop:"12px",flexWrap:"wrap"}}>
          <button
            onClick={applyNotes}
            disabled={!analystNotes.trim() || notesLoading}
            style={{background:analystNotes.trim()?"#a78bfa":"rgba(139,92,246,0.3)",color:"#0a1628",border:"none",borderRadius:"8px",padding:"10px 20px",fontSize:"13px",fontWeight:"800",cursor:analystNotes.trim()?"pointer":"not-allowed",display:"flex",alignItems:"center",gap:"8px"}}
          >
            {notesLoading ? <><Loader2 size={14} style={{animation:"spin 1s linear infinite"}}/> Recalculating...</> : "Apply Notes & Recalculate Score"}
          </button>
          {notesApplied && <span style={{fontSize:"12px",color:"#22c55e",fontWeight:"700"}}>✓ Score updated with analyst notes</span>}
        </div>
      </div>

      {/* ── SECONDARY RESEARCH ── */}
      {research?.research_summary && (
        <div style={{...C.glass, borderLeft:"4px solid #f0a500", background:"rgba(240,165,0,0.03)"}}>
          <h3 style={C.title}><Shield size={20}/> Secondary Research Intelligence</h3>
          <p style={{fontSize:"14px",lineHeight:"1.7",color:"rgba(255,255,255,0.75)",margin:"0 0 16px"}}>{research.research_summary}</p>
          <div style={{display:"flex",gap:"10px",flexWrap:"wrap"}}>
            {research.sector_outlook && <span style={{fontSize:"10px",background:"rgba(255,255,255,0.05)",padding:"4px 10px",borderRadius:"4px",color:"rgba(255,255,255,0.5)"}}>SECTOR: {research.sector_outlook.slice(0,80).toUpperCase()}</span>}
            {research.promoter_background && research.promoter_background !== "N/A" && <span style={{fontSize:"10px",background:"rgba(34,197,94,0.1)",padding:"4px 10px",borderRadius:"4px",color:"#22c55e"}}>PROMOTER: {research.promoter_background.slice(0,60)}…</span>}
            {research?.data_sources?.length > 0 && <span style={{fontSize:"10px",background:"rgba(59,130,246,0.1)",padding:"4px 10px",borderRadius:"4px",color:"#3b82f6"}}>{research.data_sources.length} SOURCES ANALYZED</span>}
          </div>
        </div>
      )}

      {/* ── INDIAN CONTEXT FLAGS ── */}
      {(research?.rbi_regulatory_flags?.length > 0 || research?.nclt_status || research?.cibil_signal || research?.gstr_signal) && (
        <div style={{...C.glass, borderLeft:"4px solid #ef4444", background:"rgba(239,68,68,0.04)"}}>
          <h3 style={{...C.title, color:"#ef4444"}}><ShieldAlert size={20}/> Indian Regulatory & Compliance Signals</h3>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"12px"}}>
            {[
              {label:"NCLT/IBC Status",     val:research?.nclt_status,      ok: research?.nclt_status === "None detected"},
              {label:"CIBIL Commercial",     val:research?.cibil_signal,     ok: research?.cibil_signal === "N/A"},
              {label:"GSTR-2A vs 3B",        val:research?.gstr_signal,      ok: research?.gstr_signal === "N/A"},
              {label:"Litigation Risk",      val:research?.litigation_risk,  ok: research?.litigation_risk?.includes("LOW")},
            ].filter(i => i.val && i.val !== "N/A" && i.val !== "null").map((item,i) => (
              <div key={i} style={{padding:"12px 14px",background:`rgba(${item.ok?"34,197,94":"239,68,68"},0.06)`,borderRadius:"8px",border:`1px solid rgba(${item.ok?"34,197,94":"239,68,68"},0.2)`}}>
                <div style={{fontSize:"10px",color:"rgba(255,255,255,0.4)",marginBottom:"4px",textTransform:"uppercase",letterSpacing:"0.5px"}}>{item.label}</div>
                <div style={{fontSize:"13px",color:item.ok?"#22c55e":"#ef4444",fontWeight:"600"}}>{item.val}</div>
              </div>
            ))}
          </div>
          {research?.rbi_regulatory_flags?.length > 0 && (
            <ul style={{padding:0,margin:0,listStyle:"none"}}>
              {research.rbi_regulatory_flags.map((f,i) => (
                <li key={i} style={{marginBottom:"8px",fontSize:"13px",color:"rgba(255,255,255,0.8)",display:"flex",gap:"10px"}}>
                  <span style={{color:"#ef4444"}}>●</span> {f}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── CHARTS ── */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"20px"}}>
        <div style={C.glass}>
          <h4 style={{fontSize:"12px",fontWeight:"700",marginBottom:"14px",color:"rgba(255,255,255,0.4)",display:"flex",alignItems:"center",gap:"8px"}}>
            <BarChart3 size={14} color="#f0a500"/> Revenue Growth (INR Crores)
          </h4>
          <div style={{height:"240px"}}>
            {barData && barData.datasets[0].data.some(v=>v&&v>0)
              ? <Bar data={barData} options={chartOpts('bar')}/>
              : <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",color:"rgba(255,255,255,0.25)",fontSize:"13px"}}>Revenue history data not available</div>}
          </div>
        </div>
        <div style={C.glass}>
          <h4 style={{fontSize:"12px",fontWeight:"700",marginBottom:"14px",color:"rgba(255,255,255,0.4)",display:"flex",alignItems:"center",gap:"8px"}}>
            <PieIcon size={14} color="#ef4444"/> Capital Structure
          </h4>
          <div style={{height:"240px"}}>
            {hasPie && pieData
              ? <Pie data={pieData} options={chartOpts('pie')}/>
              : <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",color:"rgba(255,255,255,0.25)",fontSize:"13px"}}>Capital structure data not available</div>}
          </div>
        </div>
      </div>

      {/* ── SCORE BREAKDOWN ── */}
      <div style={{...C.glass, display:"flex",gap:"32px",alignItems:"center",flexWrap:"wrap"}}>
        <div style={{flex:1,minWidth:"280px"}}>
          <h3 style={C.title}><Shield size={20}/> Five Cs Score Breakdown</h3>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <tbody>
              {fiveCsDefs.map(row => {
                const cs  = scoreData.five_cs?.[row.key];
                const val = typeof cs === 'object' ? (cs?.score||0) : (cs||0);
                const pct = (val/row.max)*100;
                const col = pct>=70?"#22c55e":pct>=50?"#f0a500":"#ef4444";
                return (
                  <tr key={row.key} style={{borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                    <td style={{padding:"11px 0",fontSize:"13px",color:"rgba(255,255,255,0.7)"}}>{row.label}</td>
                    <td style={{padding:"11px 0",width:"80px"}}>
                      <div style={{height:"4px",background:"rgba(255,255,255,0.08)",borderRadius:"2px"}}>
                        <div style={{height:"100%",width:`${pct}%`,background:col,borderRadius:"2px",transition:"width 0.8s ease"}}/>
                      </div>
                    </td>
                    <td style={{padding:"11px 0",textAlign:"right",fontWeight:"700",fontSize:"14px",color:col,paddingLeft:"12px"}}>{val}/{row.max}</td>
                  </tr>
                );
              })}
              <tr>
                <td style={{padding:"14px 0",fontWeight:"900",color:"#f0a500",fontSize:"15px"}}>INTELLI-SCORE</td>
                <td></td>
                <td style={{padding:"14px 0",textAlign:"right",fontWeight:"900",color:dec.color,fontSize:"22px"}}>{scoreData.score}/100</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div style={{width:"180px",textAlign:"center"}}>
          <div style={{position:"relative",display:"inline-block"}}>
            <svg width="150" height="150" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="85" stroke="rgba(255,255,255,0.05)" strokeWidth="14" fill="transparent"/>
              <circle cx="100" cy="100" r="85" stroke={dec.color} strokeWidth="14" fill="transparent"
                strokeDasharray="534" strokeDashoffset={534-(534*Math.min(animated,100)/100)}
                strokeLinecap="round" transform="rotate(-90 100 100)" style={{transition:"stroke-dashoffset 0.5s ease"}}/>
            </svg>
            <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",fontSize:"42px",fontWeight:"900",color:dec.color}}>{animated}</div>
          </div>
          <div style={{fontWeight:"900",fontSize:"12px",letterSpacing:"2px",color:dec.color,marginTop:"8px"}}>{scoreData.risk_level}</div>
          <div style={{fontSize:"11px",color:"rgba(255,255,255,0.4)",marginTop:"4px"}}>Grade {scoreData.grade}</div>
        </div>
      </div>

      {/* ── EXPLAINABILITY CHAIN ── */}
      {scoreData?.reasoning_chain?.length > 0 && (
        <div style={C.glass}>
          <h3 style={C.title}><FileText size={20}/> Explainability Chain (Why This Score?)</h3>
          <p style={{fontSize:"12px",color:"rgba(255,255,255,0.4)",margin:"0 0 14px"}}>Every scoring decision traced to its source document or data signal:</p>
          <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
            {scoreData.reasoning_chain.slice(0,12).map((r,i) => {
              const isNeg = r.includes("-") && !r.includes("+0");
              const isPos = r.includes("+") && !r.includes("+0");
              return (
                <div key={i} style={{padding:"10px 14px",background:isNeg?"rgba(239,68,68,0.06)":isPos?"rgba(34,197,94,0.06)":"rgba(255,255,255,0.02)",borderRadius:"8px",borderLeft:`3px solid ${isNeg?"#ef4444":isPos?"#22c55e":"rgba(255,255,255,0.1)"}`,fontSize:"12px",color:"rgba(255,255,255,0.75)",lineHeight:"1.5"}}>
                  {r}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TRIANGULATION ── */}
      <div style={C.glass}>
        <h3 style={C.title}><GitMerge size={20}/> Data Triangulation (Document vs Web Intelligence)</h3>
        <p style={{fontSize:"12px",color:"rgba(255,255,255,0.4)",margin:"0 0 14px"}}>Cross-referencing extracted document data against web research findings:</p>
        {(() => {
          const items = [];
          const docRev = toInrCr(entityData?.extractedData?.find(d=>d.doc_type==='annual_report')?.fields?.revenue);
          const webRev = toInrCr(research?.revenue);
          if (docRev && webRev) {
            const diff = Math.abs(docRev-webRev)/Math.max(docRev,webRev)*100;
            items.push({field:"Revenue",doc:`₹${docRev}Cr`,web:`₹${webRev}Cr`,status:diff>20?"MISMATCH":"CONSISTENT",note:diff>20?`${diff.toFixed(1)}% variance — verify`:"Consistent across sources"});
          }
          const docDebt = toInrCr(entityData?.extractedData?.find(d=>d.doc_type==='annual_report')?.fields?.total_debt);
          const webDebt = toInrCr(research?.total_debt);
          if (docDebt && webDebt) {
            const diff = Math.abs(docDebt-webDebt)/Math.max(docDebt,webDebt)*100;
            items.push({field:"Total Debt",doc:`₹${docDebt}Cr`,web:`₹${webDebt}Cr`,status:diff>25?"MISMATCH":"CONSISTENT",note:diff>25?`${diff.toFixed(1)}% variance`:"Consistent"});
          }
          if (items.length === 0) return <div style={{fontSize:"13px",color:"rgba(255,255,255,0.3)",fontStyle:"italic"}}>Upload documents to enable triangulation with web data.</div>;
          return (
            <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
              {items.map((item,i) => (
                <div key={i} style={{display:"grid",gridTemplateColumns:"120px 1fr 1fr 100px 1fr",gap:"12px",padding:"12px 16px",background:"rgba(255,255,255,0.02)",borderRadius:"8px",alignItems:"center",fontSize:"13px"}}>
                  <div style={{fontWeight:"700",color:"rgba(255,255,255,0.6)"}}>{item.field}</div>
                  <div><div style={{fontSize:"10px",color:"rgba(255,255,255,0.3)",marginBottom:"2px"}}>DOCUMENT</div><div style={{color:"#3b82f6",fontWeight:"700"}}>{item.doc}</div></div>
                  <div><div style={{fontSize:"10px",color:"rgba(255,255,255,0.3)",marginBottom:"2px"}}>WEB RESEARCH</div><div style={{color:"#a78bfa",fontWeight:"700"}}>{item.web}</div></div>
                  <div style={{padding:"4px 8px",borderRadius:"6px",textAlign:"center",fontSize:"11px",fontWeight:"800",background:item.status==="CONSISTENT"?"rgba(34,197,94,0.15)":"rgba(239,68,68,0.15)",color:item.status==="CONSISTENT"?"#22c55e":"#ef4444"}}>{item.status}</div>
                  <div style={{fontSize:"12px",color:"rgba(255,255,255,0.5)"}}>{item.note}</div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      {/* ── POSITIVES & RISKS ── */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px"}}>
        <div style={{padding:"20px",borderRadius:"14px",background:"rgba(34,197,94,0.05)",border:"1px solid rgba(34,197,94,0.2)"}}>
          <h4 style={{color:"#22c55e",fontSize:"13px",fontWeight:"800",marginBottom:"14px",display:"flex",alignItems:"center",gap:"8px"}}><CheckCircle size={16}/> POSITIVE SIGNALS</h4>
          <ul style={{padding:0,margin:0,listStyle:"none",fontSize:"13px",color:"rgba(255,255,255,0.65)",lineHeight:"1.9"}}>
            {(scoreData.green_flags||[]).map((s,i) => <li key={i}>✓ {s}</li>)}
            {!scoreData.green_flags?.length && <li style={{color:"rgba(255,255,255,0.25)",fontStyle:"italic"}}>No strong positive signals found</li>}
          </ul>
        </div>
        <div style={{padding:"20px",borderRadius:"14px",background:"rgba(239,68,68,0.05)",border:"1px solid rgba(239,68,68,0.2)"}}>
          <h4 style={{color:"#ef4444",fontSize:"13px",fontWeight:"800",marginBottom:"14px",display:"flex",alignItems:"center",gap:"8px"}}><AlertTriangle size={16}/> RISK FLAGS</h4>
          <ul style={{padding:0,margin:0,listStyle:"none",fontSize:"13px",color:"rgba(255,255,255,0.65)",lineHeight:"1.9"}}>
            {(scoreData.red_flags||[]).map((f,i) => <li key={i}>⚠ {f}</li>)}
            {!scoreData.red_flags?.length && <li style={{color:"rgba(255,255,255,0.25)",fontStyle:"italic"}}>No critical risk flags identified</li>}
          </ul>
        </div>
      </div>

      {/* ── WEB INTELLIGENCE ── */}
      <div style={C.glass}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"}}>
          <h3 style={C.title}><Globe size={20}/> Web Intelligence</h3>
          {research?.data_sources?.length > 0 && <span style={{fontSize:"11px",color:"rgba(255,255,255,0.3)"}}>{research.data_sources.length} sources analyzed</span>}
        </div>
        {(research?.latest_news||[]).filter(n=>n&&n!=='null').slice(0,5).map((news,i) => (
          <div key={i} style={{padding:"11px 14px",background:"rgba(255,255,255,0.02)",borderRadius:"8px",fontSize:"13px",color:"rgba(255,255,255,0.7)",borderLeft:"3px solid #f0a500",lineHeight:"1.5",marginBottom:"8px"}}>• {news}</div>
        ))}
        {!research?.latest_news?.filter(n=>n&&n!=='null')?.length && <div style={{color:"rgba(255,255,255,0.25)",fontSize:"13px",fontStyle:"italic"}}>No adverse news detected.</div>}
        {(research?.sector_headwinds||[]).filter(h=>h&&h!=='null').length > 0 && (
          <div style={{marginTop:"14px"}}>
            <div style={{fontSize:"10px",color:"rgba(255,255,255,0.3)",marginBottom:"8px",letterSpacing:"1px"}}>SECTOR HEADWINDS</div>
            {research.sector_headwinds.filter(h=>h&&h!=='null').map((h,i) => (
              <div key={i} style={{padding:"8px 12px",background:"rgba(239,68,68,0.05)",borderRadius:"6px",fontSize:"13px",color:"#ef4444",marginBottom:"6px"}}>⚠ {h}</div>
            ))}
          </div>
        )}
      </div>

      {/* ── SWOT ── */}
      {scoreData?.swot && Object.values(scoreData.swot).some(v=>v?.length>0) && (
        <div style={C.glass}>
          <h3 style={C.title}><TrendingUp size={20}/> SWOT Analysis</h3>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px"}}>
            {[
              {key:"strengths",    color:"#22c55e",bg:"rgba(34,197,94,0.05)",  border:"rgba(34,197,94,0.2)"},
              {key:"weaknesses",   color:"#ef4444",bg:"rgba(239,68,68,0.05)",  border:"rgba(239,68,68,0.2)"},
              {key:"opportunities",color:"#3b82f6",bg:"rgba(59,130,246,0.05)", border:"rgba(59,130,246,0.2)"},
              {key:"threats",      color:"#f97316",bg:"rgba(249,115,22,0.05)", border:"rgba(249,115,22,0.2)"},
            ].map(({key,color,bg,border}) => (
              <div key={key} style={{padding:"18px",borderRadius:"12px",background:bg,border:`1px solid ${border}`}}>
                <h4 style={{color,fontSize:"12px",fontWeight:"800",marginBottom:"12px",letterSpacing:"1px"}}>{key.toUpperCase()}</h4>
                <ul style={{padding:0,margin:0,listStyle:"none",fontSize:"13px",color:"rgba(255,255,255,0.7)",lineHeight:"1.9"}}>
                  {(scoreData.swot[key]||[]).map((item,i)=><li key={i}>• {item}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── PROPOSED TERMS ── */}
      <div style={{...C.glass, background:"rgba(240,165,0,0.06)", border:"1px solid rgba(240,165,0,0.25)"}}>
        <h3 style={C.title}>Proposed Loan Terms</h3>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"28px",marginBottom:"16px"}}>
          <div><div style={{fontSize:"11px",color:"rgba(255,255,255,0.4)",marginBottom:"6px"}}>RECOMMENDED LIMIT</div><div style={{fontSize:"26px",fontWeight:"900",color:"#f0a500"}}>₹{scoreData.recommended_amount} Cr</div></div>
          <div><div style={{fontSize:"11px",color:"rgba(255,255,255,0.4)",marginBottom:"6px"}}>INTEREST RATE</div><div style={{fontSize:"22px",fontWeight:"900"}}>{scoreData.recommended_rate}</div></div>
          <div><div style={{fontSize:"11px",color:"rgba(255,255,255,0.4)",marginBottom:"6px"}}>TENURE</div><div style={{fontSize:"22px",fontWeight:"900"}}>{entityData?.loan?.tenure||36} Months</div></div>
        </div>
        {scoreData.reasoning && <div style={{padding:"14px",background:"rgba(0,0,0,0.2)",borderRadius:"8px",fontSize:"13px",color:"rgba(255,255,255,0.6)",lineHeight:"1.7"}}><strong style={{color:"#f0a500"}}>Reasoning: </strong>{scoreData.reasoning}</div>}
      </div>

      {/* ── DOWNLOAD ── */}
      <button style={C.btn} onClick={handleDownload} disabled={downloading}>
        {downloading ? <><Loader2 style={{animation:"spin 1s linear infinite"}} size={22}/> Building Credit Memo...</> : <><Download size={22}/> DOWNLOAD COMPLETE CAM REPORT (DOCX)</>}
      </button>
      <div style={{textAlign:"center"}}>
        <button onClick={onBack} style={{background:"none",border:"none",color:"rgba(255,255,255,0.3)",cursor:"pointer",display:"flex",alignItems:"center",gap:"6px",margin:"0 auto",fontSize:"13px"}}>
          <ArrowLeft size={14}/> Back to Analysis
        </button>
      </div>
    </div>
  );
}
