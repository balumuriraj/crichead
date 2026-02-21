import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography, BorderRadius } from '@crichead/ui/mobile';

export interface TargetBannerProps {
  target: number;
  runsNeeded: number;
  ballsLeft: number | '?';
}

export function TargetBanner({ target, runsNeeded, ballsLeft }: TargetBannerProps) {
  return (
    <View style={styles.targetBanner}>
      <Text style={styles.targetText}>
        Target: {target} — Need {runsNeeded} from {ballsLeft} balls
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  targetBanner: {
    backgroundColor: Colors.electricGreen + '1A',
    borderWidth: 1,
    borderColor: Colors.electricGreen + '4D',
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  targetText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.electricGreen,
    textAlign: 'center',
  },
});
