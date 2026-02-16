import React, { useMemo } from 'react';
import {
  TouchableOpacity,
  Text,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Spacing, BorderRadius, Typography, Shadows } from './theme';
import { useThemedColors } from './useThemedColors';

export interface WicketButtonProps {
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  haptic?: boolean;
  pulse?: boolean;
}

export function WicketButton({
  onPress,
  disabled = false,
  style,
  haptic = true,
  pulse = false,
}: WicketButtonProps) {
  const colors = useThemedColors();

  const styles = useMemo(() => {
    const container: ViewStyle = {
      width: '100%',
      height: 90,
      backgroundColor: colors.error,
      borderRadius: BorderRadius.lg,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: '#DC2626',
      ...Shadows.lg,
    };
    const disabledContainer: ViewStyle = {
      opacity: 0.5,
      backgroundColor: colors.gray700,
      borderColor: colors.gray600,
    };
    const content: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    };
    const icon: TextStyle = { fontSize: Typography.fontSize['3xl'] };
    const text: TextStyle = {
      fontSize: Typography.fontSize['2xl'],
      fontWeight: Typography.fontWeight.extrabold,
      color: colors.white,
      letterSpacing: 1,
    };
    const disabledText: TextStyle = { color: colors.gray500 };
    return { container, disabledContainer, content, icon, text, disabledText };
  }, [colors]);

  const handlePress = () => {
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    onPress();
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        disabled && styles.disabledContainer,
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
