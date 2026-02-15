import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, BorderRadius, Typography, Shadows } from './theme';

export type ExtraType = 'WD' | 'NB' | 'B' | 'LB';

export interface ExtraButtonProps {
  /**
   * The type of extra
   * - WD: Wide
   * - NB: No Ball
   * - B: Bye
   * - LB: Leg Bye
   */
  type: ExtraType;
  /**
   * Callback when button is pressed
   */
  onPress: (type: ExtraType) => void;
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

const EXTRA_LABELS: Record<ExtraType, string> = {
  WD: 'Wide',
  NB: 'No Ball',
  B: 'Bye',
  LB: 'Leg Bye',
};

/**
 * ExtraButton - A secondary-styled button for recording extras
 *
 * Features:
 * - Slightly smaller than ScoreButton for secondary actions
 * - Gray/secondary styling to differentiate from scoring buttons
 * - Displays abbreviation (WD, NB, etc.) with full label
 * - Haptic feedback on press (iOS)
 *
 * @example
 * ```tsx
 * <ExtraButton
 *   type="WD"
 *   onPress={(type) => handleExtra(type)}
 * />
 * ```
 */
export function ExtraButton({
  type,
  onPress,
  disabled = false,
  style,
  haptic = true,
}: ExtraButtonProps) {
  const handlePress = () => {
    // Light haptic feedback for extras
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    onPress(type);
  };

  return (
    <TouchableOpacity
      style={[styles.container, disabled && styles.disabled, style]}
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text style={[styles.abbreviation, disabled && styles.disabledText]}>
        {type}
      </Text>
      <Text style={[styles.label, disabled && styles.disabledText]}>
        {EXTRA_LABELS[type]}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 70,
    height: 70,
    backgroundColor: Colors.buttonSecondary,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.gray600,
    ...Shadows.sm,
  },
  disabled: {
    opacity: 0.5,
  },
  abbreviation: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.electricGreen,
    marginBottom: 2,
  },
  label: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textSecondary,
  },
  disabledText: {
    color: Colors.gray600,
  },
});
