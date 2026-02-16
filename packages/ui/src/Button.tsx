'use client';

import React from 'react';
import { useTheme } from './ThemeContext';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  style,
  ...props
}: ButtonProps) {
  const theme = useTheme();

  const baseClasses = 'font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: { backgroundColor: theme.primaryColor, color: '#fff' },
    secondary: { backgroundColor: theme.secondaryColor, color: '#fff' },
    outline: { border: `2px solid ${theme.primaryColor}`, color: theme.primaryColor, backgroundColor: 'transparent' },
  };

  const classes = `${baseClasses} ${sizeClasses[size]} ${className}`;

  return (
    <button
      className={classes}
      style={{ ...variantStyles[variant], ...style }}
      {...props}
    >
      {children}
    </button>
  );
}
