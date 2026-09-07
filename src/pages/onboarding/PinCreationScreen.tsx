import React, { useState } from 'react';
import { KeyRound, AlertCircle } from 'lucide-react';
import { PinDots } from '../../components/common/PinDots';
import { TactileKeypad } from '../../components/common/TactileKeypad';
import { Footer } from '../../components/common/Footer';
import { NativeBridgeService } from '../../services/nativeBridge';

interface PinCreationScreenProps {
  onPinCreated: () => void;
  onCancel?: () => void;
  isChangePinMode?: boolean;
}

export const PinCreationScreen: React.FC<PinCreationScreenProps> = ({
  onPinCreated,
  onCancel,
  isChangePinMode = false,
}) => {
  const [pinLength, setPinLength] = useState<number>(4);
  const [step, setStep] = useState<'create' | 'confirm'>('create');
  const [firstPin, setFirstPin] = useState<string>('');
  const [currentInput, setCurrentInput] = useState<string>('');
  const [isError, setIsError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const handleDigit = (digit: string) => {
    if (isProcessing || currentInput.length >= pinLength) return;
    const nextInput = currentInput + digit;
    setCurrentInput(nextInput);
    setIsError(false);
    setErrorMessage('');

    if (nextInput.length === pinLength) {
      handleCompleteInput(nextInput);
    }
  };

  const handleDelete = () => {
    if (isProcessing) return;
    setCurrentInput(prev => prev.slice(0, -1));
    setIsError(false);
  };

  const handleCompleteInput = async (completedPin: string) => {
    if (step === 'create') {
      setFirstPin(completedPin);
      setCurrentInput('');
      setStep('confirm');
    } else {
      if (completedPin === firstPin) {
        setIsProcessing(true);
        try {
          const success = await NativeBridgeService.setMasterPin(completedPin);
          if (success) {
            onPinCreated();
          } else {
            setIsError(true);
            setErrorMessage('Hardware cryptographic setup failed. Please retry.');
            setCurrentInput('');
            setStep('create');
            setFirstPin('');
          }
        } catch {
          setIsError(true);
          setErrorMessage('Cryptographic derivation failed. Please retry.');
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

  const handleTogglePinLength = (len: number) => {
    if (step === 'create' && currentInput.length === 0) {
      setPinLength(len);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#070A10] text-[#F8FAFC] px-6 py-6 select-none">
      <div className="flex flex-col items-center pt-4 text-center">
        <div className="flex items-center space-x-2 text-xs font-mono font-bold tracking-widest text-[#00F0FF] uppercase mb-2">
          <KeyRound className="w-4 h-4" />
          <span>{isChangePinMode ? 'SECURITY CREDENTIAL UPDATE' : 'FIRST-RUN SECURITY SETUP'}</span>
        </div>

        <h1 className="text-xl font-bold tracking-wide text-white uppercase font-mono mb-1">
          {step === 'create' ? 'CREATE YOUR PIN' : 'CONFIRM YOUR PIN'}
        </h1>

        <p className="text-xs text-[#94A3B8] max-w-xs font-mono">
          {step === 'create'
            ? 'Enter a 4 or 6-digit master PIN for application protection.'
            : 'Re-enter your PIN to verify.'}
        </p>

        {step === 'create' && (
          <div className="flex items-center space-x-2 mt-4 p-1 rounded-xl bg-[#0D131F] border border-[#1F2B3E]">
            <button
              type="button"
              onClick={() => handleTogglePinLength(4)}
              className={'px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ' + (pinLength === 4 ? 'bg-[#00F0FF] text-[#070A10] shadow-glow-cyan' : 'text-[#94A3B8] hover:text-white')}
            >
              4 DIGITS
            </button>
            <button
              type="button"
              onClick={() => handleTogglePinLength(6)}
              className={'px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ' + (pinLength === 6 ? 'bg-[#00F0FF] text-[#070A10] shadow-glow-cyan' : 'text-[#94A3B8] hover:text-white')}
            >
              6 DIGITS
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center my-4">
        <PinDots
          length={pinLength}
          valueLength={currentInput.length}
          isError={isError}
        />

        {errorMessage && (
          <div className="flex items-center space-x-1.5 text-xs text-[#EF4444] font-mono mt-2 bg-[#EF4444]/10 px-3 py-1 rounded-lg border border-[#EF4444]/30">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="text-[11px] font-mono text-[#64748B] mt-2">
          {step === 'create' ? 'Step 1 of 2' : 'Step 2 of 2: Confirmation'}
        </div>
      </div>

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
            className="mt-3 text-xs font-mono text-[#94A3B8] hover:text-white underline tracking-wider"
          >
            Cancel
          </button>
        )}

        <Footer systemStatus="SECURE PIN INITIALIZATION" className="pt-3 pb-1" />
      </div>
    </div>
  );
};
