import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Zap, Plus, Bell, Trash2 } from 'lucide-react-native';
import { listLocalMatches, deleteLocalMatch, type LocalMatchRecord } from '../../src/utils/localMatchStore';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, BorderRadius, Typography } from '@crichead/ui/mobile';
import { EventSchema, EventScoring, migrateBallToEvent } from '@crichead/core';

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
  teamAScore: string;
  teamBScore: string;
  currentScore: string;
  teamAOvers: string;
  teamBOvers: string;
  currentOvers: string;
} {
  const { teamAId, teamBId } = getTeamIds(record);
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
    teamAScore: scoresByTeam[teamAId] ?? '--/--',
    teamBScore: scoresByTeam[teamBId] ?? '--/--',
    currentScore: scoresByTeam[currentBattingTeamId] ?? '--/--',
    teamAOvers: oversByTeam[teamAId] ?? '--',
    teamBOvers: oversByTeam[teamBId] ?? '--',
    currentOvers: oversByTeam[currentBattingTeamId] ?? '--',
  };
}

export default function HomeScreen() {
  const router = useRouter();
  const [allLocalMatches, setAllLocalMatches] = useState<LocalMatchRecord[]>([]);

  const loadMatches = useCallback(() => {
    listLocalMatches().then((records) => {
      const sorted = [...records].sort((a, b) => b.updatedAt - a.updatedAt);
      setAllLocalMatches(sorted);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadMatches();
    }, [loadMatches]),
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
              setAllLocalMatches((prev) => prev.filter((m) => m.id !== match.id));
            } catch {
              Alert.alert('Error', 'Failed to delete match. Please try again.');
            }
          },
        },
      ],
    );
  }, []);

  const activeMatches = useMemo(
    () => allLocalMatches.filter((m) => m.status !== 'finished' && m.status !== 'abandoned'),
    [allLocalMatches],
  );

  const completedMatches = useMemo(
    () => allLocalMatches.filter((m) => m.status === 'finished' || m.status === 'abandoned'),
    [allLocalMatches],
  );

  const recentCompletedMatches = useMemo(
    () => completedMatches.slice(0, 3),
    [completedMatches],
  );

  const featuredLocal = activeMatches[0];
  const featuredMatch = featuredLocal;
  const listMatches = featuredMatch ? activeMatches.slice(1) : activeMatches;
  const recentActiveMatches = listMatches.slice(0, 3);

  const fMatchNameA = featuredMatch ? featuredMatch.config.teamAName : null;
  const fMatchNameB = featuredMatch ? featuredMatch.config.teamBName : null;
  const fMatchStatus = featuredMatch ? featuredMatch.status : 'local';
  const scoreByMatchId = useMemo(() => {
    return Object.fromEntries(
      allLocalMatches.map((match) => [match.id, buildScoreView(match)]),
    );
  }, [allLocalMatches]);
  const featuredScores = featuredMatch ? scoreByMatchId[featuredMatch.id] : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.brand}>
          <Text style={styles.brandItalic}>CRIC</Text>
          <Text style={styles.brandSuffix}>HEAD</Text>
        </Text>
        <TouchableOpacity style={styles.notificationBtn} activeOpacity={0.7}>
          <Bell size={22} color={Colors.white} />
        </TouchableOpacity>
      </View>      

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} showsVerticalScrollIndicator={false}>

        {/* ── Action Row ── */}
        <View style={styles.actionRow}>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/match/new');
            }}
            activeOpacity={0.8}
          >
            <Plus size={18} color={Colors.white} />
            <View style={styles.actionBtnBody}>
              <Text style={styles.actionBtnText}>NEW MATCH</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.quickMatchBtn]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/match/quick');
            }}
            activeOpacity={0.8}
          >
            <Zap size={18} color={Colors.electricGreen} fill={Colors.electricGreen} />
            <View style={styles.actionBtnBody}>
              <Text style={[styles.actionBtnText, styles.quickMatchText]}>QUICK MATCH</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Featured Match Card ── */}
        {featuredMatch ? (
          <TouchableOpacity 
            style={styles.featuredCard}
            activeOpacity={0.8}
            onPress={() => router.push(`/match/local-${featuredMatch.id}`)}
          >
            <View style={styles.featuredHeader}>
              <View style={styles.featuredTag}>
                <Text style={styles.featuredTagText}>FEATURED MATCH</Text>
              </View>
              <View style={styles.featuredLiveRow}>
                {fMatchStatus === 'live' && <View style={styles.featuredLiveDot} />}
                <Text style={[styles.featuredLiveText, fMatchStatus !== 'live' && { color: Colors.gray400 }]}>
                  {fMatchStatus === 'live' ? 'LIVE' : (fMatchStatus === 'upcoming' ? 'UPCOMING' : 'LOCAL')}
                </Text>
              </View>
            </View>

            <View style={styles.featuredTeamRow}>
              <View style={styles.teamLeft}>
                <View style={[styles.teamCircle, { backgroundColor: '#1E3A8A' }]}>
                  <Text style={styles.teamCircleText}>{fMatchNameA?.substring(0, 3).toUpperCase() || 'TMA'}</Text>
                </View>
                <Text style={styles.teamNameLarge} numberOfLines={1}>{fMatchNameA && fMatchNameA.length > 12 ? fMatchNameA.substring(0,10)+'...' : fMatchNameA}</Text>
              </View>
              <Text style={styles.teamScoreLarge}>
                {featuredScores?.teamAScore ?? '--/--'}
                <Text style={styles.teamOversLarge}> ({featuredScores?.teamAOvers ?? '--'})</Text>
              </Text>
            </View>

            <View style={styles.featuredTeamRow}>
              <View style={styles.teamLeft}>
                <View style={[styles.teamCircle, { backgroundColor: '#B45309' }]}>
                  <Text style={styles.teamCircleText}>{fMatchNameB?.substring(0, 3).toUpperCase() || 'TMB'}</Text>
                </View>
                <Text style={styles.teamNameLarge} numberOfLines={1}>{fMatchNameB && fMatchNameB.length > 12 ? fMatchNameB.substring(0,10)+'...' : fMatchNameB}</Text>
              </View>
              <Text style={styles.teamScoreLargeSub}>
                {featuredScores?.teamBScore ?? '--/--'}
                <Text style={styles.teamOversLargeSub}> ({featuredScores?.teamBOvers ?? '--'})</Text>
              </Text>
            </View>

            <View style={styles.featuredFooter}>
              <View style={styles.featuredStats}>
                <Text style={styles.featuredStatText}>
                  Tap to view match details
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={[styles.featuredCard, { alignItems: 'center', paddingVertical: 32 }]}>
            <View style={[styles.teamCircle, { backgroundColor: Colors.electricGreen + '1A', width: 48, height: 48, borderRadius: 24, marginBottom: 16, marginRight: 0 }]}>
              <Plus size={24} color={Colors.electricGreen} />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: Colors.white, marginBottom: 8 }}>Ready to Play?</Text>
            <Text style={{ fontSize: 12, color: Colors.gray400, textAlign: 'center', marginBottom: 20, lineHeight: 18 }}>
              Your featured match will appear here.{'\n'}Start a Quick Match to get started.
            </Text>
            <TouchableOpacity
              style={{ backgroundColor: Colors.electricGreen, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 }}
              onPress={() => router.push('/match/quick')}
              activeOpacity={0.8}
            >
              <Text style={{ color: Colors.deepNavy, fontWeight: '800', fontSize: 12 }}>START QUICK MATCH</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Local Matches List ── */}
        <View style={styles.listHeader}>
          <Text style={styles.listSectionTitle}>LIVE / UPCOMING</Text>
          <TouchableOpacity
            onPress={() => router.push('/ongoing-matches')}
            disabled={activeMatches.length === 0}
            activeOpacity={0.7}
          >
            <Text style={styles.viewAllText}>VIEW ALL</Text>
          </TouchableOpacity>
        </View>

        {recentActiveMatches.map((m) => (
          <View key={m.id} style={styles.listItem}>
            <TouchableOpacity
              style={styles.listLeftTouchable}
              onPress={() => router.push(`/match/local-${m.id}`)}
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
                <View style={[styles.statusBadge, styles.statusBadgeUpcoming]}>
                  <Text style={styles.statusBadgeText}>LOCAL</Text>
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

        {recentActiveMatches.length === 0 && (
          <Text style={styles.emptySectionText}>No ongoing matches.</Text>
        )}

        {/* ── Completed Matches ── */}
        <View style={[styles.listHeader, styles.completedHeader]}>
          <Text style={styles.listSectionTitle}>COMPLETED MATCHES</Text>
          <TouchableOpacity
            onPress={() => router.push('/completed-matches')}
            disabled={completedMatches.length === 0}
            activeOpacity={0.7}
          >
            <Text style={styles.viewAllText}>VIEW ALL</Text>
          </TouchableOpacity>
        </View>

        {recentCompletedMatches.length === 0 ? (
          <Text style={styles.emptySectionText}>No completed matches yet.</Text>
        ) : recentCompletedMatches.map((m) => (
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
  
  /* ── Header ── */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 0.25,
    borderBottomColor: Colors.border,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  brandItalic: {
    fontSize: 22,
    fontWeight: '900',
    fontStyle: 'italic',
    color: Colors.white,
    letterSpacing: -0.5,
  },
  brandSuffix: {
    fontSize: 22,
    fontWeight: '900',
    fontStyle: 'italic',
    color: Colors.electricGreen,
    letterSpacing: -0.5,
  },
  notificationBtn: {
    padding: Spacing.xs,
  },

  /* ── Action Row ── */
  actionRow: {
    flexDirection: 'row',
    paddingBottom: Spacing.md,
    gap: Spacing.sm,    
  },
  actionBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.gray800,
    borderRadius: 30,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  actionBtnBody: {
    alignItems: 'flex-start',
  },
  quickMatchBtn: {
    backgroundColor: Colors.electricGreen + '0D',
    borderColor: Colors.electricGreen + '4D',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.white,
    lineHeight: 14,
  },
  quickMatchText: {
    color: Colors.electricGreen,
    fontStyle: 'italic',
  },
  iconBtn: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: Colors.gray800,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },

  /* ── Content Area ── */
  content: {
    flex: 1,
  },
  contentInner: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },

  /* ── Featured Card ── */
  featuredCard: {
    backgroundColor: Colors.gray800,
    borderRadius: 24,
    padding: 20,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    // a slight inner shadow or gradient effect is simulated via borders
  },
  featuredHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  featuredTag: {
    backgroundColor: Colors.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  featuredTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.gray400,
    letterSpacing: 1,
  },
  featuredLiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featuredLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
    marginRight: 6,
  },
  featuredLiveText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#EF4444',
    letterSpacing: 1,
  },
  featuredTeamRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  teamLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  teamCircleIND: {
    backgroundColor: '#1E3A8A', // Blue
  },
  teamCircleAUS: {
    backgroundColor: '#B45309', // Amber-ish
  },
  teamCircleText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.white,
  },
  teamNameLarge: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.white,
  },
  teamScoreLarge: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.white,
  },
  teamWicketsLarge: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.gray500,
  },
  teamOversLarge: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.gray400,
  },
  teamScoreLargeSub: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.gray400,
  },
  teamOversLargeSub: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.gray500,
  },
  teamWicketsLargeSub: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray600,
  },
  featuredFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 16,
  },
  featuredStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featuredStatText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.gray500,
  },
  featuredStatValue: {
    color: Colors.white,
    fontWeight: '800',
  },
  winProbTag: {
    backgroundColor: Colors.electricGreen + '1A',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.electricGreen + '4D',
  },
  winProbText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.electricGreen,
  },

  /* ── List Section ── */
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  listSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.gray500,
    letterSpacing: 2,
  },
  viewAllText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.electricGreen,
    letterSpacing: 1,
  },
  completedHeader: {
    marginTop: Spacing.lg,
  },
  emptySectionText: {
    fontSize: 12,
    color: Colors.gray500,
    marginBottom: Spacing.md,
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
  statusBadgeLive: {
    backgroundColor: Colors.electricGreen + '33',
  },
  statusBadgeUpcoming: {
    backgroundColor: Colors.border,
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

