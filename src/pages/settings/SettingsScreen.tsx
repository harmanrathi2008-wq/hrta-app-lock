import React, { useState } from 'react';
import { ArrowLeft, Clock, Vibrate, ShieldAlert, RefreshCw } from 'lucide-react';
import { Header } from '../../components/common/Header';
import { Footer } from '../../components/common/Footer';
import { RelockBehavior } from '../../types';
import { LocalStorageService } from '../../services/storage';
import { NativeBridgeService } from '../../services/nativeBridge';

interface SettingsScreenProps {
  onBack: () => void;
  onResetApp: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBack, onResetApp }) => {
  const [config, setConfig] = useState(LocalStorageService.getLockConfig());
  const [showConfirmReset, setShowConfirmReset] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isResetting, setIsResetting] = useState<boolean>(false);

  const handleUpdateRelock = async (behavior: RelockBehavior) => {
    const prev = config;
    const updated = { ...config, relockBehavior: behavior };
    setConfig(updated);
    setErrorMessage('');
    const success = await NativeBridgeService.saveLockConfig(updated);
    if (!success) {
      setConfig(prev);
      setErrorMessage('Failed to save relock setting to device storage.');
    }
  };

  const handleToggleHaptics = async () => {
    const prev = config;
    const updated = { ...config, hapticsEnabled: !config.hapticsEnabled };
    setConfig(updated);
    setErrorMessage('');
    const success = await NativeBridgeService.saveLockConfig(updated);
    if (!success) {
      setConfig(prev);
      setErrorMessage('Failed to save haptics setting to device storage.');
    }
  };

  const relockOptions: { id: RelockBehavior; label: string; desc: string }[] = [
    { id: 'IMMEDIATELY', label: 'Immediately', desc: 'Relock as soon as you switch away from the protected app' },
    { id: 'SCREEN_OFF', label: 'Screen Lock', desc: 'Relock only when device display is turned off' },
    { id: 'TIMEOUT_1_MIN', label: '1 Minute Grace', desc: 'Allow 60 seconds of unlocked access before relocking' },
    { id: 'TIMEOUT_5_MIN', label: '5 Minutes Grace', desc: 'Allow 5 minutes before re-prompting for PIN' },
  ];

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#070A10] text-[#F8FAFC] select-none">
      <Header subtitle="SETTINGS" showStatus={false} />

      <main className="flex-1 px-4 py-5 space-y-6 max-w-lg mx-auto w-full">
        {/* Back navigation */}
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-xl bg-[#0D131F] border border-[#1F2B3E] text-[#94A3B8] hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-bold font-mono text-white uppercase">
            LOCK PREFERENCES
          </h1>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444] text-xs font-mono font-bold flex items-center justify-between">
            <span>{errorMessage}</span>
            <button
              type="button"
              onClick={() => setErrorMessage('')}
              className="text-[#EF4444] hover:text-white text-sm ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Relock Behavior Selection */}
        <div className="p-4 rounded-2xl bg-[#0D131F] border border-[#1F2B3E] space-y-3">
          <div className="flex items-center space-x-2 text-xs font-mono font-bold text-[#00F0FF] uppercase tracking-wider">
            <Clock className="w-4 h-4" />
            <span>RELOCK BEHAVIOR</span>
          </div>

          <div className="space-y-2 pt-1">
            {relockOptions.map(opt => (
              <div
                key={opt.id}
                onClick={() => handleUpdateRelock(opt.id)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  config.relockBehavior === opt.id
                    ? 'bg-[#00F0FF]/10 border-[#00F0FF]/50 text-white shadow-glow-cyan'
                    : 'bg-[#070A10]/60 border-[#1F2B3E] text-[#94A3B8] hover:border-[#2A3B54]'
                }`}
              >
                <div>
                  <h2 className="text-xs font-bold font-mono text-white">{opt.label}</h2>
                  <p className="text-[11px] text-[#94A3B8] mt-0.5">{opt.desc}</p>
                </div>
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    config.relockBehavior === opt.id
                      ? 'border-[#00F0FF] bg-[#00F0FF]'
                      : 'border-[#334155]'
                  }`}
                >
                  {config.relockBehavior === opt.id && (
                    <div className="w-1.5 h-1.5 rounded-full bg-[#070A10]" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tactile Feedback */}
        <div className="p-4 rounded-2xl bg-[#0D131F] border border-[#1F2B3E] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-[#00F0FF]/10 text-[#00F0FF]">
              <Vibrate className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xs font-bold font-mono text-white">Keypad Haptics</h2>
              <p className="text-[11px] text-[#94A3B8]">Vibrate slightly on keypad touches</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleToggleHaptics}
            className={`w-12 h-7 rounded-full transition-colors relative border ${
              config.hapticsEnabled
                ? 'bg-[#00F0FF] border-[#00F0FF]'
                : 'bg-[#1E293B] border-[#334155]'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                config.hapticsEnabled ? 'translate-x-6 bg-[#070A10]' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Reset / Clear Data */}
        <div className="p-4 rounded-2xl bg-[#0D131F] border border-[#1F2B3E] space-y-3">
          <div className="flex items-center space-x-2 text-xs font-mono font-bold text-[#EF4444] uppercase tracking-wider">
            <ShieldAlert className="w-4 h-4" />
            <span>RESET APPLICATION</span>
          </div>

          <p className="text-xs text-[#94A3B8]">
            Clear locally stored PIN verifier and reset all protected app selections.
          </p>

          {showConfirmReset ? (
            <div className="space-y-2 pt-1">
              <p className="text-xs text-[#EF4444] font-mono font-bold">
                Are you sure? This will remove your PIN and reset all configuration.
              </p>
              <div className="flex space-x-2">
                <button
                  type="button"
                  disabled={isResetting}
                  onClick={async () => {
                    setIsResetting(true);
                    setErrorMessage('');
                    const success = await NativeBridgeService.resetAllData();
                    setIsResetting(false);
                    if (success) {
                      onResetApp();
                    } else {
                      setErrorMessage('Failed to reset native security data. Please try again.');
                      setShowConfirmReset(false);
                    }
                  }}
                  className="flex-1 py-2 rounded-xl bg-[#EF4444] text-white text-xs font-mono font-bold active:scale-95 transition-all disabled:opacity-50"
                >
                  {isResetting ? 'Resetting...' : 'Yes, Reset Now'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmReset(false)}
                  className="flex-1 py-2 rounded-xl bg-[#1E293B] text-[#94A3B8] text-xs font-mono font-bold active:scale-95 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowConfirmReset(true)}
              className="py-2 px-4 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30 hover:bg-[#EF4444]/25 text-[#EF4444] text-xs font-mono font-bold active:scale-95 transition-all flex items-center space-x-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset All Data</span>
            </button>
          )}
        </div>
      </main>

      <Footer systemStatus="SETTINGS ACTIVE" />
    </div>
  );
};