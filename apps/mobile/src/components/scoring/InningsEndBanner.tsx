import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography, BorderRadius } from '@crichead/ui/mobile';

export interface InningsEndBannerProps {
  /** true = "MATCH FINISHED" variant (green), false = "INNINGS COMPLETE" variant (amber) */
  isMatch: boolean;
  reason: string;
  score: string;
}

export function InningsEndBanner({ isMatch, reason, score }: InningsEndBannerProps) {
  return (
    <View style={[styles.banner, isMatch && styles.matchBanner]}>
      <Text style={styles.title}>
        {isMatch ? 'MATCH FINISHED' : 'INNINGS COMPLETE'}
      </Text>
      <Text style={styles.reason}>{reason}</Text>
      <Text style={styles.score}>{score}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: Colors.warning + '1A',
    borderWidth: 1,
    borderColor: Colors.warning + '4D',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    alignItems: 'center',
  },
  matchBanner: {
    backgroundColor: Colors.electricGreen + '1A',
    borderColor: Colors.electricGreen + '4D',
  },
  title: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
    letterSpacing: 2,
    marginBottom: Spacing.xs,
  },
  reason: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  score: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.electricGreen,
  },
});
