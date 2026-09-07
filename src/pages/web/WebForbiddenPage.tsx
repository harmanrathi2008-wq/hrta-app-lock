import React from 'react';
import { ShieldAlert, Download, ArrowLeft } from 'lucide-react';
import { Footer } from '../../components/common/Footer';

interface WebForbiddenPageProps {
  onBackToLanding: () => void;
}

export const WebForbiddenPage: React.FC<WebForbiddenPageProps> = ({ onBackToLanding }) => {
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = 'https://github.com/harmanrathi2008-wq/hrta-app-lock/releases/download/v1.0.0/hrta-app-lock.apk';
    link.setAttribute('download', 'hrta-app-lock.apk');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#07090E] text-[#F8FAFC] px-6 py-8 select-none relative overflow-hidden">
      {/* Background Red Ambient Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Header */}
      <div className="flex flex-col items-center pt-8 text-center max-w-md mx-auto w-full relative z-10">
        <div className="w-20 h-20 rounded-2xl bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center text-red-500 mb-6 shadow-[0_0_25px_rgba(239,68,68,0.25)]">
          <ShieldAlert className="w-10 h-10 animate-pulse" />
        </div>

        <span className="text-xs font-mono font-bold tracking-widest text-red-400 uppercase px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 mb-3">
          403 FORBIDDEN
        </span>

        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-2 font-mono">
          DIRECT ACCESS RESTRICTED
        </h1>

        <p className="text-xs font-mono text-red-400 uppercase tracking-wider mb-4 font-bold">
          HRTA SECURE SYSTEM • GATE ENFORCED
        </p>

        <p className="text-sm text-slate-400 max-w-sm leading-relaxed mb-8">
          Direct browser execution is prohibited. HRTA App Lock operates strictly on your Android mobile device using local hardware security to guarantee 100% privacy.
        </p>

        {/* Action Buttons */}
        <div className="w-full space-y-3 max-w-xs">
          <button
            onClick={handleDownload}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 active:scale-[0.98] text-white font-mono font-bold text-sm tracking-wider uppercase shadow-[0_0_25px_rgba(239,68,68,0.35)] transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download APK (Phone)</span>
          </button>

          <button
            onClick={onBackToLanding}
            className="w-full py-3 px-6 rounded-2xl bg-[#0D131F] hover:bg-[#131B2E] border border-[#1F2B3E] active:scale-[0.98] text-slate-300 font-mono font-semibold text-xs tracking-wider uppercase transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
            <span>Return to Download Page</span>
          </button>
        </div>
      </div>

      {/* Footer Branding */}
      <Footer />
    </div>
  );
};
