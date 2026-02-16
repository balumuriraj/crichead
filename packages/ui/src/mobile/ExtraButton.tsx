import React, { useMemo } from 'react';
import {
  TouchableOpacity,
  Text,
  ViewStyle,
  TextStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Spacing, BorderRadius, Typography, Shadows } from './theme';
import { useThemedColors } from './useThemedColors';

export type ExtraType = 'WD' | 'NB' | 'B' | 'LB';

export interface ExtraButtonProps {
  type: ExtraType;
  onPress: (type: ExtraType) => void;
  disabled?: boolean;
  style?: ViewStyle;
  haptic?: boolean;
}

const EXTRA_LABELS: Record<ExtraType, string> = {
  WD: 'Wide',
  NB: 'No Ball',
  B: 'Bye',
  LB: 'Leg Bye',
};

export function ExtraButton({
  type,
  onPress,
  disabled = false,
  style,
  haptic = true,
}: ExtraButtonProps) {
  const colors = useThemedColors();

  const styles = useMemo(() => {
    const container: ViewStyle = {
      width: 70,
      height: 70,
      backgroundColor: colors.buttonSecondary,
      borderRadius: BorderRadius.md,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: colors.gray600,
      ...Shadows.sm,
    };
    const abbreviation: TextStyle = {
      fontSize: Typography.fontSize.xl,
      fontWeight: Typography.fontWeight.bold,
      color: colors.electricGreen,
      marginBottom: 2,
    };
    const label: TextStyle = {
      fontSize: Typography.fontSize.xs,
      fontWeight: Typography.fontWeight.medium,
      color: colors.textSecondary,
    };
    const disabledStyle: ViewStyle = { opacity: 0.5 };
    const disabledText: TextStyle = { color: colors.gray600 };
    return { container, abbreviation, label, disabledStyle, disabledText };
  }, [colors]);

  const handlePress = () => {
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress(type);
  };

  return (
    <TouchableOpacity
      style={[styles.container, disabled && styles.disabledStyle, style]}
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
