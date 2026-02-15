import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, BorderRadius, Typography, Shadows } from './theme';

export interface ScoreButtonProps {
  /**
   * The run value (0-6)
   */
  value: number;
  /**
   * Callback when button is pressed
   */
  onPress: (value: number) => void;
  /**
   * Whether the button is disabled
   */
  disabled?: boolean;
  /**
   * Custom style for the button container
   */
  style?: ViewStyle;
  /**
   * Enable haptic feedback on press (iOS only)
   * @default true
   */
  haptic?: boolean;
}

/**
 * ScoreButton - A large, haptic-ready button for recording runs (0-6)
 *
 * Features:
 * - Large touch target for easy tapping during live scoring
 * - Haptic feedback on press (iOS)
 * - Electric green accent for boundaries (4, 6)
 * - High contrast deep navy background
 *
 * @example
 * ```tsx
 * <ScoreButton
 *   value={4}
 *   onPress={(runs) => handleRunScored(runs)}
 * />
 * ```
 */
export function ScoreButton({
  value,
  onPress,
  disabled = false,
  style,
  haptic = true,
}: ScoreButtonProps) {
  const isBoundary = value === 4 || value === 6;

  const handlePress = () => {
    // Haptic feedback - boundaries get heavy impact, others get medium
    if (haptic) {
      if (isBoundary) {
        // Heavy haptic for boundaries (4 or 6)
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } else {
        // Medium haptic for normal runs
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    }

    onPress(value);
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isBoundary && styles.boundaryContainer,
        disabled && styles.disabled,
        style,
      ]}
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.text,
          isBoundary && styles.boundaryText,
          disabled && styles.disabledText,
        ]}
      >
        {value}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 80,
    height: 80,
    backgroundColor: Colors.deepNavy,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.gray700,
    ...Shadows.md,
  },
  boundaryContainer: {
    backgroundColor: Colors.electricGreen,
    borderColor: Colors.electricGreen,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
  },
  boundaryText: {
    color: Colors.deepNavy,
  },
  disabledText: {
    color: Colors.gray500,
  },
});
