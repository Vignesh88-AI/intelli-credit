import React from 'react';

const ProgressBar = ({ currentStage, totalStages }) => {
  return (
    <div className="w-full">
      <div className="flex justify-between mb-4">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex flex-col items-center flex-1">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${
              s === currentStage ? 'bg-[#f0a500] text-black scale-110' : 
              s < currentStage ? 'bg-[#238636] text-white' : 'bg-[#30363d] text-gray-400'
            }`}>
              {s < currentStage ? '✓' : s}
            </div>
            <span className={`text-xs mt-2 font-medium ${s === currentStage ? 'text-[#f0a500]' : 'text-gray-500'}`}>
              {s === 1 && 'Onboarding'}
              {s === 2 && 'Upload'}
              {s === 3 && 'Extraction'}
              {s === 4 && 'Report'}
            </span>
          </div>
        ))}
      </div>
      <div className="h-1 bg-[#30363d] rounded-full overflow-hidden">
        <div 
          className="h-full bg-[#f0a500] transition-all duration-500"
          style={{ width: `${((currentStage - 1) / (totalStages - 1)) * 100}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
