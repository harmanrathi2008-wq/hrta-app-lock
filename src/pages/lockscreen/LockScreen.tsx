import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Fingerprint, KeyRound, X } from 'lucide-react';
import { PinDots } from '../../components/common/PinDots';
import { TactileKeypad } from '../../components/common/TactileKeypad';
import { NativeBridgeService } from '../../services/nativeBridge';

interface LockScreenProps {
  targetAppName?: string;
  targetPackageName?: string;
  onUnlockSuccess: () => void;
  onEmergencyExit?: () => void;
  onForgotPin?: () => void;
  isStandaloneOverlay?: boolean;
}

export const LockScreen: React.FC<LockScreenProps> = ({
  targetAppName = 'YouTube',
  targetPackageName = 'com.google.android.youtube',
  onUnlockSuccess,
  onEmergencyExit,
  onForgotPin,
  isStandaloneOverlay = false,
}) => {
  const [pinLength, setPinLength] = useState<number>(4);
  const [currentPin, setCurrentPin] = useState<string>('');
  const [isError, setIsError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);

  // Recovery Modal State
  const [showRecoveryModal, setShowRecoveryModal] = useState<boolean>(false);
  const [recoveryKeyInput, setRecoveryKeyInput] = useState<string>('');
  const [recoveryError, setRecoveryError] = useState<string>('');
  const [isBiometricAvailable, setIsBiometricAvailable] = useState<boolean>(false);

  useEffect(() => {
    const checkStatus = async () => {
      const len = await NativeBridgeService.getPinLength();
      setPinLength(len);

      const bioRes = await NativeBridgeService.isBiometricAvailable();
      setIsBiometricAvailable(bioRes.available && bioRes.enrolled);
    };
    checkStatus();
  }, []);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCooldownSeconds(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  const handleDigit = (digit: string) => {
    if (isVerifying || cooldownSeconds > 0 || currentPin.length >= pinLength || showRecoveryModal) return;
    const nextPin = currentPin + digit;
    setCurrentPin(nextPin);
    setIsError(false);
    setErrorMessage('');

    if (nextPin.length === pinLength) {
      verifyEnteredPin(nextPin);
    }
  };

  const handleDelete = () => {
    if (isVerifying || cooldownSeconds > 0 || showRecoveryModal) return;
    setCurrentPin(prev => prev.slice(0, -1));
    setIsError(false);
  };

  const verifyEnteredPin = async (pinToVerify: string) => {
    setIsVerifying(true);
    try {
      const isValid = await NativeBridgeService.verifyMasterPin(pinToVerify);
      if (isValid) {
        setIsError(false);
        setFailedAttempts(0);
        // Pass entered PIN to native requestUnlock for strict authorization
        await NativeBridgeService.requestUnlock(targetPackageName, pinToVerify);
        onUnlockSuccess();
      } else {
        const nextAttempts = failedAttempts + 1;
        setFailedAttempts(nextAttempts);
        setIsError(true);

        if (nextAttempts >= 5) {
          setCooldownSeconds(30);
          setErrorMessage('Too many failed attempts. Locked for 30s.');
        } else {
          setErrorMessage('Access Denied. Incorrect PIN (' + (5 - nextAttempts) + ' attempts left)');
        }

        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([100, 50, 100]);
        }

        setTimeout(() => {
          setCurrentPin('');
          setIsError(false);
        }, 1000);
      }
    } catch {
      setIsError(true);
      setErrorMessage('Verification error. Please try again.');
      setCurrentPin('');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleBiometricRecovery = async () => {
    setRecoveryError('');
    const res = await NativeBridgeService.authenticateBiometric();
    if (res.success) {
      setShowRecoveryModal(false);
      if (onForgotPin) {
        onForgotPin();
      }
    } else {
      setRecoveryError(res.error || 'Biometric authentication cancelled');
    }
  };

  const handleRecoveryKeyVerify = async () => {
    if (!recoveryKeyInput.trim()) return;
    setRecoveryError('');
    const res = await NativeBridgeService.verifyRecoveryKey(recoveryKeyInput.trim());
    if (res.success) {
      setShowRecoveryModal(false);
      if (onForgotPin) {
        onForgotPin();
      }
    } else {
      if (res.lockoutSeconds && res.lockoutSeconds > 0) {
        setRecoveryError(`Recovery locked for ${res.lockoutSeconds}s.`);
      } else {
        setRecoveryError('Invalid Emergency Recovery Key.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#070A10] text-[#F8FAFC] flex flex-col justify-between items-center px-4 py-4 select-none overflow-y-auto min-h-screen">
      {/* TOP BRANDING */}
      <div className="w-full max-w-sm flex flex-col items-center pt-2 text-center">
        <div className="relative w-20 h-20 rounded-full p-0.5 bg-gradient-to-tr from-[#00F0FF] via-[#0066FF] to-transparent shadow-glow-cyan mb-2">
          <img
            src="/assets/hrta_logo.png"
            alt="HRTA Logo"
            className="w-full h-full object-contain rounded-full bg-[#070A10] p-0.5"
          />
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono font-bold tracking-widest text-[#00F0FF] uppercase mb-1">
          <Shield className="w-3.5 h-3.5" />
          <span>HRTA SECURE SYSTEM</span>
        </div>

        <div className="px-3 py-1 rounded-full bg-[#0D131F] border border-[#1F2B3E] flex items-center space-x-2 my-1">
          <span className="w-2 h-2 rounded-full bg-[#00F0FF] animate-ping" />
          <span className="text-xs font-mono text-white font-semibold">
            {targetAppName} is Locked
          </span>
        </div>
        <span className="text-[10px] font-mono text-[#64748B]">
          {targetPackageName}
        </span>
      </div>

      {/* PIN ENTRY DISPLAY */}
      <div className="w-full max-w-sm flex flex-col items-center my-auto py-2">
        <div className="flex flex-col items-center space-y-2">
          <span className="text-xs font-mono font-bold text-[#94A3B8] tracking-widest uppercase">
            ENTER YOUR PIN
          </span>

          <PinDots
            length={pinLength}
            valueLength={currentPin.length}
            isError={isError}
          />

          {errorMessage && (
            <div className="flex items-center space-x-1 text-[11px] font-mono text-[#EF4444] bg-[#EF4444]/10 px-2.5 py-0.5 rounded border border-[#EF4444]/30">
              <AlertTriangle className="w-3 h-3 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {cooldownSeconds > 0 && (
            <span className="text-[11px] font-mono text-[#F59E0B] mt-1">
              Cooldown active: {cooldownSeconds}s
            </span>
          )}
        </div>
      </div>

      {/* KEYPAD */}
      <div className="w-full max-w-xs flex flex-col items-center">
        <TactileKeypad
          onDigit={handleDigit}
          onDelete={handleDelete}
          onSubmit={() => verifyEnteredPin(currentPin)}
          showSubmit={currentPin.length === pinLength}
          disabled={isVerifying || cooldownSeconds > 0}
        />

        {/* FORGOT PIN TRIGGER */}
        <button
          type="button"
          onClick={() => setShowRecoveryModal(true)}
          className="mt-3 text-xs font-mono font-bold text-[#00F0FF] hover:underline uppercase tracking-wider py-1"
        >
          Forgot PIN?
        </button>

        {onEmergencyExit && (
          <button
            type="button"
            onClick={onEmergencyExit}
            className="mt-1 text-[11px] font-mono text-[#64748B] hover:text-[#94A3B8] uppercase tracking-wider underline"
          >
            {isStandaloneOverlay ? 'Exit to Home' : 'Dismiss Simulation'}
          </button>
        )}
      </div>

      {/* RECOVERY MODAL */}
      {showRecoveryModal && (
        <div className="fixed inset-0 z-50 bg-[#070A10]/95 backdrop-blur-md flex flex-col justify-center items-center px-6 py-6">
          <div className="w-full max-w-sm p-5 rounded-2xl bg-[#0D131F] border border-[#1F2B3E] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-mono font-bold text-[#00F0FF] uppercase">
                <KeyRound className="w-4 h-4" />
                <span>LOCAL RECOVERY</span>
              </div>
              <button
                type="button"
                onClick={() => setShowRecoveryModal(false)}
                className="text-[#94A3B8] hover:text-white text-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#94A3B8] font-mono">
              100% Offline Recovery. Authenticate via biometric hardware or your Emergency Recovery Key to authorize a new PIN.
            </p>

            {recoveryError && (
              <div className="p-2.5 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444] text-xs font-mono font-bold">
                {recoveryError}
              </div>
            )}

            {isBiometricAvailable && (
              <button
                type="button"
                onClick={handleBiometricRecovery}
                className="w-full py-3 rounded-xl bg-[#00F0FF]/15 border border-[#00F0FF]/40 text-[#00F0FF] font-mono text-xs font-bold flex items-center justify-center space-x-2 hover:bg-[#00F0FF]/25 active:scale-95 transition-all"
              >
                <Fingerprint className="w-4 h-4" />
                <span>VERIFY WITH BIOMETRICS</span>
              </button>
            )}

            <div className="space-y-2 pt-1 border-t border-[#1F2B3E]">
              <label className="text-[11px] font-mono font-bold text-[#94A3B8] uppercase">
                OR ENTER EMERGENCY RECOVERY KEY
              </label>
              <input
                type="text"
                placeholder="HRTA-XXXX-XXXX-XXXX-XXXX"
                value={recoveryKeyInput}
                onChange={e => setRecoveryKeyInput(e.target.value.toUpperCase())}
                className="w-full px-3 py-2.5 rounded-xl bg-[#070A10] border border-[#1F2B3E] text-white font-mono text-xs tracking-wider focus:outline-none focus:border-[#00F0FF]"
              />
              <button
                type="button"
                onClick={handleRecoveryKeyVerify}
                className="w-full py-2.5 rounded-xl bg-[#00F0FF] text-[#070A10] font-mono text-xs font-bold tracking-wider uppercase hover:bg-[#00D8E6] active:scale-95 transition-all"
              >
                Verify Recovery Key
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM FOOTER */}
      <div className="w-full max-w-sm flex flex-col items-center pt-2 pb-1 text-center space-y-1">
        <div className="flex items-center space-x-2 text-[10px] font-mono font-bold tracking-widest text-[#10B981] bg-[#10B981]/10 px-3 py-0.5 rounded-full border border-[#10B981]/30">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
          <span>SYSTEM STATUS: PROTECTED</span>
        </div>

        <p className="text-[10px] font-mono font-semibold tracking-widest text-[#94A3B8] uppercase">
          DEVELOPED BY HARMAN RATHI
        </p>
      </div>
    </div>
  );
};
