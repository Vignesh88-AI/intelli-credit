import React from 'react';

const Navbar = ({ currentStage }) => {
  const stages = [
    { id: 1, label: 'ENTITY' },
    { id: 2, label: 'DOCUMENTS' },
    { id: 3, label: 'EXTRACTION' },
    { id: 4, label: 'REPORT' }
  ];

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '64px',
      background: 'rgba(10,22,40,0.97)', backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(240,165,0,0.2)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 32px', boxSizing: 'border-box'
    }}>
      {/* LEFT: Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <rect x="4" y="4" width="16" height="16" stroke="#c9a84c" strokeWidth="1.5" transform="rotate(45 12 12)" fill="none"/>
          <rect x="8" y="8" width="8" height="8" fill="#c9a84c" transform="rotate(45 12 12)"/>
        </svg>
        <span style={{ color: '#f0a500', fontSize: '20px', fontWeight: '900', letterSpacing: '-0.5px', fontFamily: 'Inter, sans-serif' }}>VERIDEX</span>
      </div>

      {/* CENTER: Step indicators */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {stages.map((s, index) => {
          const isDone    = s.id < currentStage;
          const isActive  = s.id === currentStage;
          const isPending = s.id > currentStage;
          return (
            <React.Fragment key={s.id}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <div style={{
                  width: '30px', height: '30px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '12px', fontWeight: '900', fontFamily: 'Inter, sans-serif',
                  background: isDone ? '#22c55e' : isActive ? '#f0a500' : 'transparent',
                  border: `2px solid ${isDone ? '#22c55e' : isActive ? '#f0a500' : '#475569'}`,
                  color: isDone ? '#fff' : isActive ? '#0a1628' : '#475569',
                  boxShadow: isActive ? '0 0 14px rgba(240,165,0,0.5)' : isDone ? '0 0 8px rgba(34,197,94,0.3)' : 'none',
                  transition: 'all 0.3s ease', flexShrink: 0
                }}>
                  {s.id}
                </div>
                <span style={{
                  fontSize: '10px', fontWeight: '700', letterSpacing: '1.2px',
                  fontFamily: 'Inter, sans-serif',
                  color: isDone ? '#22c55e' : isActive ? '#f0a500' : '#475569',
                  transition: 'color 0.3s ease', whiteSpace: 'nowrap'
                }}>
                  {s.label}
                </span>
              </div>
              {index < stages.length - 1 && (
                <div style={{
                  width: '40px', height: '2px', marginBottom: '18px', flexShrink: 0,
                  background: isDone ? '#22c55e' : 'rgba(255,255,255,0.1)',
                  borderRadius: '2px', transition: 'background 0.3s ease'
                }} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* RIGHT: System status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,200,83,0.1)', padding: '5px 12px', borderRadius: '20px', border: '1px solid rgba(0,200,83,0.2)' }}>
          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#00c853', boxShadow: '0 0 6px #00c853', animation: 'pulse 2s infinite' }} />
          <span style={{ color: '#00c853', fontSize: '10px', fontWeight: '900', letterSpacing: '1px', fontFamily: 'Inter, sans-serif' }}>SYSTEM ONLINE</span>
        </div>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
    </nav>
  );
};

export default Navbar;
