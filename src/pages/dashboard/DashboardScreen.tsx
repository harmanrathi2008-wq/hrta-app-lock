import React, { useState, useEffect } from 'react';
import {
  Shield,
  Lock,
  KeyRound,
  Sliders,
  Smartphone,
  Eye,
  Info,
  Power,
  PlayCircle
} from 'lucide-react';
import { Header } from '../../components/common/Header';
import { Footer } from '../../components/common/Footer';
import { PermissionStatus } from '../../types';
import { NativeBridgeService } from '../../services/nativeBridge';

interface DashboardScreenProps {
  onManageApps: () => void;
  onChangePin: () => void;
  onOpenSettings: () => void;
  onOpenSecurityPrivacy: () => void;
  onOpenOemGuide: () => void;
  onSimulateLock: (appName: string, pkg: string) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  onManageApps,
  onChangePin,
  onOpenSettings,
  onOpenSecurityPrivacy,
  onOpenOemGuide,
  onSimulateLock,
}) => {
  const [protectedPackages, setProtectedPackages] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<PermissionStatus>({
    usageAccess: false,
    overlay: false,
  });
  const [isServiceRunning, setIsServiceRunning] = useState<boolean>(true);
  const [isTogglingService, setIsTogglingService] = useState<boolean>(false);

  useEffect(() => {
    const loadState = async () => {
      const [pkgs, perms, running] = await Promise.all([
        NativeBridgeService.getProtectedApps(),
        NativeBridgeService.getPermissionStatus(),
        NativeBridgeService.isServiceRunning(),
      ]);
      setProtectedPackages(pkgs);
      setPermissions(perms);
      setIsServiceRunning(running);
    };
    loadState();
  }, []);

  const handleToggleProtection = async () => {
    setIsTogglingService(true);
    try {
      if (isServiceRunning) {
        await NativeBridgeService.stopMonitoringService();
        setIsServiceRunning(false);
      } else {
        await NativeBridgeService.startMonitoringService();
        setIsServiceRunning(true);
      }
    } finally {
      setIsTogglingService(false);
    }
  };

  const allPermissionsGranted = permissions.usageAccess && permissions.overlay;

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#070A10] text-[#F8FAFC] select-none">
      <Header
        subtitle="SECURE SYSTEM"
        isProtected={isServiceRunning && allPermissionsGranted}
        showStatus={true}
      />

      <main className="flex-1 px-4 py-5 space-y-5 max-w-lg mx-auto w-full">
        {/* Status Hero Card */}
        <div className="p-5 rounded-3xl bg-[#0D131F] border border-[#1F2B3E] shadow-tactile relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-44 h-44 rounded-full bg-[#00F0FF]/5 blur-3xl pointer-events-none" />

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div
                className={'w-12 h-12 rounded-2xl flex items-center justify-center border transition-all ' + (isServiceRunning && allPermissionsGranted ? 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/40 shadow-glow-emerald' : 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/40 shadow-glow-red')}
              >
                <Shield className="w-6 h-6 fill-current" />
              </div>
              <div>
                <span className="text-[10px] font-mono tracking-widest text-[#00F0FF] uppercase font-bold">
                  HRTA ENGINE STATUS
                </span>
                <h2 className="text-lg font-bold font-mono text-white">
                  {isServiceRunning && allPermissionsGranted
                    ? 'PROTECTION ACTIVE'
                    : 'ATTENTION REQUIRED'}
                </h2>
              </div>
            </div>

            <button
              type="button"
              disabled={isTogglingService}
              onClick={handleToggleProtection}
              className={'p-3 rounded-2xl border transition-all active:scale-95 ' + (isServiceRunning ? 'bg-[#10B981]/15 border-[#10B981]/40 text-[#10B981]' : 'bg-[#1E293B] border-[#334155] text-[#94A3B8]')}
              title={isServiceRunning ? 'Pause Protection' : 'Activate Protection'}
            >
              <Power className="w-5 h-5" />
            </button>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 rounded-2xl bg-[#070A10]/70 border border-[#1F2B3E]">
              <span className="text-[10px] font-mono text-[#94A3B8] uppercase block">
                Protected Apps
              </span>
              <div className="flex items-baseline space-x-1.5 mt-1">
                <span className="text-2xl font-bold font-mono text-white">
                  {protectedPackages.length}
                </span>
                <span className="text-xs text-[#00F0FF] font-mono font-medium">active</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#070A10]/70 border border-[#1F2B3E]">
              <span className="text-[10px] font-mono text-[#94A3B8] uppercase block">
                Permissions
              </span>
              <div className="flex items-baseline space-x-1.5 mt-1">
                <span className="text-sm font-bold font-mono text-white">
                  {allPermissionsGranted ? '2/2 OK' : 'INCOMPLETE'}
                </span>
                <span
                  className={'w-2 h-2 rounded-full ' + (allPermissionsGranted ? 'bg-[#10B981]' : 'bg-[#EF4444]')}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Grid */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onManageApps}
            className="p-4 rounded-2xl bg-[#0D131F] border border-[#1F2B3E] hover:border-[#00F0FF]/40 text-left transition-all group active:scale-[0.98]"
          >
            <div className="p-2.5 rounded-xl bg-[#00F0FF]/10 text-[#00F0FF] w-fit mb-3 group-hover:scale-105 transition-transform">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold font-mono text-white uppercase tracking-wider">
              MANAGE APPS
            </h3>
            <p className="text-[11px] text-[#94A3B8] mt-0.5">
              Configure target protected packages
            </p>
          </button>

          <button
            type="button"
            onClick={onChangePin}
            className="p-4 rounded-2xl bg-[#0D131F] border border-[#1F2B3E] hover:border-[#00F0FF]/40 text-left transition-all group active:scale-[0.98]"
          >
            <div className="p-2.5 rounded-xl bg-[#10B981]/10 text-[#10B981] w-fit mb-3 group-hover:scale-105 transition-transform">
              <KeyRound className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold font-mono text-white uppercase tracking-wider">
              CHANGE PIN
            </h3>
            <p className="text-[11px] text-[#94A3B8] mt-0.5">
              Update local master security PIN
            </p>
          </button>

          <button
            type="button"
            onClick={onOpenSecurityPrivacy}
            className="p-4 rounded-2xl bg-[#0D131F] border border-[#1F2B3E] hover:border-[#00F0FF]/40 text-left transition-all group active:scale-[0.98]"
          >
            <div className="p-2.5 rounded-xl bg-[#0066FF]/10 text-[#00F0FF] w-fit mb-3 group-hover:scale-105 transition-transform">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold font-mono text-white uppercase tracking-wider">
              SECURITY AUDIT
            </h3>
            <p className="text-[11px] text-[#94A3B8] mt-0.5">
              Verify zero-cloud privacy architecture
            </p>
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="p-4 rounded-2xl bg-[#0D131F] border border-[#1F2B3E] hover:border-[#00F0FF]/40 text-left transition-all group active:scale-[0.98]"
          >
            <div className="p-2.5 rounded-xl bg-[#F59E0B]/10 text-[#F59E0B] w-fit mb-3 group-hover:scale-105 transition-transform">
              <Sliders className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold font-mono text-white uppercase tracking-wider">
              SETTINGS
            </h3>
            <p className="text-[11px] text-[#94A3B8] mt-0.5">
              Lock delay & device parameters
            </p>
          </button>
        </div>

        {/* Reusable Lock Screen Simulator */}
        <div className="p-4 rounded-2xl bg-[#0D131F] border border-[#1F2B3E] space-y-3">
          <div className="flex items-center space-x-2 text-xs font-mono font-bold text-white uppercase tracking-wider">
            <PlayCircle className="w-4 h-4 text-[#00F0FF]" />
            <span>TEST REUSABLE LOCK SCREEN</span>
          </div>

          <p className="text-xs text-[#94A3B8]">
            Test the dynamic HRTA lock screen across different application targets:
          </p>

          <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-xs">
            <button
              type="button"
              onClick={() => onSimulateLock('YouTube', 'com.google.android.youtube')}
              className="py-2 px-3 rounded-xl bg-[#1E293B] hover:bg-[#2A3B54] text-white flex items-center justify-between border border-[#334155] active:scale-95 transition-all"
            >
              <span>YouTube</span>
              <Eye className="w-3.5 h-3.5 text-[#00F0FF]" />
            </button>

            <button
              type="button"
              onClick={() => onSimulateLock('WhatsApp', 'com.whatsapp')}
              className="py-2 px-3 rounded-xl bg-[#1E293B] hover:bg-[#2A3B54] text-white flex items-center justify-between border border-[#334155] active:scale-95 transition-all"
            >
              <span>WhatsApp</span>
              <Eye className="w-3.5 h-3.5 text-[#00F0FF]" />
            </button>

            <button
              type="button"
              onClick={() => onSimulateLock('Settings', 'com.android.settings')}
              className="py-2 px-3 rounded-xl bg-[#1E293B] hover:bg-[#2A3B54] text-white flex items-center justify-between border border-[#334155] active:scale-95 transition-all"
            >
              <span>Settings</span>
              <Eye className="w-3.5 h-3.5 text-[#00F0FF]" />
            </button>

            <button
              type="button"
              onClick={() => onSimulateLock('Photos', 'com.google.android.apps.photos')}
              className="py-2 px-3 rounded-xl bg-[#1E293B] hover:bg-[#2A3B54] text-white flex items-center justify-between border border-[#334155] active:scale-95 transition-all"
            >
              <span>Photos</span>
              <Eye className="w-3.5 h-3.5 text-[#00F0FF]" />
            </button>
          </div>
        </div>

        {/* OEM Guide Link */}
        <div
          onClick={onOpenOemGuide}
          className="p-3.5 rounded-2xl bg-[#0D131F]/70 border border-[#1F2B3E] hover:border-[#F59E0B]/40 transition-all cursor-pointer flex items-center justify-between"
        >
          <div className="flex items-center space-x-3">
            <Smartphone className="w-5 h-5 text-[#F59E0B]" />
            <div>
              <span className="text-xs font-bold font-mono text-white">Samsung / OEM Optimization</span>
              <p className="text-[10px] text-[#94A3B8]">Optional background reliability settings</p>
            </div>
          </div>
          <Info className="w-4 h-4 text-[#94A3B8]" />
        </div>
      </main>

      <Footer systemStatus="SYSTEM STATUS: PROTECTED" />
    </div>
  );
};
