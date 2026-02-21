import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography, BorderRadius } from '@crichead/ui/mobile';
import { EventScoring } from '@crichead/core';

export interface PlayersTabContentProps {
  strikerId: string | null;
  nonStrikerId: string | null;
  bowlerId: string | null;
  getPlayerName: (id: string | null) => string;
  batsmenStatsMap: Record<string, EventScoring.BatterStats>;
  bowlerStatsMap: Record<string, EventScoring.BowlerStats>;
}

export function PlayersTabContent({
  strikerId,
  nonStrikerId,
  bowlerId,
  getPlayerName,
  batsmenStatsMap,
  bowlerStatsMap,
}: PlayersTabContentProps) {
  const strikerStats = strikerId ? batsmenStatsMap[strikerId] : null;
  const strikerRuns = strikerStats?.runs ?? 0;
  const strikerBalls = strikerStats?.ballsFaced ?? 0;
  const strikerSR = strikerBalls > 0 ? ((strikerRuns / strikerBalls) * 100).toFixed(0) : '0';

  const nonStrikerStats = nonStrikerId ? batsmenStatsMap[nonStrikerId] : null;
  const nonStrikerRuns = nonStrikerStats?.runs ?? 0;
  const nonStrikerBalls = nonStrikerStats?.ballsFaced ?? 0;
  const nonStrikerSR = nonStrikerBalls > 0 ? ((nonStrikerRuns / nonStrikerBalls) * 100).toFixed(0) : '0';

  const bowlerStats = bowlerId ? bowlerStatsMap[bowlerId] : null;
  const validBalls = bowlerStats?.validBalls ?? 0;
  const bowlerOvers = `${Math.floor(validBalls / 6)}.${validBalls % 6}`;
  const bowlerRuns = bowlerStats?.runs ?? 0;
  const bowlerWickets = bowlerStats?.wickets ?? 0;
  const bowlerEcon = validBalls > 0 ? ((bowlerRuns / validBalls) * 6).toFixed(1) : '0.0';

  return (
    <View style={styles.playersContent}>
      {/* Batsmen Card */}
      <View style={styles.statsCard}>
        <View style={styles.statsHeaderRow}>
          <Text style={styles.statsHeaderLabel}>BATSMEN</Text>
          <Text style={styles.statsHeaderCol}>R</Text>
          <Text style={styles.statsHeaderCol}>B</Text>
          <Text style={styles.statsHeaderCol}>SR</Text>
        </View>

        <View style={styles.statsRow}>
          <Text style={[styles.playerName, styles.playerNameStriker]}>
            {strikerId ? getPlayerName(strikerId) : 'Striker'}*
          </Text>
          <Text style={styles.statsValue}>{strikerRuns}</Text>
          <Text style={styles.statsValue}>{strikerBalls}</Text>
          <Text style={styles.statsValue}>{strikerSR}</Text>
        </View>

        <View style={styles.statsRow}>
          <Text style={styles.playerName}>
            {nonStrikerId ? getPlayerName(nonStrikerId) : 'Non-Striker'}
          </Text>
          <Text style={styles.statsValue}>{nonStrikerRuns}</Text>
          <Text style={styles.statsValue}>{nonStrikerBalls}</Text>
          <Text style={styles.statsValue}>{nonStrikerSR}</Text>
        </View>
      </View>

      {/* Bowler Card */}
      <View style={styles.statsCard}>
        <View style={styles.statsHeaderRow}>
          <Text style={styles.statsHeaderLabel}>BOWLER</Text>
          <Text style={styles.statsHeaderCol}>O</Text>
          <Text style={styles.statsHeaderCol}>R</Text>
          <Text style={styles.statsHeaderCol}>W</Text>
          <Text style={styles.statsHeaderCol}>E</Text>
        </View>

        <View style={styles.statsRow}>
          <Text style={styles.playerName}>
            {bowlerId ? getPlayerName(bowlerId) : 'Bowler'}
          </Text>
          <Text style={styles.statsValue}>{bowlerOvers}</Text>
          <Text style={styles.statsValue}>{bowlerRuns}</Text>
          <Text style={[styles.statsValue, bowlerWickets > 0 && styles.statsValueHighlight]}>
            {bowlerWickets}
          </Text>
          <Text style={styles.statsValue}>{bowlerEcon}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  playersContent: {
    gap: Spacing.md,
  },
  statsCard: {
    backgroundColor: Colors.gray800,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  statsHeaderLabel: {
    flex: 1,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.gray400,
    letterSpacing: 1,
  },
  statsHeaderCol: {
    width: 40,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.gray400,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
  },
  playerName: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
  },
  playerNameStriker: {
    color: Colors.electricGreen,
  },
  statsValue: {
    width: 40,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
    textAlign: 'center',
  },
  statsValueHighlight: {
    color: Colors.electricGreen,
  },
});
