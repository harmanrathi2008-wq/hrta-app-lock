import React from 'react';
import { Shield, Lock, Cpu } from 'lucide-react';
import { Footer } from '../../components/common/Footer';

interface WelcomeScreenProps {
  onStart: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart }) => {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#070A10] text-[#F8FAFC] px-6 py-8 select-none">
      {/* Header Branding */}
      <div className="flex flex-col items-center pt-8 text-center">
        <div className="relative w-28 h-28 rounded-full p-1 bg-gradient-to-tr from-[#00F0FF] via-[#0066FF] to-transparent shadow-glow-cyan mb-6">
          <img
            src="/assets/hrta_logo.png"
            alt="HRTA Logo"
            className="w-full h-full object-contain rounded-full bg-[#070A10] p-1"
          />
        </div>

        <span className="text-xs font-mono font-bold tracking-widest text-[#00F0FF] uppercase px-2.5 py-0.5 rounded bg-[#00F0FF]/10 border border-[#00F0FF]/25 mb-2">
          HRTA SECURE SYSTEM
        </span>

        <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
          HRTA App Lock
        </h1>

        <p className="text-sm text-[#94A3B8] max-w-xs leading-relaxed">
          Protect your selected apps with a local device PIN.
        </p>
      </div>

      {/* Feature Badges */}
      <div className="space-y-3 my-6 max-w-sm mx-auto w-full">
        <div className="flex items-center space-x-3.5 p-3.5 rounded-2xl bg-[#0D131F] border border-[#1F2B3E]">
          <div className="p-2 rounded-xl bg-[#00F0FF]/10 text-[#00F0FF]">
            <Lock className="w-5 h-5" />
          </div>
          <div className="text-left">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Zero-Cloud Privacy
            </h2>
            <p className="text-[11px] text-[#94A3B8]">
              100% local operation. No servers, telemetry, or data collection.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3.5 p-3.5 rounded-2xl bg-[#10B981]/10 text-[#10B981]">
          <Cpu className="w-5 h-5" />
        </div>
        <div className="text-left">
          <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
            Salted PBKDF2 Hashing
          </h2>
          <p className="text-[11px] text-[#94A3B8]">
            Cryptographic derivation. Your PIN is never stored in plain text.
          </p>
        </div>

        <div className="flex items-center space-x-3.5 p-3.5 rounded-2xl bg-[#0D131F] border border-[#1F2B3E]">
          <div className="p-2 rounded-xl bg-[#0066FF]/10 text-[#00F0FF]">
            <Shield className="w-5 h-5" />
          </div>
          <div className="text-left">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Native Android Shield
            </h2>
            <p className="text-[11px] text-[#94A3B8]">
              Designed to prevent unauthorized access using system overlay guard.
            </p>
          </div>
        </div>
      </div>

      {/* Action Button & Footer */}
      <div className="flex flex-col items-center space-y-4 max-w-sm mx-auto w-full">
        <button
          type="button"
          onClick={onStart}
          className="w-full py-4 px-6 rounded-2xl bg-[#00F0FF] text-[#070A10] font-bold text-base tracking-wider uppercase font-mono shadow-glow-cyan hover:bg-[#00D8E6] active:scale-[0.98] transition-all flex items-center justify-center space-x-2"
        >
          <span>GET STARTED</span>
          <Shield className="w-5 h-5 fill-current" />
        </button>

        <Footer systemStatus="READY TO INITIALIZE" />
      </div>
    </div>
  );
};