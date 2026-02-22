/**
 * Crichead Design Tokens
 *
 * Platform-agnostic color, spacing, and typography tokens shared
 * across mobile (React Native) and web (Tailwind CSS).
 */

export const Colors = {
  // Brand Colors
  electricGreen: '#00FF41',
  deepNavy: '#0F172A',

  // Grayscale
  white: '#FFFFFF',
  gray100: '#F1F5F9',
  gray200: '#E2E8F0',
  gray300: '#CBD5E1',
  gray400: '#94A3B8',
  gray500: '#64748B',
  gray600: '#475569',
  gray700: '#334155',
  gray800: '#1E293B',
  gray900: '#0F172A',

  // Semantic Colors
  success: '#00FF41',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // Contextual
  scoreBackground: '#0F172A',
  buttonPrimary: '#00FF41',
  buttonSecondary: '#334155',
  buttonDanger: '#EF4444',
  textPrimary: '#FFFFFF',
  textSecondary: '#94A3B8',
  border: '#334155',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export interface TypographyTokens {
  fontFamily: {
    regular: string;
    medium: string;
    bold: string;
  };
  fontSize: {
    xs: number;
    sm: number;
    base: number;
    lg: number;
    xl: number;
    '2xl': number;
    '3xl': number;
    '4xl': number;
    '5xl': number;
  };
  fontWeight: {
    regular: '400';
    medium: '500';
    semibold: '600';
    bold: '700';
    extrabold: '800';
  };
}

export const Typography: TypographyTokens = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
  },
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },
  fontWeight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
};
