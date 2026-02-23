import React from 'react';

export type ExtraType = 'WD' | 'NB' | 'B' | 'LB';

export interface ExtraButtonProps {
  type: ExtraType;
  onPress: (type: ExtraType) => void;
  disabled?: boolean;
  className?: string;
}

export function ExtraButton({
  type,
  onPress,
  disabled = false,
  className = '',
}: ExtraButtonProps) {
  return (
    <button
      onClick={() => onPress(type)}
      disabled={disabled}
      className={`h-11 rounded-xl bg-amber-600/15 text-amber-400 border border-amber-600/30 font-bold text-sm hover:bg-amber-600/25 transition-all duration-150 active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed ${className}`}
    >
      {type}
    </button>
  );
}
