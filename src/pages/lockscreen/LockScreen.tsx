import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle } from 'lucide-react';
import { PinDots } from '../../components/common/PinDots';
import { TactileKeypad } from '../../components/common/TactileKeypad';
import { NativeBridgeService } from '../../services/nativeBridge';
import { LocalStorageService } from '../../services/storage';

interface LockScreenProps {
  targetAppName?: string;
  targetPackageName?: string;
  onUnlockSuccess: () => void;
  onEmergencyExit?: () => void;
  isStandaloneOverlay?: boolean;
}

export const LockScreen: React.FC<LockScreenProps> = ({
  targetAppName = 'YouTube',
  targetPackageName = 'com.google.android.youtube',
  onUnlockSuccess,
  onEmergencyExit,
  isStandaloneOverlay = false,
}) => {
  const [pinLength, setPinLength] = useState<number>(4);
  const [currentPin, setCurrentPin] = useState<string>('');
  const [isError, setIsError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);

  useEffect(() => {
    const verifier = LocalStorageService.getPinVerifier();
    if (verifier?.pinLength) {
      setPinLength(verifier.pinLength);
    }
  }, []);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCooldownSeconds(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  const handleDigit = (digit: string) => {
    if (isVerifying || cooldownSeconds > 0 || currentPin.length >= pinLength) return;
    const nextPin = currentPin + digit;
    setCurrentPin(nextPin);
    setIsError(false);
    setErrorMessage('');

    if (nextPin.length === pinLength) {
      verifyEnteredPin(nextPin);
    }
  };

  const handleDelete = () => {
    if (isVerifying || cooldownSeconds > 0) return;
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
        await NativeBridgeService.requestUnlock(targetPackageName);
        onUnlockSuccess();
      } else {
        const nextAttempts = failedAttempts + 1;
        setFailedAttempts(nextAttempts);
        setIsError(true);

        if (nextAttempts >= 5) {
          setCooldownSeconds(30);
          setErrorMessage('Too many failed attempts. Wait 30 seconds.');
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

        <h1 className="text-sm font-mono font-bold tracking-[0.2em] text-white uppercase">
          HRTA SECURE SYSTEM
        </h1>

        <div className="w-32 h-[1px] bg-gradient-to-r from-transparent via-[#00F0FF]/60 to-transparent my-1.5" />

        <p className="text-[9px] font-mono tracking-widest text-[#94A3B8] uppercase">
          HARMAN RATHI TESTING AGENCY
        </p>
      </div>

      {/* CENTER — BIGGEST WARNING */}
      <div className="w-full max-w-xs flex flex-col items-center my-2 text-center space-y-3">
        <div className="flex flex-col items-center space-y-1">
          <div className="flex items-center space-x-2 text-[#EF4444] animate-pulse-glow">
            <span className="w-3 h-3 rounded-full bg-[#EF4444] shadow-glow-red" />
            <h2 className="text-2xl font-mono font-extrabold tracking-wider text-[#EF4444]">
              403 FORBIDDEN
            </h2>
          </div>

          <p className="text-xs font-mono font-bold tracking-wider text-white uppercase">
            ACCESS DENIED
          </p>
          <p className="text-[11px] font-mono text-[#94A3B8] uppercase tracking-wide">
            UNTIL CORRECT PIN ENTERED
          </p>
        </div>

        {/* TARGET APPLICATION CARD */}
        <div className="w-full p-3 rounded-2xl bg-[#0D131F] border-2 border-[#1F2B3E] shadow-tactile flex flex-col items-center justify-center space-y-0.5">
          <span className="text-lg font-bold text-white tracking-wide font-sans">
            {targetAppName}
          </span>
          <div className="flex items-center space-x-1.5 text-xs font-mono text-[#00F0FF] font-semibold tracking-wider uppercase">
            <Shield className="w-3.5 h-3.5 text-[#00F0FF]" />
            <span>SECURED BY HRTA SYSTEM</span>
          </div>
          <span className="text-[9px] font-mono text-[#64748B]">
            {targetPackageName}
          </span>
        </div>

        {/* ENTER PIN */}
        <div className="flex flex-col items-center pt-1">
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

        {onEmergencyExit && (
          <button
            type="button"
            onClick={onEmergencyExit}
            className="mt-2 text-[11px] font-mono text-[#64748B] hover:text-[#94A3B8] uppercase tracking-wider underline"
          >
            {isStandaloneOverlay ? 'Exit to Home' : 'Dismiss Simulation'}
          </button>
        )}
      </div>

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
