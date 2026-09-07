import React from 'react';

interface PinDotsProps {
  length: number;
  valueLength: number;
  isError?: boolean;
}

export const PinDots: React.FC<PinDotsProps> = ({
  length,
  valueLength,
  isError = false,
}) => {
  return (
    <div
      className={'flex items-center justify-center space-x-3.5 my-3 ' + (isError ? 'animate-shake' : '')}
    >
      {Array.from({ length }).map((_, index) => {
        const isFilled = index < valueLength;
        let dotClasses = 'w-3.5 h-3.5 rounded-full transition-all duration-200 ';
        if (isError) {
          dotClasses += 'bg-[#EF4444] border-2 border-[#EF4444] shadow-glow-red scale-110';
        } else if (isFilled) {
          dotClasses += 'bg-[#00F0FF] border-2 border-[#00F0FF] shadow-glow-cyan scale-110';
        } else {
          dotClasses += 'bg-[#1E293B] border-2 border-[#334155] opacity-60';
        }
        return <div key={index} className={dotClasses} />;
      })}
    </div>
  );
};
