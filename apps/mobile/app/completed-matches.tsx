import React, { useCallback, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { ArrowLeft, Trash2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, Typography, BorderRadius } from '@crichead/ui/mobile';
import { EventSchema, EventScoring, migrateBallToEvent } from '@crichead/core';
import { deleteLocalMatch, listLocalMatches, type LocalMatchRecord } from '../src/utils/localMatchStore';

function getTeamIds(record: LocalMatchRecord): { teamAId: string; teamBId: string } {
  const teamAId =
    (typeof record.config.teamA === 'string' && record.config.teamA) ||
    (typeof record.config.teamAId === 'string' && record.config.teamAId) ||
    'teamA';
  const teamBId =
    (typeof record.config.teamB === 'string' && record.config.teamB) ||
    (typeof record.config.teamBId === 'string' && record.config.teamBId) ||
    'teamB';

  return { teamAId, teamBId };
}

function getBattingOrder(record: LocalMatchRecord): { firstBattingTeamId: string; secondBattingTeamId: string } {
  const { teamAId, teamBId } = getTeamIds(record);
  const toss = record.config.toss;

  if (toss?.winner && toss?.decision) {
    const firstBattingTeamId =
      toss.decision === 'bat'
        ? toss.winner
        : toss.winner === teamAId
          ? teamBId
          : teamAId;

    return {
      firstBattingTeamId,
      secondBattingTeamId: firstBattingTeamId === teamAId ? teamBId : teamAId,
    };
  }

  return { firstBattingTeamId: teamAId, secondBattingTeamId: teamBId };
}

function scoreLabel(runs: number, wickets: number, hasBalls: boolean): string {
  return hasBalls ? `${runs}/${wickets}` : '--/--';
}

function oversLabel(over: number, ball: number, hasBalls: boolean): string {
  return hasBalls ? `${over}.${ball}` : '--';
}

function buildScoreView(record: LocalMatchRecord): {
  currentScore: string;
  currentOvers: string;
} {
  const { firstBattingTeamId, secondBattingTeamId } = getBattingOrder(record);

  const events = (record.balls ?? [])
    .map((ball) => {
      const candidate = ball as { deliveryType?: unknown };
      if (candidate?.deliveryType) {
        return ball as EventSchema.BallEvent;
      }

      return migrateBallToEvent(
        ball as any,
        record.id,
        String(record.currentInningsIndex ?? 0),
      );
    })
    .filter(Boolean);

  const engineConfig = {
    oversPerInnings: record.config.oversPerInnings,
    wicketsPerInnings: record.config.wicketsPerInnings,
  };

  const innings0 = events.filter((event) => event.inningsId === '0');
  const innings1 = events.filter((event) => event.inningsId === '1');

  const innings0State = EventScoring.getMatchStatus(innings0, engineConfig);
  const innings1State = EventScoring.getMatchStatus(innings1, engineConfig);

  const scoresByTeam: Record<string, string> = {
    [firstBattingTeamId]: scoreLabel(
      innings0State.totalRuns,
      innings0State.totalWickets,
      innings0.length > 0,
    ),
    [secondBattingTeamId]: scoreLabel(
      innings1State.totalRuns,
      innings1State.totalWickets,
      innings1.length > 0,
    ),
  };

  const oversByTeam: Record<string, string> = {
    [firstBattingTeamId]: oversLabel(
      innings0State.currentOver,
      innings0State.currentBall,
      innings0.length > 0,
    ),
    [secondBattingTeamId]: oversLabel(
      innings1State.currentOver,
      innings1State.currentBall,
      innings1.length > 0,
    ),
  };

  const currentBattingTeamId = (record.currentInningsIndex ?? 0) > 0
    ? secondBattingTeamId
    : firstBattingTeamId;

  return {
    currentScore: scoresByTeam[currentBattingTeamId] ?? '--/--',
    currentOvers: oversByTeam[currentBattingTeamId] ?? '--',
  };
}

export default function CompletedMatchesScreen() {
  const router = useRouter();
  const [completedMatches, setCompletedMatches] = useState<LocalMatchRecord[]>([]);

  const loadCompletedMatches = useCallback(() => {
    listLocalMatches().then((records) => {
      const completed = records
        .filter((m) => m.status === 'finished' || m.status === 'abandoned')
        .sort((a, b) => b.updatedAt - a.updatedAt);
      setCompletedMatches(completed);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCompletedMatches();
    }, [loadCompletedMatches]),
  );

  const handleDeleteMatch = useCallback((match: LocalMatchRecord) => {
    Alert.alert(
      'Delete Match',
      `Delete ${match.config.teamAName} vs ${match.config.teamBName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              await deleteLocalMatch(match.id);
              setCompletedMatches((prev) => prev.filter((m) => m.id !== match.id));
            } catch {
              Alert.alert('Error', 'Failed to delete match. Please try again.');
            }
          },
        },
      ],
    );
  }, []);

  const scoreByMatchId = useMemo(() => {
    return Object.fromEntries(completedMatches.map((match) => [match.id, buildScoreView(match)]));
  }, [completedMatches]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={22} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.title}>Completed Matches</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {completedMatches.length === 0 ? (
          <Text style={styles.emptyText}>No completed matches yet.</Text>
        ) : completedMatches.map((m) => (
          <View key={m.id} style={styles.listItem}>
            <TouchableOpacity
              style={styles.listLeftTouchable}
              onPress={() => router.push(`/match-completed/${m.id}`)}
              activeOpacity={0.7}
            >
              <View style={styles.listLeft}>
                <Text style={styles.listTeamsText}>
                  <Text style={styles.listTeamBold}>{m.config.teamAName}</Text>
                  <Text style={styles.listVs}> VS </Text>
                  <Text style={styles.listTeamBold}>{m.config.teamBName}</Text>
                </Text>
                <Text style={styles.listSubtitle}>
                  LOCAL MATCH • <Text style={styles.listHighlight}>{m.config.oversPerInnings} Ov</Text>
                </Text>
              </View>
              <View style={styles.listRight}>
                <Text style={styles.listScore}>{scoreByMatchId[m.id]?.currentScore ?? '--/--'}</Text>
                <Text style={styles.listOvers}>({scoreByMatchId[m.id]?.currentOvers ?? '--'})</Text>
                <View style={[styles.statusBadge, styles.statusBadgeCompleted]}>
                  <Text style={styles.statusBadgeText}>COMPLETED</Text>
                </View>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteMatch(m)}
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              activeOpacity={0.7}
            >
              <Trash2 size={16} color={Colors.gray400} />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.deepNavy,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
  },
  headerSpacer: {
    width: 22,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  emptyText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.gray500,
    marginTop: Spacing.sm,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  listLeftTouchable: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  listLeft: {
    flex: 1,
  },
  listTeamsText: {
    marginBottom: 4,
  },
  listTeamBold: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.white,
  },
  listVs: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.gray500,
  },
  listSubtitle: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.gray500,
    letterSpacing: 0.5,
  },
  listHighlight: {
    color: Colors.electricGreen,
  },
  listRight: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  listScore: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.white,
    marginBottom: 2,
  },
  listOvers: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.gray500,
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgeCompleted: {
    backgroundColor: Colors.gray700,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    color: Colors.white,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
});
