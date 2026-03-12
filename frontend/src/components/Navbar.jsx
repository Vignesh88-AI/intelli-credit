import React from 'react';

const Navbar = ({ currentStage }) => {
  const stages = [
    { id: 1, label: 'ENTITY' },
    { id: 2, label: 'UPLOAD' },
    { id: 3, label: 'ANALYZE' },
    { id: 4, label: 'REPORT' }
  ];

  return (
    <nav className="fixed top-0 left-0 w-full h-[60px] bg-[#0a1628]/95 backdrop-blur-[10px] border-b border-[#f0a500]/20 z-[1000] flex items-center justify-between px-8">
      <div className="flex items-center gap-3">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="4" width="16" height="16" stroke="#c9a84c" strokeWidth="1.5" transform="rotate(45 12 12)" fill="none"/>
          <rect x="8" y="8" width="8" height="8" fill="#c9a84c" transform="rotate(45 12 12)"/>
        </svg>
        <span className="text-[#f0a500] text-xl font-black tracking-tighter">
          VERIDEX
        </span>
      </div>

      {/* CENTER: STEP INDICATORS */}
      <div className="hidden md:flex items-center gap-4">
        {stages.map((s, index) => (
          <React.Fragment key={s.id}>
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border ${
                s.id === currentStage ? 'bg-[#f0a500] border-[#f0a500] text-black shadow-[0_0_10px_rgba(240,165,0,0.5)]' :
                s.id < currentStage ? 'bg-green-500 border-green-500 text-white' :
                'border-slate-500 text-slate-500'
              }`}>
                {s.id < currentStage ? (
                  <span className="material-symbols-outlined text-[14px]">check</span>
                ) : s.id}
              </div>
              <span className={`text-[11px] font-bold tracking-widest ${
                s.id === currentStage ? 'text-[#f0a500]' :
                s.id < currentStage ? 'text-green-500' : 'text-slate-500'
              }`}>
                {s.label}
              </span>
            </div>
            {index < stages.length - 1 && (
              <div className={`w-8 h-[1px] ${s.id < currentStage ? 'bg-green-500' : 'bg-slate-700'}`}></div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* RIGHT: SYSTEM ONLINE */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 bg-[#00c853]/10 px-3 py-1 rounded-full border border-[#00c853]/20">
          <div className="w-2 h-2 rounded-full bg-[#00c853] animate-pulse"></div>
          <span className="text-[#00c853] text-[10px] font-black tracking-widest uppercase">
            System Online
          </span>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
