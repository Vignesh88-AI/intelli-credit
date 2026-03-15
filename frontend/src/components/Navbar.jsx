import React from 'react';

const Navbar = ({ currentStage }) => {
  const stages = [
    { id: 1, label: 'ENTITY' },
    { id: 2, label: 'DOCUMENTS' },
    { id: 3, label: 'EXTRACTION' },
    { id: 4, label: 'REPORT' }
  ];

  return (
    <nav className="fixed top-0 left-0 w-full h-[60px] bg-[#0a1628]/95 backdrop-blur-[10px] border-b border-[#f0a500]/20 z-[1000] flex items-center justify-between px-8">
      <div className="flex items-center gap-3">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="4" width="16" height="16" stroke="#c9a84c" strokeWidth="1.5" transform="rotate(45 12 12)" fill="none"/>
          <rect x="8" y="8" width="8" height="8" fill="#c9a84c" transform="rotate(45 12 12)"/>
        </svg>
        <span className="text-[#f0a500] text-xl font-black tracking-tighter">VERIDEX</span>
      </div>

      {/* STEP INDICATORS — always show numbers, color changes only */}
      <div className="hidden md:flex items-center gap-4">
        {stages.map((s, index) => {
          const isDone    = s.id < currentStage;
          const isActive  = s.id === currentStage;
          const isPending = s.id > currentStage;

          return (
            <React.Fragment key={s.id}>
              <div className="flex items-center gap-2">
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '12px', fontWeight: '900',
                  background: isDone   ? '#22c55e' :
                              isActive ? '#f0a500' : 'transparent',
                  border: isDone   ? '2px solid #22c55e' :
                          isActive ? '2px solid #f0a500' : '2px solid #475569',
                  color:  isDone   ? '#fff' :
                          isActive ? '#0a1628' : '#475569',
                  boxShadow: isActive ? '0 0 12px rgba(240,165,0,0.5)' :
                             isDone   ? '0 0 8px rgba(34,197,94,0.3)' : 'none',
                  transition: 'all 0.3s ease'
                }}>
                  {s.id}
                </div>
                <span style={{
                  fontSize: '11px', fontWeight: '700', letterSpacing: '1.5px',
                  color: isDone   ? '#22c55e' :
                         isActive ? '#f0a500' : '#475569',
                  transition: 'color 0.3s ease'
                }}>
                  {s.label}
                </span>
              </div>
              {index < stages.length - 1 && (
                <div style={{
                  width: '32px', height: '2px',
                  background: isDone ? '#22c55e' : 'rgba(255,255,255,0.1)',
                  borderRadius: '2px', transition: 'background 0.3s ease'
                }} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 bg-[#00c853]/10 px-3 py-1 rounded-full border border-[#00c853]/20">
          <div className="w-2 h-2 rounded-full bg-[#00c853] animate-pulse"></div>
          <span className="text-[#00c853] text-[10px] font-black tracking-widest uppercase">System Online</span>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
