import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  Platform,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, BorderRadius, Typography, Shadows } from './theme';

export interface WicketButtonProps {
  /**
   * Callback when button is pressed
   */
  onPress: () => void;
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
  /**
   * Show a pulse animation when active
   * @default false
   */
  pulse?: boolean;
}

/**
 * WicketButton - A prominent, warning-styled button for recording wickets
 *
 * Features:
 * - Large, prominent button with warning/danger styling
 * - Red/error color to indicate critical action
 * - Haptic feedback on press (iOS)
 * - Optional pulse animation for emphasis
 * - Displays "WICKET" text and icon
 *
 * @example
 * ```tsx
 * <WicketButton
 *   onPress={() => handleWicket()}
 *   pulse={isLiveMatch}
 * />
 * ```
 */
export function WicketButton({
  onPress,
  disabled = false,
  style,
  haptic = true,
  pulse = false,
}: WicketButtonProps) {
  const handlePress = () => {
    // Heavy haptic feedback for wickets - most important event
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }

    onPress();
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        disabled && styles.disabled,
        pulse && styles.pulse,
        style,
      ]}
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        <Text style={[styles.icon, disabled && styles.disabledText]}>⚡</Text>
        <Text style={[styles.text, disabled && styles.disabledText]}>
          WICKET
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 90,
    backgroundColor: Colors.error,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#DC2626', // Darker red
    ...Shadows.lg,
  },
  disabled: {
    opacity: 0.5,
    backgroundColor: Colors.gray700,
    borderColor: Colors.gray600,
  },
  pulse: {
    // In a real implementation, you'd add animation here
    // using react-native-reanimated or Animated API
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  icon: {
    fontSize: Typography.fontSize['3xl'],
  },
  text: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.extrabold,
    color: Colors.white,
    letterSpacing: 1,
  },
  disabledText: {
    color: Colors.gray500,
  },
});
