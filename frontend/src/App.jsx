import React, { useState } from 'react';
import Navbar from './components/Navbar';
import ProgressBar from './components/ProgressBar';
import Stage1_Onboarding from './stages/Stage1_Onboarding';
import Stage2_Upload from './stages/Stage2_Upload';
import Stage3_Extraction from './stages/Stage3_Extraction';
import Stage4_Report from './stages/Stage4_Report';

function App() {
  const [stage, setStage] = useState(1);
  const [formData, setFormData] = useState({
    entity: {},
    loan: {},
    uploads: [],
    extracted: null,
    report: null
  });

  const nextStage = () => setStage(prev => prev + 1);
  const prevStage = () => setStage(prev => prev - 1);

  const renderStage = () => {
    switch(stage) {
      case 1: return <Stage1_Onboarding formData={formData} setFormData={setFormData} onNext={nextStage} />;
      case 2: return <Stage2_Upload formData={formData} setFormData={setFormData} onNext={nextStage} onBack={prevStage} />;
      case 3: return <Stage3_Extraction formData={formData} setFormData={setFormData} onNext={nextStage} onBack={prevStage} />;
      case 4: return <Stage4_Report formData={formData} setFormData={setFormData} onBack={prevStage} />;
      default: return <Stage1_Onboarding />;
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar currentStage={stage} />
      <div className="w-full pt-[80px]">
        <main className="w-full">
          {renderStage()}
        </main>
      </div>
    </div>
  );
}

export default App;
