import React from 'react';
import { Lock, Shield } from 'lucide-react';

interface FooterProps {
  systemStatus?: string;
  className?: string;
}

export const Footer: React.FC<FooterProps> = ({
  systemStatus = 'SYSTEM STATUS: PROTECTED',
  className = '',
}) => {
  return (
    <footer className={'w-full py-5 px-4 flex flex-col items-center justify-center space-y-2 text-center select-none ' + className}>
      <div className="flex items-center space-x-2 text-[11px] font-mono tracking-wider font-semibold text-[#10B981] bg-[#10B981]/10 px-3 py-1 rounded-full border border-[#10B981]/25">
        <Shield className="w-3.5 h-3.5 text-[#10B981]" />
        <span>{systemStatus}</span>
      </div>

      <div className="flex flex-col items-center space-y-0.5 pt-1">
        <p className="text-[11px] font-mono tracking-widest text-[#94A3B8] uppercase font-semibold">
          DEVELOPED BY HARMAN RATHI
        </p>
        <div className="flex items-center space-x-1.5 text-[9px] font-mono text-[#64748B] tracking-wider">
          <Lock className="w-2.5 h-2.5" />
          <span>LOCAL-FIRST • ZERO NETWORK CALLS • PRIVACY GUARANTEED</span>
        </div>
      </div>
    </footer>
  );
};
