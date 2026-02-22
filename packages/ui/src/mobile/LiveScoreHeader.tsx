import React, { useMemo } from 'react';
import { View, Text, ViewStyle, TextStyle } from 'react-native';
import { Spacing, BorderRadius, Typography } from './theme';
import { useThemedColors } from './useThemedColors';

export interface LiveScoreHeaderProps {
  runs: number;
  wickets: number;
  overs: string;
  runRate: number;
  teamName?: string;
  target?: number;
  style?: ViewStyle;
}

export function LiveScoreHeader({
  runs,
  wickets,
  overs,
  runRate,
  teamName,
  target,
  style,
}: LiveScoreHeaderProps) {
  const colors = useThemedColors();
  const runsNeeded = target ? target - runs : null;
  const ballsRemaining = target ? calculateBallsRemaining(overs) : null;

  const styles = useMemo(() => {
    const container: ViewStyle = {
      backgroundColor: colors.scoreBackground,
      paddingVertical: Spacing.lg,
      paddingHorizontal: Spacing.md,
      borderRadius: BorderRadius.lg,
      borderLeftWidth: 4,
      borderLeftColor: colors.electricGreen,
    };
    const teamNameText: TextStyle = {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.bold as TextStyle['fontWeight'],
      color: colors.electricGreen,
      letterSpacing: 1,
      marginBottom: Spacing.xs,
    };
    const scoreRow: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'baseline',
      marginBottom: Spacing.md,
    };
    const score: TextStyle = {
      fontSize: Typography.fontSize['5xl'],
      fontWeight: Typography.fontWeight.extrabold as TextStyle['fontWeight'],
      color: colors.white,
      lineHeight: Typography.fontSize['5xl'],
    };
    const wicketsText: TextStyle = {
      fontSize: Typography.fontSize['4xl'],
      color: colors.textSecondary,
    };
    const oversText: TextStyle = {
      fontSize: Typography.fontSize.lg,
      fontWeight: Typography.fontWeight.medium as TextStyle['fontWeight'],
      color: colors.textSecondary,
      marginLeft: Spacing.sm,
    };
    const infoRow: ViewStyle = { flexDirection: 'row', gap: Spacing.lg };
    const infoItem: ViewStyle = { flex: 1 };
    const infoLabel: TextStyle = {
      fontSize: Typography.fontSize.xs,
      fontWeight: Typography.fontWeight.semibold as TextStyle['fontWeight'],
      color: colors.textSecondary,
      letterSpacing: 0.5,
      marginBottom: 2,
    };
    const infoValue: TextStyle = {
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.bold as TextStyle['fontWeight'],
      color: colors.electricGreen,
    };
    return { container, teamNameText, scoreRow, score, wicketsText, oversText, infoRow, infoItem, infoLabel, infoValue };
  }, [colors]);

  return (
    <View style={[styles.container, style]}>
      {teamName && (
        <Text style={styles.teamNameText}>{teamName.toUpperCase()}</Text>
      )}

      <View style={styles.scoreRow}>
        <Text style={styles.score}>
          {runs}
          <Text style={styles.wicketsText}>/{wickets}</Text>
        </Text>
        <Text style={styles.oversText}>({overs} ov)</Text>
      </View>

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
  const matchOvers = 20;
  return matchOvers * 6 - totalBalls;
}
