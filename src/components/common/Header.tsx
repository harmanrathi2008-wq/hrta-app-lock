import React from 'react';
import { ShieldCheck, ShieldAlert } from 'lucide-react';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  isProtected?: boolean;
  onBack?: () => void;
  showStatus?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  subtitle = 'SECURE SYSTEM',
  isProtected = true,
  showStatus = true,
}) => {
  return (
    <header className="w-full flex items-center justify-between py-4 px-5 border-b border-[#1F2B3E] bg-[#070A10]/95 backdrop-blur-md sticky top-0 z-40">
      <div className="flex items-center space-x-3">
        <div className="relative w-10 h-10 rounded-full p-[1px] bg-gradient-to-tr from-[#00F0FF] via-[#0066FF] to-transparent shadow-glow-cyan">
          <img
            src="/assets/hrta_logo.png"
            alt="HRTA Logo"
            className="w-full h-full object-contain rounded-full bg-[#070A10] p-0.5"
          />
        </div>
        <div>
          <div className="flex items-center space-x-1.5">
            <span className="font-bold tracking-widest text-base text-white font-mono">HRTA</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#00F0FF] px-1.5 py-0.5 rounded bg-[#00F0FF]/10 border border-[#00F0FF]/20">
              {subtitle}
            </span>
          </div>
          <p className="text-[10px] text-[#94A3B8] tracking-wider uppercase font-medium">
            HARMAN RATHI TESTING AGENCY
          </p>
        </div>
      </div>

      {showStatus && (
        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium border border-[#1F2B3E] bg-[#0D131F]">
          {isProtected ? (
            <>
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
              <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
              <span className="text-[#10B981] text-[11px] font-semibold tracking-wide">ACTIVE</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
              <ShieldAlert className="w-3.5 h-3.5 text-[#EF4444]" />
              <span className="text-[#EF4444] text-[11px] font-semibold tracking-wide">PAUSED</span>
            </>
          )}
        </div>
      )}
    </header>
  );
};