import React from 'react';

export interface WicketButtonProps {
  onPress: () => void;
  disabled?: boolean;
  className?: string;
}

export function WicketButton({
  onPress,
  disabled = false,
  className = '',
}: WicketButtonProps) {
  return (
    <button
      onClick={onPress}
      disabled={disabled}
      className={`h-14 rounded-xl bg-red-500/15 text-red-400 border border-red-500/30 font-bold text-base hover:bg-red-500/25 transition-all duration-150 active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed ${className}`}
    >
      WICKET
    </button>
  );
}
