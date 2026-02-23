import React from 'react';

export interface ScoreButtonProps {
  value: number;
  onPress: (value: number) => void;
  disabled?: boolean;
  className?: string;
}

export function ScoreButton({
  value,
  onPress,
  disabled = false,
  className = '',
}: ScoreButtonProps) {
  const isBoundary = value === 4 || value === 6;

  const baseClasses =
    'h-14 rounded-xl font-bold text-lg transition-all duration-150 active:scale-90 hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed';
  const colorClasses = isBoundary
    ? 'bg-[#00FF41] text-[#0F172A]'
    : value === 0
      ? 'bg-[#334155] text-gray-400 hover:text-white'
      : 'bg-[#334155] text-white';

  return (
    <button
      onClick={() => onPress(value)}
      disabled={disabled}
      className={`${baseClasses} ${colorClasses} ${className}`}
    >
      {value}
    </button>
  );
}
