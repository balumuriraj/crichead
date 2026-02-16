import { useMemo } from 'react';
import { useTheme } from '../ThemeContext';
import { Colors } from './theme';

type ThemedColors = { [K in keyof typeof Colors]: string };

/**
 * Returns the full Colors object with brand colors overridden by ThemeContext values.
 *
 * - electricGreen / success / buttonPrimary → theme.primaryColor
 * - deepNavy / gray900 / scoreBackground → theme.secondaryColor
 *
 * All other colors (grays, error, warning, etc.) remain unchanged.
 */
export function useThemedColors(): ThemedColors {
  const theme = useTheme();

  return useMemo(
    () => ({
      ...Colors,
      electricGreen: theme.primaryColor,
      deepNavy: theme.secondaryColor,
      gray900: theme.secondaryColor,
      success: theme.primaryColor,
      scoreBackground: theme.secondaryColor,
      buttonPrimary: theme.primaryColor,
    }),
    [theme.primaryColor, theme.secondaryColor]
  );
}
