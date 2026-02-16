import React, { useCallback } from 'react';
import { View, ViewStyle } from 'react-native';
import { Spacing, BorderRadius } from './theme';
import { useThemedColors } from './useThemedColors';

export interface OverProgressProps {
  ballsBowled: number;
  ballsPerOver?: number;
  style?: ViewStyle;
  size?: 'sm' | 'md' | 'lg';
  ballOutcomes?: Array<'W' | 4 | 6 | null>;
}

const DOT_SIZES = { sm: 8, md: 12, lg: 16 } as const;

export function OverProgress({
  ballsBowled,
  ballsPerOver = 6,
  style,
  size = 'md',
  ballOutcomes = [],
}: OverProgressProps) {
  const colors = useThemedColors();
  const dotSize = DOT_SIZES[size];
  const dots = Array.from({ length: ballsPerOver }, (_, i) => i);

  const getDotColor = useCallback(
    (index: number): string => {
      if (index >= ballsBowled) return colors.gray700;
      const outcome = ballOutcomes[index];
      if (outcome === 'W') return colors.error;
      if (outcome === 4 || outcome === 6) return colors.electricGreen;
      return colors.white;
    },
    [ballsBowled, ballOutcomes, colors]
  );

  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm } as ViewStyle, style]}>
      {dots.map((index) => (
        <View
          key={index}
          style={{
            width: dotSize,
            height: dotSize,
            borderRadius: BorderRadius.full,
            borderWidth: 1.5,
            backgroundColor: getDotColor(index),
            borderColor: index >= ballsBowled ? colors.gray700 : 'transparent',
          }}
        />
      ))}
    </View>
  );
}
