import React from 'react';
import { ShieldCheck, Check } from 'lucide-react';

const Navbar = ({ currentStage }) => {
  const stages = [
    { id: 1, label: 'Entity' },
    { id: 2, label: 'Upload' },
    { id: 3, label: 'Analyze' },
    { id: 4, label: 'Report' }
  ];

  return (
    <nav className="glass py-4 px-6 md:px-12 flex flex-col md:flex-row items-center justify-between sticky top-0 z-50 gap-4">
      {/* Logo Section */}
      <div className="flex items-center gap-3">
        <div className="bg-[#f0a500] p-1.5 rounded-lg shadow-lg shadow-[#f0a500]/20">
          <ShieldCheck className="text-black" size={24} />
        </div>
        <span className="text-2xl font-black tracking-tighter">
          INTELLI-<span className="text-[#f0a500]">CREDIT</span>
        </span>
      </div>

      {/* Step Indicators Section */}
      <div className="flex items-center gap-2">
        {stages.map((s, index) => (
          <React.Fragment key={s.id}>
            <div className="flex flex-col items-center gap-1">
              <div className={`step-circle ${
                s.id === currentStage ? 'active' : 
                s.id < currentStage ? 'done' : 'upcoming'
              }`}>
                {s.id < currentStage ? <Check size={16} strokeWidth={3} /> : s.id}
              </div>
              <span className={`step-label ${
                s.id === currentStage ? 'active' : 
                s.id < currentStage ? 'done' : 'upcoming'
              } hidden lg:block`}>
                {s.label}
              </span>
            </div>
            {index < stages.length - 1 && (
              <div className={`step-line ${s.id < currentStage ? 'done' : ''} mb-4 lg:mb-6`}></div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Profile Section - Hidden on small screens to save space for steps */}
      <div className="hidden md:flex items-center gap-4">
        <div className="text-right">
          <p className="text-xs font-bold text-[#f0a500]">SYSTEM ONLINE</p>
          <p className="text-[10px] text-gray-400">v1.2.4-stable</p>
        </div>
        <div className="h-10 w-10 rounded-full border-2 border-[#f0a500] p-0.5">
          <div className="h-full w-full rounded-full bg-gradient-to-br from-[#f0a500] to-[#ffd700] flex items-center justify-center text-black font-extrabold text-sm">
            JD
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
