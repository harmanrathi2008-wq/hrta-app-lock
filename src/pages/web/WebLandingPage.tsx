import React, { useState } from 'react';
import { Download, Lock, Smartphone, ShieldAlert, Check } from 'lucide-react';
import { Footer } from '../../components/common/Footer';

interface WebLandingPageProps {
  onBlockedAccess: () => void;
}

export const WebLandingPage: React.FC<WebLandingPageProps> = ({ onBlockedAccess }) => {
  const [downloading, setDownloading] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);

  const handleDownload = () => {
    setDownloading(true);
    // Direct GitHub release or bundled APK link
    const downloadUrl = 'https://github.com/harmanrathi2008-wq/hrta-app-lock/releases/latest/download/hrta-app-lock.apk';
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', 'hrta-app-lock.apk');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setDownloading(false);
      setDownloadSuccess(true);
    }, 2000);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#070A10] text-[#F8FAFC] px-6 py-8 select-none">
      {/* Header Branding */}
      <div className="flex flex-col items-center pt-4 text-center max-w-md mx-auto w-full">
        <div className="relative w-28 h-28 rounded-full p-1 bg-gradient-to-tr from-[#00F0FF] via-[#0066FF] to-transparent shadow-glow-cyan mb-5">
          <img
            src="/assets/hrta_logo.png"
            alt="HRTA Logo"
            className="w-full h-full object-contain rounded-full bg-[#070A10] p-1"
          />
        </div>

        <span className="text-xs font-mono font-bold tracking-widest text-[#00F0FF] uppercase px-3 py-1 rounded-full bg-[#00F0FF]/10 border border-[#00F0FF]/30 mb-3 shadow-[0_0_12px_rgba(0,240,255,0.2)]">
          HRTA SECURE SYSTEM
        </span>

        <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2 font-mono">
          HRTA App Lock
        </h1>

        <p className="text-sm text-[#94A3B8] max-w-sm leading-relaxed mb-6">
          Designed to prevent unauthorized access. Protected by local device hardware.
        </p>

        {/* Primary Download Button */}
        <div className="w-full space-y-3 mb-6">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-[#00F0FF] via-[#00D8E6] to-[#00A3FF] hover:opacity-95 active:scale-[0.98] text-[#070A10] font-mono font-black text-sm tracking-wider uppercase shadow-glow-cyan transition-all flex items-center justify-center space-x-2.5 cursor-pointer disabled:opacity-75"
          >
            {downloadSuccess ? (
              <>
                <Check className="w-5 h-5 text-[#070A10]" />
                <span>APK Downloaded</span>
              </>
            ) : (
              <>
                <Download className="w-5 h-5 text-[#070A10] animate-bounce" />
                <span>{downloading ? 'Starting Download...' : 'Download HRTA App (APK)'}</span>
              </>
            )}
          </button>

          <div className="flex items-center justify-center space-x-3 text-[11px] font-mono text-[#64748B]">
            <span>Official APK v1.0.0</span>
            <span>•</span>
            <span>Android 8.0+</span>
            <span>•</span>
            <span>100% Offline</span>
          </div>
        </div>

        {/* Core Security Features */}
        <div className="space-y-3 w-full mb-6">
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

          <div className="flex items-center space-x-3.5 p-3.5 rounded-2xl bg-[#0D131F] border border-[#1F2B3E]">
            <div className="p-2 rounded-xl bg-[#10B981]/10 text-[#10B981]">
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Device-Only Hardware Guard
              </h2>
              <p className="text-[11px] text-[#94A3B8]">
                Runs natively on your phone to lock applications with instant overlay protection.
              </p>
            </div>
          </div>
        </div>

        {/* Security Gate Notice */}
        <div className="w-full p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-left mb-4">
          <div className="flex items-center space-x-2 text-red-400 font-mono font-bold text-xs mb-1">
            <ShieldAlert className="w-4 h-4 text-red-400" />
            <span>DIRECT WEB ACCESS RESTRICTED</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            HRTA App Lock cannot be executed directly in a desktop or web browser. Download and install the APK on your Android device to activate security.
          </p>
          <button
            onClick={onBlockedAccess}
            className="mt-3 text-[11px] font-mono font-bold text-red-400 hover:text-red-300 underline block cursor-pointer"
          >
            Attempt Direct Web Access →
          </button>
        </div>
      </div>

      {/* Footer Branding */}
      <Footer />
    </div>
  );
};
