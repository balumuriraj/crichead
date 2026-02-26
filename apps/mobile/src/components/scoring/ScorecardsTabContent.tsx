import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography, BorderRadius } from '@crichead/ui/mobile';
import type { ScorecardInnings } from '../../types/scorecard';

interface ScorecardsTabContentProps {
  innings: ScorecardInnings[];
  currentInningsIndex: number;
}

export function ScorecardsTabContent({ innings, currentInningsIndex }: ScorecardsTabContentProps) {
  if (innings.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyText}>No scorecard data yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {innings.map((entry) => {
        const isCurrentInnings = entry.inningsIndex === currentInningsIndex;

        return (
          <View
            key={`${entry.teamId}-${entry.inningsIndex}`}
            style={[styles.inningsCard, isCurrentInnings && styles.inningsCardCurrent]}
          >
            <View style={styles.inningsHeader}>
              <View>
                <Text style={styles.inningsTitle}>{entry.teamName}</Text>
                <Text style={styles.inningsMeta}>Innings {entry.inningsIndex + 1}</Text>
              </View>
              <View style={styles.inningsScoreWrap}>
                <Text style={styles.inningsScore}>{entry.score}</Text>
                <Text style={styles.inningsOvers}>({entry.overs} ov)</Text>
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.headerRow}>
                <Text style={styles.headerLabel}>BATTING</Text>
                <Text style={styles.colWide}>R</Text>
                <Text style={styles.colWide}>B</Text>
                <Text style={styles.colWide}>4s</Text>
                <Text style={styles.colWide}>6s</Text>
                <Text style={styles.colSr}>SR</Text>
              </View>
              {entry.batting.map((batter) => (
                <View key={batter.playerId} style={styles.dataRowWrap}>
                  <View style={styles.dataRow}>
                    <View style={styles.playerCell}>
                      <Text style={styles.playerName}>{batter.playerName}</Text>
                      <Text style={styles.dismissalText}>
                        {batter.isOut ? batter.dismissalText : 'not out'}
                      </Text>
                    </View>
                    <Text style={styles.valueCol}>{batter.runs}</Text>
                    <Text style={styles.valueCol}>{batter.balls}</Text>
                    <Text style={styles.valueCol}>{batter.fours}</Text>
                    <Text style={styles.valueCol}>{batter.sixes}</Text>
                    <Text style={styles.valueColSr}>{batter.strikeRate}</Text>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.section}>
              <View style={styles.headerRow}>
                <Text style={styles.headerLabel}>BOWLING</Text>
                <Text style={styles.colWide}>O</Text>
                <Text style={styles.colWide}>M</Text>
                <Text style={styles.colWide}>R</Text>
                <Text style={styles.colWide}>W</Text>
                <Text style={styles.colSr}>ECO</Text>
              </View>
              {entry.bowling.length === 0 ? (
                <Text style={styles.emptySectionText}>No bowlers yet</Text>
              ) : (
                entry.bowling.map((bowler) => (
                  <View key={bowler.playerId} style={styles.dataRowWrap}>
                    <View style={styles.dataRow}>
                      <View style={styles.playerCell}>
                        <Text style={styles.playerName}>{bowler.playerName}</Text>
                      </View>
                      <Text style={styles.valueCol}>{bowler.overs}</Text>
                      <Text style={styles.valueCol}>{bowler.maidens}</Text>
                      <Text style={styles.valueCol}>{bowler.runs}</Text>
                      <Text style={[styles.valueCol, bowler.wickets > 0 && styles.valueHighlight]}>
                        {bowler.wickets}
                      </Text>
                      <Text style={styles.valueColSr}>{bowler.economy}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>EXTRAS</Text>
              <Text style={styles.summaryValue}>
                {entry.extras.total} (wd {entry.extras.wd}, nb {entry.extras.nb}, b {entry.extras.b}, lb {entry.extras.lb})
              </Text>
            </View>

            <View style={styles.summaryRowBlock}>
              <Text style={styles.summaryLabel}>FALL OF WICKETS</Text>
              {entry.fallOfWickets.length === 0 ? (
                <Text style={styles.summaryValue}>No wickets</Text>
              ) : (
                entry.fallOfWickets.map((fall) => (
                  <Text key={`${fall.wicketNumber}-${fall.playerName}-${fall.over}`} style={styles.summaryValue}>
                    {fall.wicketNumber}-{fall.score} ({fall.playerName}, {fall.over} ov)
                  </Text>
                ))
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  emptyCard: {
    backgroundColor: Colors.gray800,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyText: {
    color: Colors.gray400,
    textAlign: 'center',
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  inningsCard: {
    backgroundColor: Colors.gray800,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  inningsCardCurrent: {
    borderColor: Colors.electricGreen,
  },
  inningsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  inningsTitle: {
    color: Colors.white,
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
  },
  inningsMeta: {
    marginTop: 2,
    color: Colors.gray400,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  inningsScoreWrap: {
    alignItems: 'flex-end',
  },
  inningsScore: {
    color: Colors.electricGreen,
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
  },
  inningsOvers: {
    color: Colors.gray400,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
  },
  section: {
    gap: Spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: Spacing.xs,
  },
  headerLabel: {
    flex: 1,
    color: Colors.gray400,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    letterSpacing: 0.8,
  },
  colWide: {
    width: 32,
    textAlign: 'center',
    color: Colors.gray400,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
  },
  colSr: {
    width: 42,
    textAlign: 'center',
    color: Colors.gray400,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
  },
  dataRowWrap: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray700,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  playerCell: {
    flex: 1,
    gap: 2,
    paddingRight: Spacing.xs,
  },
  playerName: {
    color: Colors.white,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
  },
  dismissalText: {
    color: Colors.gray400,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
  },
  valueCol: {
    width: 32,
    textAlign: 'center',
    color: Colors.white,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
  },
  valueColSr: {
    width: 42,
    textAlign: 'center',
    color: Colors.white,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
  },
  valueHighlight: {
    color: Colors.electricGreen,
  },
  emptySectionText: {
    color: Colors.gray400,
    fontSize: Typography.fontSize.sm,
    fontStyle: 'italic',
    paddingVertical: Spacing.xs,
  },
  summaryRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
    gap: 4,
  },
  summaryRowBlock: {
    gap: 4,
  },
  summaryLabel: {
    color: Colors.gray400,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    letterSpacing: 0.8,
  },
  summaryValue: {
    color: Colors.white,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
});
