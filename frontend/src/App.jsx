import { useState } from "react"
import Stage0_Landing from "./stages/Stage0_Landing"
import Stage1_Onboarding from "./stages/Stage1_Onboarding"
import Stage2_Upload from "./stages/Stage2_Upload"
import Stage3_Extraction from "./stages/Stage3_Extraction"
import Stage4_Report from "./stages/Stage4_Report"

const STAGES = ["Entity", "Documents", "Extraction", "Report"]

export default function App() {
  const [stage, setStage] = useState(0)
  const [data, setData] = useState({})

  const next = (d) => { setData({...data,...d}); setStage(s=>s+1) }

  return (
    <div style={{minHeight:"100vh",background:"#0a1628",
      fontFamily:"Inter,sans-serif",color:"white"}}>
      
      {/* TOP NAVBAR - Only show if stage > 0 */}
      {stage > 0 && (
        <nav style={{position:"fixed",top:0,left:0,right:0,
          height:"64px",background:"rgba(10,22,40,0.95)",
          backdropFilter:"blur(10px)",borderBottom:"1px solid rgba(240,165,0,0.2)",
          display:"flex",alignItems:"center",justifyContent:"space-between",
          padding:"0 32px",zIndex:1000}}>
          
          <div style={{fontSize:"20px",fontWeight:"700",
            color:"#f0a500",letterSpacing:"2px"}}>
            ⚡ INTELLI-CREDIT
          </div>

          <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
            {STAGES.map((s,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center"}}>
                <div style={{display:"flex",flexDirection:"column",
                  alignItems:"center",gap:"4px"}}>
                  <div style={{width:"32px",height:"32px",borderRadius:"50%",
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:"13px",fontWeight:"600",
                    background: stage>i+1?"#22c55e":stage===i+1?"#f0a500":"transparent",
                    border: stage>i+1?"2px solid #22c55e":stage===i+1?"2px solid #f0a500":"2px solid #4a5568",
                    color: stage>=i+1?"#0a1628":"#4a5568"}}>
                    {stage>i+1?"✓":i+1}
                  </div>
                  <span style={{fontSize:"10px",
                    color:stage===i+1?"#f0a500":stage>i+1?"#22c55e":"#4a5568",
                    letterSpacing:"1px",textTransform:"uppercase"}}>
                    {s}
                  </span>
                </div>
                {i<3&&<div style={{width:"60px",height:"2px",marginBottom:"18px",
                  background:stage>i+1?"#22c55e":"#1e3a5f",margin:"0 8px 18px 8px"}}/>}
              </div>
            ))}
          </div>

          <div style={{display:"flex",alignItems:"center",gap:"8px",
            fontSize:"12px",color:"#22c55e",letterSpacing:"1px"}}>
            <div style={{width:"8px",height:"8px",borderRadius:"50%",
              background:"#22c55e",boxShadow:"0 0 8px #22c55e"}}/>
            SYSTEM ONLINE
          </div>
        </nav>
      )}

      {/* MAIN CONTENT */}
      <div style={{paddingTop: stage === 0 ? "0" : "80px"}}>
        {stage===0&&<Stage0_Landing onStart={() => setStage(1)}/>}
        {stage===1&&<Stage1_Onboarding onNext={next}/>}
        {stage===2&&<Stage2_Upload onNext={next} entityData={data}/>}
        {stage===3&&<Stage3_Extraction onNext={next} entityData={data}/>}
        {stage===4&&<Stage4_Report entityData={data}/>}
      </div>
    </div>
  )
}
