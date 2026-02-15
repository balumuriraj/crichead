import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Spacing, BorderRadius, Typography } from './theme';

export interface LiveScoreHeaderProps {
  /**
   * Total runs scored
   */
  runs: number;
  /**
   * Total wickets fallen
   */
  wickets: number;
  /**
   * Current over (e.g., "12.3")
   */
  overs: string;
  /**
   * Current run rate
   */
  runRate: number;
  /**
   * Team name
   */
  teamName?: string;
  /**
   * Target score (for second innings)
   */
  target?: number;
  /**
   * Custom style for the container
   */
  style?: ViewStyle;
}

/**
 * LiveScoreHeader - Displays live match score with high contrast
 *
 * Features:
 * - Bold, large score display (runs/wickets)
 * - Current over and run rate in secondary text
 * - Team name display
 * - Target tracking for chasing teams
 * - High contrast electric green on deep navy
 *
 * @example
 * ```tsx
 * <LiveScoreHeader
 *   runs={142}
 *   wickets={3}
 *   overs="18.4"
 *   runRate={7.68}
 *   teamName="India"
 *   target={165}
 * />
 * ```
 */
export function LiveScoreHeader({
  runs,
  wickets,
  overs,
  runRate,
  teamName,
  target,
  style,
}: LiveScoreHeaderProps) {
  const runsNeeded = target ? target - runs : null;
  const ballsRemaining = target ? calculateBallsRemaining(overs) : null;

  return (
    <View style={[styles.container, style]}>
      {/* Team Name */}
      {teamName && (
        <Text style={styles.teamName}>{teamName.toUpperCase()}</Text>
      )}

      {/* Main Score */}
      <View style={styles.scoreRow}>
        <Text style={styles.score}>
          {runs}
          <Text style={styles.wickets}>/{wickets}</Text>
        </Text>
        <Text style={styles.overs}>({overs} ov)</Text>
      </View>

      {/* Secondary Info */}
      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>RUN RATE</Text>
          <Text style={styles.infoValue}>{runRate.toFixed(2)}</Text>
        </View>

        {runsNeeded !== null && ballsRemaining !== null && (
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>NEED</Text>
            <Text style={styles.infoValue}>
              {runsNeeded} in {ballsRemaining} balls
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

function calculateBallsRemaining(overs: string): number {
  const parts = overs.split('.').map(Number);
  const completedOvers = parts[0] || 0;
  const balls = parts[1] || 0;
  const totalBalls = completedOvers * 6 + balls;
  const matchOvers = 20; // Assuming T20
  return matchOvers * 6 - totalBalls;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.scoreBackground,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderLeftWidth: 4,
    borderLeftColor: Colors.electricGreen,
  },
  teamName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.electricGreen,
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: Spacing.md,
  },
  score: {
    fontSize: Typography.fontSize['5xl'],
    fontWeight: Typography.fontWeight.extrabold,
    color: Colors.white,
    lineHeight: Typography.fontSize['5xl'],
  },
  wickets: {
    fontSize: Typography.fontSize['4xl'],
    color: Colors.textSecondary,
  },
  overs: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textSecondary,
    marginLeft: Spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.electricGreen,
  },
});
