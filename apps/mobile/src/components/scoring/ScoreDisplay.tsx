import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography } from '@crichead/ui/mobile';

export interface ScoreDisplayProps {
  teamName: string;
  totalRuns: number;
  totalWickets: number;
  oversFormatted: string;
  runRate: number;
}

export function ScoreDisplay({
  teamName,
  totalRuns,
  totalWickets,
  oversFormatted,
  runRate,
}: ScoreDisplayProps) {
  return (
    <View style={styles.scoreSection}>
      <Text style={styles.battingLabel}>
        {teamName.toUpperCase()} BATTING
      </Text>
      <View style={styles.scoreRow}>
        <Text style={styles.scoreText}>
          {totalRuns}
          <Text style={styles.wicketsText}>/{totalWickets}</Text>
        </Text>
        <View style={styles.oversBlock}>
          <Text style={styles.oversValue}>{oversFormatted}</Text>
          <Text style={styles.oversLabel}>OVERS</Text>
          <Text style={styles.crrText}>CRR: {runRate.toFixed(2)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scoreSection: {
    marginBottom: Spacing.md,
  },
  battingLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.gray400,
    letterSpacing: 1.5,
    marginBottom: Spacing.xs,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  scoreText: {
    fontSize: Typography.fontSize['5xl'],
    fontWeight: Typography.fontWeight.extrabold,
    color: Colors.white,
    lineHeight: Typography.fontSize['5xl'] + 4,
  },
  wicketsText: {
    fontSize: Typography.fontSize['4xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textSecondary,
  },
  oversBlock: {
    alignItems: 'flex-end',
    marginBottom: Spacing.xs,
  },
  oversValue: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.extrabold,
    color: Colors.white,
  },
  oversLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  crrText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.electricGreen,
    marginTop: 2,
  },
});
