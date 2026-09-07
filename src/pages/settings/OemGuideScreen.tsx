import React from 'react';
import { ArrowLeft, Smartphone, Info, ExternalLink, BatteryCharging } from 'lucide-react';
import { Header } from '../../components/common/Header';
import { Footer } from '../../components/common/Footer';
import { NativeBridgeService } from '../../services/nativeBridge';

interface OemGuideScreenProps {
  onBack: () => void;
}

export const OemGuideScreen: React.FC<OemGuideScreenProps> = ({ onBack }) => {
  const handleOpenBatterySettings = async () => {
    await NativeBridgeService.openBatteryOptimizationSettings();
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#070A10] text-[#F8FAFC] select-none">
      <Header subtitle="OEM GUIDE" showStatus={false} />

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
              SAMSUNG & OEM COMPATIBILITY
            </h1>
            <p className="text-[11px] text-[#94A3B8]">Background Reliability Guidelines</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#00F0FF]/5 border border-[#00F0FF]/30 space-y-2">
          <div className="flex items-center space-x-2 text-[#00F0FF]">
            <Info className="w-4 h-4" />
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider">
              Notice: Battery Exemption is Optional
            </h2>
          </div>
          <p className="text-xs text-[#94A3B8] leading-relaxed">
            HRTA App Lock functions with standard Android foreground services and does not strictly require battery exemption to run. However, manufacturer task killers (such as Samsung One UI or Xiaomi MIUI) may aggressively sleep third-party apps after hours of inactivity.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-[#0D131F] border border-[#1F2B3E] space-y-3">
          <div className="flex items-center space-x-2 text-white font-mono font-bold text-xs uppercase">
            <Smartphone className="w-4 h-4 text-[#F59E0B]" />
            <span>Samsung One UI Recommended Settings</span>
          </div>

          <ol className="space-y-2.5 text-xs text-[#94A3B8] list-decimal list-inside leading-relaxed">
            <li>
              <strong className="text-white">Battery Usage:</strong> Go to <span className="text-[#00F0FF] font-mono">Settings &gt; Apps &gt; HRTA App Lock &gt; Battery</span> and select <span className="text-white font-semibold">"Unrestricted"</span>.
            </li>
            <li>
              <strong className="text-white">Never Sleeping Apps:</strong> In <span className="text-[#00F0FF] font-mono">Settings &gt; Battery &gt; Background usage limits</span>, add HRTA App Lock to <span className="text-white font-semibold">"Never sleeping apps"</span>.
            </li>
            <li>
              <strong className="text-white">App Switcher Lock:</strong> Open recent apps, tap the HRTA icon, and choose <span className="text-white font-semibold">"Lock this app"</span> to keep the monitor active.
            </li>
          </ol>

          <button
            type="button"
            onClick={handleOpenBatterySettings}
            className="w-full py-2.5 px-4 rounded-xl bg-[#1F2B3E] hover:bg-[#2A3B54] text-[#00F0FF] font-mono text-xs font-bold tracking-wider flex items-center justify-center space-x-2 border border-[#00F0FF]/30 active:scale-98 transition-all mt-2"
          >
            <BatteryCharging className="w-4 h-4" />
            <span>Open Battery Optimization Settings</span>
            <ExternalLink className="w-3.5 h-3.5 ml-1" />
          </button>
        </div>

        <div className="p-4 rounded-2xl bg-[#0D131F] border border-[#1F2B3E] space-y-2">
          <h2 className="text-xs font-mono font-bold text-white uppercase">
            Xiaomi / Oppo / Vivo Devices
          </h2>
          <p className="text-xs text-[#94A3B8] leading-relaxed">
            Enable <span className="text-white font-semibold">"Autostart"</span> for HRTA App Lock in your device Security settings, and set Battery Saver to <span className="text-white font-semibold">"No restrictions"</span>.
          </p>
        </div>
      </main>

      <Footer systemStatus="COMPATIBILITY ENGINE" />
    </div>
  );
};
