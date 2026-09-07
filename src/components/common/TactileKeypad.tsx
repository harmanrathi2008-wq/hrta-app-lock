import React from 'react';
import { Delete, Check } from 'lucide-react';

interface TactileKeypadProps {
  onDigit: (digit: string) => void;
  onDelete: () => void;
  onSubmit?: () => void;
  showSubmit?: boolean;
  disabled?: boolean;
}

export const TactileKeypad: React.FC<TactileKeypadProps> = ({
  onDigit,
  onDelete,
  onSubmit,
  showSubmit = false,
  disabled = false,
}) => {
  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(12);
    }
  };

  const handleDigitPress = (digit: string) => {
    if (disabled) return;
    triggerHaptic();
    onDigit(digit);
  };

  const handleDeletePress = () => {
    if (disabled) return;
    triggerHaptic();
    onDelete();
  };

  const handleSubmitPress = () => {
    if (disabled || !onSubmit) return;
    triggerHaptic();
    onSubmit();
  };

  return (
    <div className="w-full max-w-xs mx-auto grid grid-cols-3 gap-3 px-2 py-2 select-none">
      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(digit => (
        <button
          key={digit}
          type="button"
          disabled={disabled}
          onClick={() => handleDigitPress(digit)}
          className="h-16 rounded-2xl bg-[#0D131F]/90 border border-[#1F2B3E] hover:border-[#00F0FF]/40 active:border-[#00F0FF] active:bg-[#00F0FF]/15 active:scale-95 transition-all duration-100 flex flex-col items-center justify-center text-2xl font-bold font-mono text-white shadow-tactile group disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span>{digit}</span>
        </button>
      ))}

      {/* Backspace Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={handleDeletePress}
        aria-label="Delete digit"
        className="h-16 rounded-2xl bg-[#0D131F]/90 border border-[#1F2B3E] hover:border-[#EF4444]/40 active:border-[#EF4444] active:bg-[#EF4444]/15 active:scale-95 transition-all duration-100 flex items-center justify-center text-[#94A3B8] hover:text-[#EF4444] shadow-tactile disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Delete className="w-6 h-6" />
      </button>

      {/* Zero Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => handleDigitPress('0')}
        className="h-16 rounded-2xl bg-[#0D131F]/90 border border-[#1F2B3E] hover:border-[#00F0FF]/40 active:border-[#00F0FF] active:bg-[#00F0FF]/15 active:scale-95 transition-all duration-100 flex flex-col items-center justify-center text-2xl font-bold font-mono text-white shadow-tactile group disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <span>0</span>
      </button>

      {/* Confirm / Submit Button */}
      {showSubmit ? (
        <button
          type="button"
          disabled={disabled}
          onClick={handleSubmitPress}
          aria-label="Submit PIN"
          className="h-16 rounded-2xl bg-[#00F0FF]/10 border border-[#00F0FF]/40 hover:border-[#00F0FF] hover:bg-[#00F0FF]/20 active:scale-95 transition-all duration-100 flex items-center justify-center text-[#00F0FF] shadow-glow-cyan disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Check className="w-6 h-6" />
        </button>
      ) : (
        <div className="h-16 rounded-2xl opacity-0 pointer-events-none" />
      )}
    </div>
  );
};