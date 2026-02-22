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

export interface ScoreButtonProps {
  value: number;
  onPress: (value: number) => void;
  disabled?: boolean;
  style?: ViewStyle;
  haptic?: boolean;
}

export function ScoreButton({
  value,
  onPress,
  disabled = false,
  style,
  haptic = true,
}: ScoreButtonProps) {
  const colors = useThemedColors();
  const isBoundary = value === 4 || value === 6;

  const styles = useMemo(() => {
    const container: ViewStyle = {
      width: 80,
      height: 80,
      backgroundColor: colors.deepNavy,
      borderRadius: BorderRadius.lg,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: colors.gray700,
      ...Shadows.md,
    };
    const boundaryContainer: ViewStyle = {
      backgroundColor: colors.electricGreen,
      borderColor: colors.electricGreen,
    };
    const text: TextStyle = {
      fontSize: Typography.fontSize['3xl'],
      fontWeight: Typography.fontWeight.bold as TextStyle['fontWeight'],
      color: colors.white,
    };
    const boundaryText: TextStyle = {
      color: colors.deepNavy,
    };
    const disabledStyle: ViewStyle = { opacity: 0.5 };
    const disabledText: TextStyle = { color: colors.gray500 };

    return { container, boundaryContainer, text, boundaryText, disabledStyle, disabledText };
  }, [colors]);

  const handlePress = () => {
    if (haptic) {
      if (isBoundary) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } else {
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
        disabled && styles.disabledStyle,
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
