import { useState } from "react"
import Stage0_Landing from "./stages/Stage0_Landing"
import Stage1_Onboarding from "./stages/Stage1_Onboarding"
import Stage2_Upload from "./stages/Stage2_Upload"
import Stage3_Extraction from "./stages/Stage3_Extraction"
import Stage4_Report from "./stages/Stage4_Report"
import CompanyResearch from "./stages/CompanyResearch"
import QuickAppraisal from "./stages/QuickAppraisal"
import Navbar from "./components/Navbar"

export default function App() {
  const [stage, setStage] = useState(0)
  const [data, setData] = useState({})

  const next = (d) => { setData(prev => ({...prev,...d})); setStage(s => s + 1) }

  // stage 0 = Landing, 1-4 = full flow, 5 = Research Engine, 6 = Quick Appraisal
  const showNavbar = stage >= 1 && stage <= 4

  return (
    <div style={{ minHeight: "100vh", background: "#0a1628", fontFamily: "'Inter', 'Rajdhani', sans-serif", color: "white" }}>
      <style>{`
        @keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        select option { background: #0f2035; color: white; }
        * { box-sizing: border-box; }
      `}</style>

      {showNavbar && <Navbar currentStage={stage} />}

      <div style={{ paddingTop: showNavbar ? "72px" : "0" }}>
        {stage === 0 && <Stage0_Landing onStart={() => setStage(1)} onResearch={() => setStage(5)} onQuick={() => setStage(6)} />}
        {stage === 1 && <Stage1_Onboarding onNext={next} onQuick={() => setStage(6)} />}
        {stage === 2 && <Stage2_Upload onNext={next} entityData={data} />}
        {stage === 3 && <Stage3_Extraction onNext={next} entityData={data} />}
        {stage === 4 && <Stage4_Report onBack={() => setStage(3)} entityData={data} />}
        {stage === 5 && <CompanyResearch onBack={() => setStage(0)} />}
        {stage === 6 && <QuickAppraisal onBack={() => setStage(1)} />}
      </div>
    </div>
  )
}
