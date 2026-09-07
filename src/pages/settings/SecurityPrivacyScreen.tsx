import React from 'react';
import { ArrowLeft, ShieldCheck, ServerOff, Cpu, EyeOff } from 'lucide-react';
import { Header } from '../../components/common/Header';
import { Footer } from '../../components/common/Footer';
import { PBKDF2_ITERATIONS } from '../../services/crypto';

interface SecurityPrivacyScreenProps {
  onBack: () => void;
}

export const SecurityPrivacyScreen: React.FC<SecurityPrivacyScreenProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#070A10] text-[#F8FAFC] select-none">
      <Header subtitle="SECURITY AUDIT" showStatus={false} />

      <main className="flex-1 px-4 py-5 space-y-5 max-w-lg mx-auto w-full">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-xl bg-[#0D131F] border border-[#1F2B3E] text-[#94A3B8] hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-bold font-mono text-white uppercase">
              LOCAL-FIRST ARCHITECTURE
            </h1>
            <p className="text-[11px] text-[#94A3B8]">Zero-Knowledge & Privacy Verification</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="p-4 rounded-2xl bg-[#0D131F] border border-[#1F2B3E] space-y-2">
            <div className="flex items-center space-x-2 text-[#10B981]">
              <ServerOff className="w-5 h-5" />
              <h2 className="text-xs font-bold font-mono uppercase tracking-wider">
                Zero Cloud Dependencies
              </h2>
            </div>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              HRTA App Lock operates 100% on-device. There is no remote backend, no Supabase, no Firebase, no Render, no Railway, and no external API. All data stays strictly in local device memory.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#0D131F] border border-[#1F2B3E] space-y-2">
            <div className="flex items-center space-x-2 text-[#00F0FF]">
              <Cpu className="w-5 h-5" />
              <h2 className="text-xs font-bold font-mono uppercase tracking-wider">
                Cryptographic PIN Derivation
              </h2>
            </div>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Your master PIN is never stored as plain text. It is derived using standard <span className="text-white font-mono font-semibold">PBKDF2-HMAC-SHA256</span> with <span className="text-[#00F0FF] font-mono font-semibold">{PBKDF2_ITERATIONS.toLocaleString()} iterations</span> and a unique 128-bit cryptographically secure random salt (<span className="font-mono text-white">SecureRandom</span>).
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#0D131F] border border-[#1F2B3E] space-y-2">
            <div className="flex items-center space-x-2 text-[#F59E0B]">
              <EyeOff className="w-5 h-5" />
              <h2 className="text-xs font-bold font-mono uppercase tracking-wider">
                Zero Telemetry or Analytics
              </h2>
            </div>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              No analytics SDKs, advertising trackers, crash reporters, or device identifiers are bundled in this build. We do not track which apps you open or how often you lock them.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#0D131F] border border-[#1F2B3E] space-y-2">
            <div className="flex items-center space-x-2 text-[#0066FF]">
              <ShieldCheck className="w-5 h-5" />
              <h2 className="text-xs font-bold font-mono uppercase tracking-wider">
                Realistic Security Posture
              </h2>
            </div>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              HRTA App Lock is designed to prevent unauthorized access to selected applications on your device. In accordance with modern Android security best practices, we never make claims of being "100% unbypassable."
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#070A10] border border-[#1F2B3E] text-center space-y-1">
          <span className="text-[10px] font-mono text-[#64748B] uppercase tracking-widest block">
            SIGNATURE & VERIFICATION
          </span>
          <p className="text-xs font-mono font-bold text-white uppercase">
            DEVELOPED BY HARMAN RATHI
          </p>
          <p className="text-[11px] font-mono text-[#00F0FF]">
            HRTA SECURE SYSTEM • REPO: harmanrathi2008-wq/hrta-app-lock
          </p>
        </div>
      </main>

      <Footer systemStatus="ZERO CLOUD VERIFIED" />
    </div>
  );
};
