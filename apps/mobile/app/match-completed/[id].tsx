import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius, Typography } from '@crichead/ui/mobile';
import { EventSchema, EventScoring, migrateBallToEvent } from '@crichead/core';
import { CommentaryTabContent, ScorecardsTabContent } from '../../src/components/scoring';
import {
  loadOfflineMatch,
  normalizeOfflineMatchId,
  type OfflineMatchRecord,
} from '../../src/utils/offlineMatchStore';
import type {
  ScorecardBatterRow,
  ScorecardFallOfWicket,
  ScorecardInnings,
} from '../../src/types/scorecard';

type CompletedTabKey = 'scorecards' | 'commentary' | 'teams' | 'summary' | 'analytics' | 'mvp' | 'gallery';

const TABS: { key: CompletedTabKey; label: string }[] = [
  { key: 'scorecards', label: 'SCORECARDS' },
  { key: 'commentary', label: 'COMMENTARY' },
  { key: 'teams', label: 'TEAMS' },
  { key: 'summary', label: 'SUMMARY' },
  { key: 'analytics', label: 'ANALYTICS' },
  { key: 'mvp', label: 'MVP' },
  { key: 'gallery', label: 'GALLERY' },
];

function getTeamIds(record: OfflineMatchRecord): { teamAId: string; teamBId: string } {
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

function getBattingOrder(record: OfflineMatchRecord): { firstBattingTeamId: string; secondBattingTeamId: string } {
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

function toEvents(record: OfflineMatchRecord): EventSchema.BallEvent[] {
  const rawBalls = record.balls ?? [];
  const firstInningsRuns = record.firstInningsRuns;
  let inferredRuns = 0;
  let inferredInningsId: '0' | '1' = '0';

  return rawBalls
    .map((ball) => {
      const candidate = ball as { deliveryType?: unknown };
      if (candidate?.deliveryType) {
        return ball as EventSchema.BallEvent;
      }

      const inningsIdForLegacyBall = inferredInningsId;
      const migrated = migrateBallToEvent(
        ball as any,
        record.id,
        inningsIdForLegacyBall,
      );

      inferredRuns += migrated.runs.bat + migrated.runs.extra + (migrated.runs.penalty || 0);
      if (
        firstInningsRuns !== null &&
        firstInningsRuns !== undefined &&
        inferredInningsId === '0' &&
        inferredRuns >= firstInningsRuns
      ) {
        inferredInningsId = '1';
      }

      return migrated;
    })
    .filter(Boolean);
}

function formatOvers(over: number, ball: number): string {
  return `${over}.${ball}`;
}

function buildScorecard(record: OfflineMatchRecord, events: EventSchema.BallEvent[]) {
  const { teamAId, teamBId } = getTeamIds(record);
  const { firstBattingTeamId, secondBattingTeamId } = getBattingOrder(record);

  const engineConfig = {
    oversPerInnings: record.config.oversPerInnings,
    wicketsPerInnings: record.config.wicketsPerInnings,
  };

  const inningsById: Record<string, EventSchema.BallEvent[]> = {
    '0': events.filter((event) => event.inningsId === '0'),
    '1': events.filter((event) => event.inningsId === '1'),
  };

  const inningsOrder = ['0', '1'].filter((id) => inningsById[id] && inningsById[id]!.length > 0);

  const playerNameMap = new Map<string, string>();
  (record.config.playingXI?.[teamAId] ?? []).forEach((player: { id: string; name: string }) => {
    playerNameMap.set(player.id, player.name);
  });
  (record.config.playingXI?.[teamBId] ?? []).forEach((player: { id: string; name: string }) => {
    playerNameMap.set(player.id, player.name);
  });

  const getPlayerName = (id: string) => playerNameMap.get(id) ?? id;

  const innings: ScorecardInnings[] = inningsOrder.map((inningsId) => {
    const inningsIndex = Number.parseInt(inningsId, 10);
    const inningsBalls = inningsById[inningsId] ?? [];
    const inningsState = EventScoring.getMatchStatus(inningsBalls, engineConfig);

    const playerFirstSeen = new Map<string, number>();
    inningsBalls.forEach((ball, index) => {
      if (!playerFirstSeen.has(ball.strikerId)) {
        playerFirstSeen.set(ball.strikerId, index);
      }
      if (!playerFirstSeen.has(ball.nonStrikerId)) {
        playerFirstSeen.set(ball.nonStrikerId, index);
      }
    });

    const dismissalByPlayer = new Map<string, string>();
    const fallOfWickets: ScorecardFallOfWicket[] = [];
    let legalBallCount = 0;
    let cumulativeRuns = 0;
    let wickets = 0;

    inningsBalls.forEach((ball) => {
      const isLegal = ball.deliveryType !== 'wide' && ball.deliveryType !== 'no-ball';
      if (isLegal) {
        legalBallCount += 1;
      }

      cumulativeRuns += ball.runs.bat + ball.runs.extra + (ball.runs.penalty || 0);

      if (ball.wicket) {
        wickets += 1;
        dismissalByPlayer.set(ball.wicket.dismissedId, ball.wicket.type);
        fallOfWickets.push({
          wicketNumber: wickets,
          score: `${cumulativeRuns}/${wickets}`,
          playerName: getPlayerName(ball.wicket.dismissedId),
          over: formatOvers(Math.floor(legalBallCount / 6), legalBallCount % 6),
        });
      }
    });

    const batting: ScorecardBatterRow[] = Array.from(playerFirstSeen.entries())
      .sort((left, right) => left[1] - right[1])
      .map(([playerId]) => {
        const batterStats = inningsState.batterStats[playerId] ?? {
          runs: 0,
          ballsFaced: 0,
          fours: 0,
          sixes: 0,
        };
        const isOut = dismissalByPlayer.has(playerId);
        return {
          playerId,
          playerName: getPlayerName(playerId),
          runs: batterStats.runs,
          balls: batterStats.ballsFaced,
          fours: batterStats.fours,
          sixes: batterStats.sixes,
          strikeRate: batterStats.ballsFaced > 0
            ? ((batterStats.runs / batterStats.ballsFaced) * 100).toFixed(1)
            : '0.0',
          dismissalText: dismissalByPlayer.get(playerId) ?? '',
          isOut,
        };
      });

    const bowling = Object.entries(inningsState.bowlerStats)
      .map(([playerId, stats]) => {
        const validBalls = stats.validBalls ?? 0;
        return {
          validBalls,
          playerId,
          playerName: getPlayerName(playerId),
          overs: formatOvers(Math.floor(validBalls / 6), validBalls % 6),
          maidens: stats.maidens,
          runs: stats.runs,
          wickets: stats.wickets,
          economy: validBalls > 0 ? ((stats.runs / validBalls) * 6).toFixed(1) : '0.0',
        };
      })
      .sort((left, right) => right.validBalls - left.validBalls)
      .map(({ validBalls: _validBalls, ...row }) => row);

    const teamId = inningsIndex === 0 ? firstBattingTeamId : secondBattingTeamId;
    const teamName = teamId === teamAId ? record.config.teamAName : record.config.teamBName;

    return {
      inningsIndex,
      teamId,
      teamName,
      score: `${inningsState.totalRuns}/${inningsState.totalWickets}`,
      overs: formatOvers(inningsState.currentOver, inningsState.currentBall),
      batting,
      bowling,
      extras: inningsState.extras,
      fallOfWickets,
    };
  });

  const innings0 = inningsById['0'] ?? [];
  const innings1 = inningsById['1'] ?? [];
  const innings0State = EventScoring.getMatchStatus(innings0, engineConfig);
  const innings1State = EventScoring.getMatchStatus(innings1, engineConfig);
  const innings0Runs = innings0State.totalRuns;
  const innings1Runs = innings1State.totalRuns;
  const innings1Wickets = innings1State.totalWickets;
  const wicketsPerInnings = record.config.wicketsPerInnings ?? 10;

  const teamAScore =
    firstBattingTeamId === teamAId
      ? `${innings0State.totalRuns}/${innings0State.totalWickets}`
      : `${innings1State.totalRuns}/${innings1State.totalWickets}`;
  const teamAOvers =
    firstBattingTeamId === teamAId
      ? formatOvers(innings0State.currentOver, innings0State.currentBall)
      : formatOvers(innings1State.currentOver, innings1State.currentBall);
  const teamBScore =
    firstBattingTeamId === teamBId
      ? `${innings0State.totalRuns}/${innings0State.totalWickets}`
      : `${innings1State.totalRuns}/${innings1State.totalWickets}`;
  const teamBOvers =
    firstBattingTeamId === teamBId
      ? formatOvers(innings0State.currentOver, innings0State.currentBall)
      : formatOvers(innings1State.currentOver, innings1State.currentBall);

  const firstBattingTeamName =
    firstBattingTeamId === teamAId ? record.config.teamAName : record.config.teamBName;
  const secondBattingTeamName =
    secondBattingTeamId === teamAId ? record.config.teamAName : record.config.teamBName;

  const hasChaseData = innings1.length > 0;
  const hasFirstInningsTotal = typeof record.firstInningsRuns === 'number' || innings0.length > 0;

  let resultText = 'Match in progress';
  if (hasChaseData) {
    const firstInningsTotal = typeof record.firstInningsRuns === 'number' ? record.firstInningsRuns : innings0Runs;
    if (innings1Runs > firstInningsTotal) {
      const wicketsInHand = Math.max(0, wicketsPerInnings - innings1Wickets);
      resultText = `${secondBattingTeamName} won by ${wicketsInHand} wickets`;
    } else if (innings1Runs < firstInningsTotal) {
      resultText = `${firstBattingTeamName} won by ${firstInningsTotal - innings1Runs} runs`;
    } else {
      resultText = 'Match tied';
    }
  } else if (record.status === 'abandoned') {
    resultText = 'Match abandoned';
  } else if (hasFirstInningsTotal) {
    const firstInningsTotal = typeof record.firstInningsRuns === 'number' ? record.firstInningsRuns : innings0Runs;
    resultText = `${firstBattingTeamName} innings: ${firstInningsTotal}/${innings0State.totalWickets}`;
  }

  if (innings.length === 1 && innings[0]?.inningsIndex === 1 && typeof record.firstInningsRuns === 'number') {
    innings.unshift({
      inningsIndex: 0,
      teamId: firstBattingTeamId,
      teamName: firstBattingTeamName,
      score: `${record.firstInningsRuns}/${innings0State.totalWickets}`,
      overs: '--',
      batting: [],
      bowling: [],
      extras: {
        wd: 0,
        nb: 0,
        b: 0,
        lb: 0,
        total: 0,
      },
      fallOfWickets: [],
    });
  }

  if (!hasChaseData && typeof record.firstInningsRuns === 'number' && innings0.length === 0) {
    resultText = `${firstBattingTeamName} innings: ${record.firstInningsRuns}`;
  }

  const fallbackTeamAScore =
    teamAScore === '0/0' && firstBattingTeamId === teamAId && typeof record.firstInningsRuns === 'number'
      ? `${record.firstInningsRuns}/${innings0State.totalWickets}`
      : teamAScore;
  const fallbackTeamBScore =
    teamBScore === '0/0' && firstBattingTeamId === teamBId && typeof record.firstInningsRuns === 'number'
      ? `${record.firstInningsRuns}/${innings0State.totalWickets}`
      : teamBScore;

  const topBatters = Array.from(
    new Set(
      innings.flatMap((entry) =>
        entry.batting.map((batter) => ({
          playerName: batter.playerName,
          runs: batter.runs,
          strikeRate: batter.strikeRate,
        }))
      )
    )
  )
    .sort((left, right) => right.runs - left.runs)
    .slice(0, 3);

  const topBowlers = Array.from(
    new Set(
      innings.flatMap((entry) =>
        entry.bowling.map((bowler) => ({
          playerName: bowler.playerName,
          wickets: bowler.wickets,
          runs: bowler.runs,
          overs: bowler.overs,
        }))
      )
    )
  )
    .sort((left, right) => {
      if (right.wickets === left.wickets) {
        return left.runs - right.runs;
      }
      return right.wickets - left.wickets;
    })
    .slice(0, 3);

  const allBatting = innings.flatMap((entry) => entry.batting);
  const allBowling = innings.flatMap((entry) => entry.bowling);
  const mvp = allBatting
    .map((batter) => {
      const bowling = allBowling.find((bowler) => bowler.playerName === batter.playerName);
      const mvpScore = batter.runs + (bowling?.wickets ?? 0) * 20;
      return {
        name: batter.playerName,
        runs: batter.runs,
        wickets: bowling?.wickets ?? 0,
        score: mvpScore,
      };
    })
    .sort((left, right) => right.score - left.score)[0] ?? null;

  const totalRuns = innings0State.totalRuns + innings1State.totalRuns;
  const totalWickets = innings0State.totalWickets + innings1State.totalWickets;
  const totalOvers = innings0State.currentOver + innings1State.currentOver;

  return {
    innings,
    teamAScore: fallbackTeamAScore,
    teamAOvers,
    teamBScore: fallbackTeamBScore,
    teamBOvers,
    resultText,
    topBatters,
    topBowlers,
    mvp,
    analytics: {
      totalRuns,
      totalWickets,
      boundaries: events.filter((ball) => ball.runs.bat === 4 || ball.runs.bat === 6).length,
      sixes: events.filter((ball) => ball.runs.bat === 6).length,
      extras: innings0State.extras.total + innings1State.extras.total,
      overs: totalOvers,
    },
  };
}

export default function CompletedMatchSummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<CompletedTabKey>('scorecards');
  const [offlineMatch, setOfflineMatch] = useState<OfflineMatchRecord | null>(null);
  const [offlineLoading, setOfflineLoading] = useState(true);

  useEffect(() => {
    const normalizedId = id ? normalizeOfflineMatchId(id) : '';
    if (!normalizedId) {
      setOfflineMatch(null);
      setOfflineLoading(false);
      return;
    }

    setOfflineLoading(true);
    loadOfflineMatch(normalizedId)
      .then((record) => {
        setOfflineMatch(record);
      })
      .finally(() => {
        setOfflineLoading(false);
      });
  }, [id]);

  const data = useMemo(() => {
    if (!offlineMatch) {
      return null;
    }
    const events = toEvents(offlineMatch);
    return {
      events,
      ...buildScorecard(offlineMatch, events),
    };
  }, [offlineMatch]);

  if (offlineLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.electricGreen} />
          <Text style={styles.loadingText}>Loading match summary...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!offlineMatch || !data) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <Text style={styles.emptyStateTitle}>Match not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={22} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.title}>Completed Match</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        <View style={styles.scoreSummaryCard}>
          <Text style={styles.fixtureTitle}>{offlineMatch.config.teamAName} vs {offlineMatch.config.teamBName}</Text>
          <View style={styles.teamRow}>
            <Text style={styles.teamName}>{offlineMatch.config.teamAName}</Text>
            <Text style={styles.teamScore}>{data.teamAScore} <Text style={styles.teamOvers}>({data.teamAOvers})</Text></Text>
          </View>
          <View style={styles.teamRow}>
            <Text style={styles.teamName}>{offlineMatch.config.teamBName}</Text>
            <Text style={styles.teamScore}>{data.teamBScore} <Text style={styles.teamOvers}>({data.teamBOvers})</Text></Text>
          </View>
          <Text style={styles.resultLine}>{data.resultText}</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabButton, activeTab === tab.key && styles.tabButtonActive]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabButtonText, activeTab === tab.key && styles.tabButtonTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {activeTab === 'scorecards' && (
          <ScorecardsTabContent innings={data.innings} currentInningsIndex={offlineMatch.currentInningsIndex ?? 0} />
        )}

        {activeTab === 'commentary' && (
          <CommentaryTabContent balls={data.events} />
        )}

        {activeTab === 'teams' && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Teams</Text>
            <Text style={styles.sectionSubhead}>{offlineMatch.config.teamAName}</Text>
            {(offlineMatch.config.playingXI?.[(offlineMatch.config.teamA as string) ?? ''] ?? []).map((player: any) => (
              <Text key={player.id} style={styles.listText}>• {player.name} ({player.role})</Text>
            ))}
            <Text style={[styles.sectionSubhead, styles.sectionSubheadGap]}>{offlineMatch.config.teamBName}</Text>
            {(offlineMatch.config.playingXI?.[(offlineMatch.config.teamB as string) ?? ''] ?? []).map((player: any) => (
              <Text key={player.id} style={styles.listText}>• {player.name} ({player.role})</Text>
            ))}
          </View>
        )}

        {activeTab === 'summary' && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Match Summary</Text>
            {data.topBatters.map((batter) => (
              <Text key={`${batter.playerName}-${batter.runs}`} style={styles.listText}>
                Top Batter: {batter.playerName} - {batter.runs} ({batter.strikeRate} SR)
              </Text>
            ))}
            {data.topBowlers.map((bowler) => (
              <Text key={`${bowler.playerName}-${bowler.wickets}`} style={styles.listText}>
                Top Bowler: {bowler.playerName} - {bowler.wickets}/{bowler.runs} ({bowler.overs} ov)
              </Text>
            ))}
          </View>
        )}

        {activeTab === 'analytics' && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Analytics</Text>
            <Text style={styles.listText}>Total Runs: {data.analytics.totalRuns}</Text>
            <Text style={styles.listText}>Total Wickets: {data.analytics.totalWickets}</Text>
            <Text style={styles.listText}>Boundaries: {data.analytics.boundaries}</Text>
            <Text style={styles.listText}>Sixes: {data.analytics.sixes}</Text>
            <Text style={styles.listText}>Extras: {data.analytics.extras}</Text>
            <Text style={styles.listText}>Total Overs (match): {data.analytics.overs}</Text>
          </View>
        )}

        {activeTab === 'mvp' && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>MVP</Text>
            {data.mvp ? (
              <>
                <Text style={styles.mvpName}>{data.mvp.name}</Text>
                <Text style={styles.listText}>Runs: {data.mvp.runs}</Text>
                <Text style={styles.listText}>Wickets: {data.mvp.wickets}</Text>
              </>
            ) : (
              <Text style={styles.listText}>No MVP data available.</Text>
            )}
          </View>
        )}

        {activeTab === 'gallery' && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Gallery</Text>
            <Text style={styles.listText}>No media captured for this offline match.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.deepNavy,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    color: Colors.gray400,
    fontSize: Typography.fontSize.base,
  },
  emptyStateTitle: {
    color: Colors.white,
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
  },
  backButton: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.electricGreen,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  backButtonText: {
    color: Colors.deepNavy,
    fontWeight: Typography.fontWeight.bold,
    fontSize: Typography.fontSize.sm,
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
    color: Colors.white,
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  scoreSummaryCard: {
    backgroundColor: Colors.gray800,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  fixtureTitle: {
    color: Colors.electricGreen,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.xs,
  },
  teamRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  teamName: {
    color: Colors.white,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
  },
  teamScore: {
    color: Colors.white,
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
  },
  teamOvers: {
    color: Colors.gray400,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
  },
  resultLine: {
    marginTop: Spacing.xs,
    color: Colors.electricGreen,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
  },
  tabRow: {
    gap: Spacing.xs,
  },
  tabButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.gray800,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabButtonActive: {
    backgroundColor: Colors.electricGreen,
    borderColor: Colors.electricGreen,
  },
  tabButtonText: {
    color: Colors.gray400,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    letterSpacing: 0.4,
  },
  tabButtonTextActive: {
    color: Colors.deepNavy,
  },
  sectionCard: {
    backgroundColor: Colors.gray800,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  sectionTitle: {
    color: Colors.white,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
  },
  sectionSubhead: {
    color: Colors.electricGreen,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    marginTop: Spacing.xs,
  },
  sectionSubheadGap: {
    marginTop: Spacing.sm,
  },
  listText: {
    color: Colors.gray300,
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
  },
  mvpName: {
    color: Colors.electricGreen,
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
  },
});
