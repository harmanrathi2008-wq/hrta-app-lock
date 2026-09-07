import React, { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, ShieldAlert, Layers, Activity, ExternalLink, RefreshCw, ArrowRight } from 'lucide-react';
import { PermissionStatus } from '../../types';
import { NativeBridgeService } from '../../services/nativeBridge';
import { Footer } from '../../components/common/Footer';

interface PermissionScreenProps {
  onComplete: () => void;
}

export const PermissionScreen: React.FC<PermissionScreenProps> = ({ onComplete }) => {
  const [permissions, setPermissions] = useState<PermissionStatus>({
    usageAccess: false,
    overlay: false,
    batteryOptimizationIgnored: false,
  });
  const [isChecking, setIsChecking] = useState<boolean>(false);

  const checkPermissions = useCallback(async () => {
    setIsChecking(true);
    try {
      const status = await NativeBridgeService.getPermissionStatus();
      setPermissions(status);
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    checkPermissions();

    const handleFocus = () => {
      checkPermissions();
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [checkPermissions]);

  const handleOpenUsageSettings = async () => {
    await NativeBridgeService.openUsageSettings();
    setTimeout(checkPermissions, 1000);
  };

  const handleOpenOverlaySettings = async () => {
    await NativeBridgeService.openOverlaySettings();
    setTimeout(checkPermissions, 1000);
  };

  const allRequiredGranted = permissions.usageAccess && permissions.overlay;

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#070A10] text-[#F8FAFC] px-6 py-8 select-none">
      <div className="flex flex-col items-center pt-4 text-center">
        <div className="flex items-center space-x-2 text-xs font-mono font-bold tracking-widest text-[#00F0FF] uppercase mb-2">
          <ShieldCheck className="w-4 h-4" />
          <span>SECURITY ACCESS REQUIREMENTS</span>
        </div>

        <h1 className="text-xl font-bold tracking-wide text-white uppercase font-mono mb-2">
          REQUIRED PERMISSIONS
        </h1>

        <p className="text-xs text-[#94A3B8] max-w-xs leading-relaxed">
          To shield selected applications, HRTA requires 2 local Android capabilities. No data ever leaves your device.
        </p>
      </div>

      <div className="space-y-4 my-6 max-w-sm mx-auto w-full">
        {/* Usage Access */}
        <div className="p-4 rounded-2xl bg-[#0D131F] border border-[#1F2B3E] space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-[#00F0FF]/10 text-[#00F0FF]">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white font-mono">Usage Access</h2>
                <span className="text-[10px] text-[#00F0FF] uppercase font-mono tracking-wider font-semibold">
                  Active App Detection
                </span>
              </div>
            </div>

            {permissions.usageAccess ? (
              <span className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold text-[#10B981] bg-[#10B981]/15 border border-[#10B981]/30">
                <ShieldCheck className="w-3 h-3" />
                <span>GRANTED</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold text-[#EF4444] bg-[#EF4444]/15 border border-[#EF4444]/30">
                <ShieldAlert className="w-3 h-3" />
                <span>REQUIRED</span>
              </span>
            )}
          </div>

          <p className="text-xs text-[#94A3B8] leading-relaxed">
            Used only to determine which installed application is currently active so HRTA can protect selected apps.
          </p>

          {!permissions.usageAccess && (
            <button
              type="button"
              onClick={handleOpenUsageSettings}
              className="w-full py-2.5 px-4 rounded-xl bg-[#1F2B3E] hover:bg-[#2A3B54] text-[#00F0FF] font-mono text-xs font-bold tracking-wider flex items-center justify-center space-x-2 border border-[#00F0FF]/30 active:scale-98 transition-all"
            >
              <span>GRANT IN SETTINGS</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Display Over Other Apps */}
        <div className="p-4 rounded-2xl bg-[#0D131F] border border-[#1F2B3E] space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-[#00F0FF]/10 text-[#00F0FF]">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white font-mono">Display Over Other Apps</h2>
                <span className="text-[10px] text-[#00F0FF] uppercase font-mono tracking-wider font-semibold">
                  Security Shield Overlay
                </span>
              </div>
            </div>

            {permissions.overlay ? (
              <span className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold text-[#10B981] bg-[#10B981]/15 border border-[#10B981]/30">
                <ShieldCheck className="w-3 h-3" />
                <span>GRANTED</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold text-[#EF4444] bg-[#EF4444]/15 border border-[#EF4444]/30">
                <ShieldAlert className="w-3 h-3" />
                <span>REQUIRED</span>
              </span>
            )}
          </div>

          <p className="text-xs text-[#94A3B8] leading-relaxed">
            Used only to display the HRTA security lock screen when a protected application is opened.
          </p>

          {!permissions.overlay && (
            <button
              type="button"
              onClick={handleOpenOverlaySettings}
              className="w-full py-2.5 px-4 rounded-xl bg-[#1F2B3E] hover:bg-[#2A3B54] text-[#00F0FF] font-mono text-xs font-bold tracking-wider flex items-center justify-center space-x-2 border border-[#00F0FF]/30 active:scale-98 transition-all"
            >
              <span>GRANT IN SETTINGS</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex justify-center">
          <button
            type="button"
            onClick={checkPermissions}
            disabled={isChecking}
            className="flex items-center space-x-1.5 text-xs font-mono text-[#94A3B8] hover:text-[#00F0FF] transition-colors py-1"
          >
            <RefreshCw className={'w-3.5 h-3.5 ' + (isChecking ? 'animate-spin' : '')} />
            <span>Re-check Permission Status</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col items-center space-y-4 max-w-sm mx-auto w-full">
        <button
          type="button"
          onClick={onComplete}
          disabled={!allRequiredGranted}
          className={'w-full py-4 px-6 rounded-2xl font-bold text-base tracking-wider uppercase font-mono flex items-center justify-center space-x-2 transition-all ' + (allRequiredGranted ? 'bg-[#00F0FF] text-[#070A10] shadow-glow-cyan hover:bg-[#00D8E6] active:scale-[0.98]' : 'bg-[#1E293B] text-[#64748B] cursor-not-allowed border border-[#334155]')}
        >
          <span>{allRequiredGranted ? 'CONTINUE TO APP SELECTION' : 'GRANT PERMISSIONS TO CONTINUE'}</span>
          <ArrowRight className="w-5 h-5" />
        </button>

        <Footer systemStatus={allRequiredGranted ? 'PERMISSIONS VERIFIED' : 'PERMISSIONS PENDING'} />
      </div>
    </div>
  );
};
