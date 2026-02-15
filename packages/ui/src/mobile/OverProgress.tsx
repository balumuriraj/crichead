import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Spacing, BorderRadius } from './theme';

export interface OverProgressProps {
  /**
   * Number of balls bowled in current over (0-6)
   */
  ballsBowled: number;
  /**
   * Total balls per over (default 6)
   */
  ballsPerOver?: number;
  /**
   * Custom style for the container
   */
  style?: ViewStyle;
  /**
   * Size of each dot
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Show different colors for different ball outcomes
   * - 'W' for wicket (red)
   * - 4 or 6 for boundary (green)
   * - null for normal ball (white)
   */
  ballOutcomes?: Array<'W' | 4 | 6 | null>;
}

/**
 * OverProgress - Visual indicator showing balls bowled in current over
 *
 * Features:
 * - Shows 6 dots representing balls in an over
 * - Fills up as balls are bowled
 * - Can show different colors for wickets and boundaries
 * - Responsive sizing
 *
 * @example
 * ```tsx
 * <OverProgress
 *   ballsBowled={3}
 *   ballOutcomes={[null, 4, 'W']}
 * />
 * ```
 */
export function OverProgress({
  ballsBowled,
  ballsPerOver = 6,
  style,
  size = 'md',
  ballOutcomes = [],
}: OverProgressProps) {
  const dotSize = DOT_SIZES[size];
  const dots = Array.from({ length: ballsPerOver }, (_, i) => i);

  const getDotColor = (index: number): string => {
    if (index >= ballsBowled) {
      return Colors.gray700; // Empty/unfilled
    }

    const outcome = ballOutcomes[index];
    if (outcome === 'W') {
      return Colors.error; // Wicket
    }
    if (outcome === 4 || outcome === 6) {
      return Colors.electricGreen; // Boundary
    }

    return Colors.white; // Normal ball
  };

  return (
    <View style={[styles.container, style]}>
      {dots.map((index) => (
        <View
          key={index}
          style={[
            styles.dot,
            {
              width: dotSize,
              height: dotSize,
              backgroundColor: getDotColor(index),
              borderColor:
                index >= ballsBowled ? Colors.gray700 : 'transparent',
            },
          ]}
        />
      ))}
    </View>
  );
}

const DOT_SIZES = {
  sm: 8,
  md: 12,
  lg: 16,
} as const;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dot: {
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
  },
});
