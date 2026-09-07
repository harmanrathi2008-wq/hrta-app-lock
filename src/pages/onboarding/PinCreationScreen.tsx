import React, { useState } from 'react';
import { KeyRound, AlertCircle, ShieldCheck, Copy, Check, Fingerprint } from 'lucide-react';
import { PinDots } from '../../components/common/PinDots';
import { TactileKeypad } from '../../components/common/TactileKeypad';
import { Footer } from '../../components/common/Footer';
import { NativeBridgeService } from '../../services/nativeBridge';

interface PinCreationScreenProps {
  onPinCreated: () => void;
  onCancel?: () => void;
  isChangePinMode?: boolean;
  isRecoveryReset?: boolean;
}

export const PinCreationScreen: React.FC<PinCreationScreenProps> = ({
  onPinCreated,
  onCancel,
  isChangePinMode = false,
  isRecoveryReset = false,
}) => {
  const [pinLength, setPinLength] = useState<number>(4);
  const [step, setStep] = useState<'create' | 'confirm' | 'recovery_modal'>('create');
  const [firstPin, setFirstPin] = useState<string>('');
  const [currentInput, setCurrentInput] = useState<string>('');
  const [isError, setIsError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Recovery Key State for Onboarding
  const [generatedRecoveryKey, setGeneratedRecoveryKey] = useState<string>('');
  const [isBiometricAvailable, setIsBiometricAvailable] = useState<boolean>(false);
  const [hasCopiedKey, setHasCopiedKey] = useState<boolean>(false);
  const [hasConfirmedSave, setHasConfirmedSave] = useState<boolean>(false);

  const handleDigit = (digit: string) => {
    if (isProcessing || currentInput.length >= pinLength || step === 'recovery_modal') return;
    const nextInput = currentInput + digit;
    setCurrentInput(nextInput);
    setIsError(false);
    setErrorMessage('');

    if (nextInput.length === pinLength) {
      handleCompleteInput(nextInput);
    }
  };

  const handleDelete = () => {
    if (isProcessing || step === 'recovery_modal') return;
    setCurrentInput(prev => prev.slice(0, -1));
    setIsError(false);
  };

  const handleCompleteInput = async (completedPin: string) => {
    if (step === 'create') {
      setFirstPin(completedPin);
      setCurrentInput('');
      setStep('confirm');
    } else if (step === 'confirm') {
      if (completedPin === firstPin) {
        setIsProcessing(true);
        try {
          if (isRecoveryReset) {
            // Recovery reset mode: native authorization flag required
            const res = await NativeBridgeService.resetPinAfterRecovery(completedPin);
            if (res.success) {
              if (res.newRecoveryKey) {
                // Key was rotated upon recovery
                setGeneratedRecoveryKey(res.newRecoveryKey);
                setStep('recovery_modal');
              } else {
                onPinCreated();
              }
            } else {
              setIsError(true);
              setErrorMessage('Recovery authorization expired or invalid. Please retry.');
              setCurrentInput('');
              setStep('create');
              setFirstPin('');
            }
          } else if (isChangePinMode) {
            // Normal PIN change mode
            const success = await NativeBridgeService.setMasterPin(completedPin);
            if (success) {
              onPinCreated();
            } else {
              setIsError(true);
              setErrorMessage('Failed to update PIN verifier.');
              setCurrentInput('');
              setStep('create');
              setFirstPin('');
            }
          } else {
            // Initial First-Run Onboarding Setup: PIN + Biometrics + Recovery Key generated upfront!
            const success = await NativeBridgeService.setMasterPin(completedPin);
            if (success) {
              // 1. Generate Emergency Recovery Key (>= 80 bits entropy)
              const recKeyRes = await NativeBridgeService.generateRecoveryKey();
              // 2. Check Biometric readiness
              const bioRes = await NativeBridgeService.isBiometricAvailable();
              setIsBiometricAvailable(bioRes.available && bioRes.enrolled);

              if (recKeyRes.success && recKeyRes.key) {
                setGeneratedRecoveryKey(recKeyRes.key);
                setStep('recovery_modal');
              } else {
                onPinCreated();
              }
            } else {
              setIsError(true);
              setErrorMessage('Hardware cryptographic setup failed. Please retry.');
              setCurrentInput('');
              setStep('create');
              setFirstPin('');
            }
          }
        } catch {
          setIsError(true);
          setErrorMessage('Cryptographic derivation error. Please retry.');
          setCurrentInput('');
          setStep('create');
          setFirstPin('');
        } finally {
          setIsProcessing(false);
        }
      } else {
        setIsError(true);
        setErrorMessage('PINs do not match. Please try again.');
        setTimeout(() => {
          setCurrentInput('');
          setStep('create');
          setFirstPin('');
          setIsError(false);
        }, 1200);
      }
    }
  };

  const handleCopyKey = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(generatedRecoveryKey);
      setHasCopiedKey(true);
      setTimeout(() => setHasCopiedKey(false), 2000);
    }
  };

  const handleTogglePinLength = (len: number) => {
    if (step === 'create' && currentInput.length === 0) {
      setPinLength(len);
    }
  };

  // RECOVERY KEY CONFIRMATION MODAL
  if (step === 'recovery_modal') {
    return (
      <div className="min-h-screen flex flex-col justify-between bg-[#070A10] text-[#F8FAFC] px-6 py-6 select-none">
        <div className="flex flex-col items-center pt-4 text-center">
          <div className="p-3 rounded-2xl bg-[#00F0FF]/10 text-[#00F0FF] mb-3">
            <ShieldCheck className="w-8 h-8" />
          </div>

          <h1 className="text-xl font-bold tracking-wide text-white uppercase font-mono mb-1">
            {isRecoveryReset ? 'NEW RECOVERY KEY GENERATED' : 'EMERGENCY RECOVERY KEY'}
          </h1>
          <p className="text-xs text-[#94A3B8] font-mono max-w-xs mb-6">
            100% Local-First Security. Record this key offline. It will NEVER be shown again and cannot be recovered if lost.
          </p>

          {/* Key Display Card */}
          <div className="w-full max-w-sm p-4 rounded-2xl bg-[#0D131F] border border-[#00F0FF]/30 space-y-3">
            <div className="flex items-center justify-between text-[11px] font-mono font-bold text-[#00F0FF] uppercase">
              <span>LOCAL RECOVERY CREDENTIAL</span>
              <span className="text-emerald-400">≥ 80 BITS ENTROPY</span>
            </div>

            <div className="p-3 rounded-xl bg-[#070A10] border border-[#1F2B3E] flex items-center justify-between">
              <span className="font-mono text-sm tracking-wider font-bold text-white select-all">
                {generatedRecoveryKey}
              </span>
              <button
                type="button"
                onClick={handleCopyKey}
                className="p-2 rounded-lg bg-[#1F2B3E] hover:bg-[#00F0FF]/20 text-[#00F0FF] transition-all ml-2"
              >
                {hasCopiedKey ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            {isBiometricAvailable && (
              <div className="flex items-center space-x-2 text-[11px] text-[#10B981] font-mono pt-1">
                <Fingerprint className="w-4 h-4 shrink-0" />
                <span>Device biometric hardware recovery is active.</span>
              </div>
            )}
          </div>

          {/* Mandatory Confirmation Checkbox */}
          <label className="flex items-start space-x-3 max-w-sm text-left mt-6 cursor-pointer p-3 rounded-xl bg-[#0D131F]/50 border border-[#1F2B3E]">
            <input
              type="checkbox"
              checked={hasConfirmedSave}
              onChange={e => setHasConfirmedSave(e.target.checked)}
              className="mt-1 w-4 h-4 rounded bg-[#070A10] border-[#334155] text-[#00F0FF] focus:ring-0"
            />
            <span className="text-xs text-[#94A3B8] font-mono leading-relaxed">
              I have safely recorded this Emergency Recovery Key offline. I understand that HRTA is zero-cloud and cannot recover this key for me.
            </span>
          </label>
        </div>

        <div className="w-full max-w-sm mx-auto space-y-3 pt-4">
          <button
            type="button"
            disabled={!hasConfirmedSave}
            onClick={onPinCreated}
            className="w-full py-4 rounded-xl bg-[#00F0FF] text-[#070A10] font-mono font-bold tracking-widest uppercase hover:bg-[#00D8E6] active:scale-95 transition-all shadow-glow-cyan disabled:opacity-30 disabled:pointer-events-none"
          >
            Complete Security Setup
          </button>
          <Footer />
        </div>
      </div>
    );
  }

  // PIN CREATION & CONFIRMATION KEYPAD VIEW
  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#070A10] text-[#F8FAFC] px-6 py-6 select-none">
      <div className="flex flex-col items-center pt-4 text-center">
        <div className="flex items-center space-x-2 text-xs font-mono font-bold tracking-widest text-[#00F0FF] uppercase mb-2">
          <KeyRound className="w-4 h-4" />
          <span>
            {isRecoveryReset
              ? 'RECOVERY AUTHORIZED • SET NEW PIN'
              : isChangePinMode
              ? 'SECURITY CREDENTIAL UPDATE'
              : 'FIRST-RUN SECURITY SETUP'}
          </span>
        </div>

        <h1 className="text-xl font-bold tracking-wide text-white uppercase font-mono mb-1">
          {step === 'create' ? 'Create Master PIN' : 'Confirm Master PIN'}
        </h1>
        <p className="text-xs text-[#94A3B8] font-mono max-w-xs mb-4">
          {step === 'create'
            ? 'Enter a 4 or 6 digit PIN. This key unlocks protected applications locally.'
            : 'Re-enter your PIN to verify exact cryptographic match.'}
        </p>

        {/* PIN Length Selector */}
        {step === 'create' && currentInput.length === 0 && (
          <div className="flex space-x-2 mb-6 bg-[#0D131F] p-1 rounded-xl border border-[#1F2B3E]">
            <button
              type="button"
              onClick={() => handleTogglePinLength(4)}
              className={`px-4 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                pinLength === 4
                  ? 'bg-[#00F0FF] text-[#070A10] shadow-glow-cyan'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              4 DIGITS
            </button>
            <button
              type="button"
              onClick={() => handleTogglePinLength(6)}
              className={`px-4 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                pinLength === 6
                  ? 'bg-[#00F0FF] text-[#070A10] shadow-glow-cyan'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              6 DIGITS
            </button>
          </div>
        )}

        {/* Pin Dots */}
        <div className="my-4">
          <PinDots length={pinLength} valueLength={currentInput.length} isError={isError} />
        </div>

        {/* Error Message */}
        {isError && (
          <div className="flex items-center space-x-1.5 text-xs text-[#EF4444] font-mono mt-2 animate-shake">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Keypad & Controls */}
      <div className="w-full max-w-sm mx-auto flex flex-col items-center">
        <TactileKeypad
          onDigit={handleDigit}
          onDelete={handleDelete}
          disabled={isProcessing}
        />

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="mt-4 text-xs font-mono text-[#94A3B8] hover:text-white transition-colors"
          >
            Cancel
          </button>
        )}

        <div className="mt-4">
          <Footer />
        </div>
      </div>
    </div>
  );
};
