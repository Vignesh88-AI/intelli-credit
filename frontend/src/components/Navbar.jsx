import React from 'react';
import { CreditCard } from 'lucide-react';

const Navbar = () => {
  return (
    <nav className="glass py-4 px-8 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-2">
        <CreditCard className="text-[#f0a500]" size={28} />
        <span className="text-xl font-bold tracking-tight">
          Intelli-<span className="text-[#f0a500]">Credit</span>
        </span>
      </div>
      <div className="flex items-center gap-6">
        <span className="text-sm font-medium opacity-70">Corporate Appraisal System</span>
        <div className="h-8 w-8 rounded-full bg-[#f0a500] flex items-center justify-center text-black font-bold">
          VC
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
