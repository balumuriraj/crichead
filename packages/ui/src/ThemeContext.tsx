'use client';

import React, { createContext, useContext, useMemo } from 'react';

export interface CricheadTheme {
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string;
}

export const defaultTheme: CricheadTheme = {
  primaryColor: '#00FF41',
  secondaryColor: '#0F172A',
  logoUrl: '',
};

const ThemeContext = createContext<CricheadTheme>(defaultTheme);

export interface ThemeProviderProps {
  theme?: Partial<CricheadTheme>;
  children: React.ReactNode;
}

export function ThemeProvider({ theme, children }: ThemeProviderProps) {
  const merged = useMemo(
    () => ({ ...defaultTheme, ...theme }),
    [theme]
  );

  return (
    <ThemeContext.Provider value={merged}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): CricheadTheme {
  return useContext(ThemeContext);
}
