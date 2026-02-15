import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  ScoreButton,
  ExtraButton,
  WicketButton,
  OverProgress,
  LiveScoreHeader,
  Colors,
  Spacing,
  BorderRadius,
  Typography,
  type ExtraType,
} from '@crichead/ui/mobile';
import {
  useMatchSync,
  calculateInningsStats,
  formatOvers,
  calculateRunRate,
  parseOvers,
  type Ball,
  type FirestoreMatchDoc,
  type FirestoreInningsSummary,
} from '@crichead/core';

// ---------------------------------------------------------------------------
// Demo data (used when no matchId / demo mode)
// ---------------------------------------------------------------------------

const generateDemoData = (): Ball[] => [
  // Over 1
  { bowlerId: 'bowler1', strikerId: 'batsman1', runs: 0, extras: null, wicket: null, commentary: 'Dot ball' },
  { bowlerId: 'bowler1', strikerId: 'batsman1', runs: 1, extras: null, wicket: null, commentary: 'Single run' },
  { bowlerId: 'bowler1', strikerId: 'batsman2', runs: 4, extras: null, wicket: null, commentary: 'FOUR! Beautiful cover drive' },
  { bowlerId: 'bowler1', strikerId: 'batsman2', runs: 0, extras: null, wicket: null, commentary: 'Dot ball' },
  { bowlerId: 'bowler1', strikerId: 'batsman2', runs: 0, extras: { type: 'wd', runs: 1 }, wicket: null, commentary: 'Wide down the leg side' },
  { bowlerId: 'bowler1', strikerId: 'batsman2', runs: 2, extras: null, wicket: null, commentary: 'Two runs taken' },
  { bowlerId: 'bowler1', strikerId: 'batsman2', runs: 0, extras: null, wicket: { type: 'caught', fielderId: 'fielder1' }, commentary: 'WICKET! Caught at mid-off' },
  // Over 2
  { bowlerId: 'bowler2', strikerId: 'batsman3', runs: 1, extras: null, wicket: null, commentary: 'Single run' },
  { bowlerId: 'bowler2', strikerId: 'batsman1', runs: 6, extras: null, wicket: null, commentary: 'SIX! Massive hit over long-on!' },
  { bowlerId: 'bowler2', strikerId: 'batsman1', runs: 0, extras: null, wicket: null, commentary: 'Dot ball' },
  { bowlerId: 'bowler2', strikerId: 'batsman1', runs: 1, extras: { type: 'nb', runs: 1 }, wicket: null, commentary: 'No ball! Plus 1 run' },
  { bowlerId: 'bowler2', strikerId: 'batsman3', runs: 0, extras: { type: 'b', runs: 2 }, wicket: null, commentary: 'Byes! 2 runs' },
  { bowlerId: 'bowler2', strikerId: 'batsman3', runs: 4, extras: null, wicket: null, commentary: 'FOUR! Glorious shot through covers' },
  { bowlerId: 'bowler2', strikerId: 'batsman3', runs: 1, extras: null, wicket: null, commentary: 'Single to end the over' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Compute summary stats from a FirestoreInningsSummary */
function inningsSummaryToStats(summary: FirestoreInningsSummary) {
  const { currentOver, currentBall } = parseOvers(summary.overs);
  return {
    totalRuns: summary.totalRuns,
    totalWickets: summary.totalWickets,
    currentOver,
    currentBall,
    ballsInOver: 6,
  };
}

/** Apply an optimistic ball to an innings summary (mirrors transaction logic) */
function applyOptimisticBall(
  summary: FirestoreInningsSummary,
  ball: Ball
): FirestoreInningsSummary {
  const newTotalRuns = summary.totalRuns + ball.runs + (ball.extras?.runs ?? 0);
  const newTotalWickets = summary.totalWickets + (ball.wicket ? 1 : 0);
  const newBallCount = summary.ballCount + 1;

  const isValidDelivery =
    !ball.extras || (ball.extras.type !== 'wd' && ball.extras.type !== 'nb');

  let newOvers = summary.overs;
  if (isValidDelivery) {
    const { currentOver, currentBall } = parseOvers(summary.overs);
    const totalValid = currentOver * 6 + currentBall + 1;
    newOvers = parseFloat(`${Math.floor(totalValid / 6)}.${totalValid % 6}`);
  }

  return {
    ...summary,
    totalRuns: newTotalRuns,
    totalWickets: newTotalWickets,
    overs: newOvers,
    ballCount: newBallCount,
  };
}

function formatBallDisplay(ball: Ball): string {
  if (ball.wicket) return '⚡ W';
  if (ball.extras?.type === 'wd') return 'WD';
  if (ball.extras?.type === 'nb') return `NB + ${ball.runs}`;
  if (ball.extras?.type === 'b') return `${ball.extras.runs}b`;
  if (ball.extras?.type === 'lb') return `${ball.extras.runs}lb`;
  return ball.runs.toString();
}

// ---------------------------------------------------------------------------
// ScoringScreen
// ---------------------------------------------------------------------------

interface ScoringScreenProps {
  /** Firestore match ID. If null, runs in demo/local mode. */
  matchId?: string | null;
}

export default function ScoringScreen({ matchId = null }: ScoringScreenProps) {
  // ---- Firebase sync (only active when matchId is provided) ----
  const {
    match,
    currentInningsBalls: firestoreBalls,
    loading: syncLoading,
    error: syncError,
    addBallToMatch,
  } = useMatchSync(matchId, { subscribeToBalls: true });

  // ---- Local / demo state (fallback when no matchId) ----
  const [localBalls, setLocalBalls] = useState<Ball[]>(generateDemoData());
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [teamName] = useState('India');

  // ---- Optimistic updates ----
  // Pending balls that have been sent to Firestore but not yet confirmed via onSnapshot
  const [optimisticBalls, setOptimisticBalls] = useState<Ball[]>([]);
  const optimisticIdCounter = useRef(0);

  const isLiveMode = matchId !== null;

  // ---- Derived state ----
  // Merge Firestore balls with optimistic balls for display
  const balls = useMemo(() => {
    if (!isLiveMode) return localBalls;
    return [...firestoreBalls, ...optimisticBalls];
  }, [isLiveMode, localBalls, firestoreBalls, optimisticBalls]);

  // Stats: in live mode use the match document summary (+ optimistic adjustments)
  const stats = useMemo(() => {
    if (!isLiveMode) {
      return calculateInningsStats(localBalls);
    }

    // Use Firestore match summary as base
    const currentInnings = match?.innings[match.currentInningsIndex];
    if (!currentInnings) {
      return { totalRuns: 0, totalWickets: 0, currentOver: 0, currentBall: 0, ballsInOver: 6 };
    }

    // Apply optimistic balls on top of the confirmed summary
    let summary = currentInnings;
    for (const ball of optimisticBalls) {
      summary = applyOptimisticBall(summary, ball);
    }

    return inningsSummaryToStats(summary);
  }, [isLiveMode, localBalls, match, optimisticBalls]);

  const currentOverFormatted = formatOvers(stats.currentOver, stats.currentBall);
  const runRate = calculateRunRate(stats.totalRuns, stats.currentOver, stats.currentBall);

  // Current over balls for the OverProgress dots
  const currentOverBalls = useMemo(() => {
    const validBallsCount = stats.currentOver * 6 + stats.currentBall;
    // Walk backwards to find where this over started
    let validSeen = 0;
    let overStartIdx = balls.length;
    for (let i = balls.length - 1; i >= 0; i--) {
      const b = balls[i];
      const isExtra = b?.extras?.type === 'wd' || b?.extras?.type === 'nb';
      if (!isExtra) validSeen++;
      if (validSeen > stats.currentBall) {
        overStartIdx = i + 1;
        break;
      }
      if (i === 0) overStartIdx = 0;
    }
    return balls.slice(overStartIdx);
  }, [balls, stats]);

  const ballOutcomes = useMemo(() => {
    return currentOverBalls.map((ball): 'W' | 4 | 6 | null => {
      if (ball.wicket) return 'W';
      if (ball.runs === 4) return 4;
      if (ball.runs === 6) return 6;
      return null;
    });
  }, [currentOverBalls]);

  // ---- Reconcile optimistic balls when Firestore snapshot arrives ----
  // When firestoreBalls changes, clear optimistic balls that are now confirmed
  const prevFirestoreLenRef = useRef(firestoreBalls.length);
  React.useEffect(() => {
    if (firestoreBalls.length > prevFirestoreLenRef.current) {
      // New balls arrived from Firestore — remove the corresponding optimistic ones
      const newBallsCount = firestoreBalls.length - prevFirestoreLenRef.current;
      setOptimisticBalls((prev) => prev.slice(newBallsCount));
    }
    prevFirestoreLenRef.current = firestoreBalls.length;
  }, [firestoreBalls.length]);

  // ---- Handlers ----

  const addBall = useCallback(
    async (ball: Ball) => {
      if (isLiveMode) {
        // Optimistic: show immediately
        setOptimisticBalls((prev) => [...prev, ball]);

        try {
          await addBallToMatch(ball);
          // onSnapshot will reconcile — optimistic ball removed in useEffect above
        } catch {
          // Transaction failed — remove the optimistic ball
          setOptimisticBalls((prev) => {
            const idx = prev.indexOf(ball);
            if (idx !== -1) {
              const next = [...prev];
              next.splice(idx, 1);
              return next;
            }
            return prev;
          });
          Alert.alert('Sync Error', 'Failed to save ball. Please try again.');
        }
      } else {
        setLocalBalls((prev) => [...prev, ball]);
      }
    },
    [isLiveMode, addBallToMatch]
  );

  const handleScore = useCallback(
    (runs: number) => {
      const newBall: Ball = {
        bowlerId: 'bowler1',
        strikerId: 'batsman1',
        runs,
        extras: null,
        wicket: null,
        commentary: runs === 0 ? 'Dot ball' : runs === 4 ? 'FOUR!' : runs === 6 ? 'SIX!' : `${runs} ${runs === 1 ? 'run' : 'runs'}`,
      };
      addBall(newBall);
    },
    [addBall]
  );

  const handleExtra = useCallback(
    (type: ExtraType) => {
      const extraTypeMap: Record<ExtraType, 'wd' | 'nb' | 'b' | 'lb'> = {
        WD: 'wd', NB: 'nb', B: 'b', LB: 'lb',
      };
      const newBall: Ball = {
        bowlerId: 'bowler1',
        strikerId: 'batsman1',
        runs: 0,
        extras: { type: extraTypeMap[type], runs: 1 },
        wicket: null,
        commentary: `${type} - 1 run`,
      };
      addBall(newBall);
    },
    [addBall]
  );

  const handleWicket = useCallback(() => {
    const newBall: Ball = {
      bowlerId: 'bowler1',
      strikerId: 'batsman1',
      runs: 0,
      extras: null,
      wicket: { type: 'caught', fielderId: 'fielder1' },
      commentary: 'WICKET! Caught out',
    };
    addBall(newBall);
  }, [addBall]);

  const handleUndo = () => {
    if (!isLiveMode && localBalls.length > 0) {
      setLocalBalls((prev) => prev.slice(0, -1));
    }
    // In live mode, undo would require a reverse transaction (future feature)
  };

  const toggleDemoMode = () => {
    if (isDemoMode) {
      Alert.alert(
        'Switch to Live Mode',
        'This will clear all demo data and start a fresh innings. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Start Live',
            style: 'destructive',
            onPress: () => {
              setLocalBalls([]);
              setIsDemoMode(false);
            },
          },
        ]
      );
    } else {
      Alert.alert(
        'Load Demo Data',
        'This will replace your current scoring with demo data. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Load Demo',
            onPress: () => {
              setLocalBalls(generateDemoData());
              setIsDemoMode(true);
            },
          },
        ]
      );
    }
  };

  const handleReset = () => {
    Alert.alert(
      'Reset Innings',
      'This will clear all balls and start fresh. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            setLocalBalls([]);
            setOptimisticBalls([]);
            setIsDemoMode(false);
          },
        },
      ]
    );
  };

  // ---- Loading state (live mode only) ----
  if (isLiveMode && syncLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.electricGreen} />
          <Text style={styles.loadingText}>Connecting to match...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Mode Controls (only in local/demo mode) */}
        {!isLiveMode && (
          <View style={styles.demoControls}>
            <View style={styles.demoModeIndicator}>
              <View style={[styles.modeBadge, isDemoMode && styles.modeBadgeActive]}>
                <Text style={[styles.modeBadgeText, isDemoMode && styles.modeBadgeTextActive]}>
                  {isDemoMode ? '🎬 DEMO MODE' : '🔴 LIVE'}
                </Text>
              </View>
            </View>
            <View style={styles.controlButtons}>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={toggleDemoMode}
                activeOpacity={0.7}
              >
                <Text style={styles.controlButtonText}>
                  {isDemoMode ? 'Go Live' : 'Load Demo'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.controlButton, styles.controlButtonDanger]}
                onPress={handleReset}
                activeOpacity={0.7}
              >
                <Text style={styles.controlButtonText}>Reset</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Sync status banner (live mode) */}
        {isLiveMode && (
          <View style={styles.syncBanner}>
            <View style={styles.syncDot} />
            <Text style={styles.syncText}>
              {optimisticBalls.length > 0
                ? `Syncing ${optimisticBalls.length} ball${optimisticBalls.length > 1 ? 's' : ''}...`
                : 'Synced'}
            </Text>
            {syncError && (
              <Text style={styles.syncError}>
                {syncError.message}
              </Text>
            )}
          </View>
        )}

        {/* Live Score Header */}
        <LiveScoreHeader
          runs={stats.totalRuns}
          wickets={stats.totalWickets}
          overs={currentOverFormatted}
          runRate={runRate}
          teamName={isLiveMode ? (match?.teamA ?? 'Team') : teamName}
          style={styles.header}
        />

        {/* Current Over Progress */}
        <View style={styles.overSection}>
          <Text style={styles.sectionTitle}>CURRENT OVER</Text>
          <OverProgress
            ballsBowled={stats.currentBall}
            ballOutcomes={ballOutcomes}
            size="lg"
          />
        </View>

        {/* Recent Balls */}
        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <Text style={styles.sectionTitle}>RECENT BALLS</Text>
            {!isLiveMode && balls.length > 0 && (
              <TouchableOpacity
                style={styles.undoButton}
                onPress={handleUndo}
                activeOpacity={0.7}
              >
                <Text style={styles.undoIcon}>↶</Text>
                <Text style={styles.undoText}>Undo</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.recentBalls}>
            {balls.length === 0 ? (
              <Text style={styles.emptyText}>No balls bowled yet</Text>
            ) : (
              balls
                .slice(-10)
                .reverse()
                .map((ball, index) => {
                  // Check if this ball is optimistic (pending sync)
                  const actualIndex = balls.length - index - 1;
                  const isOptimistic =
                    isLiveMode &&
                    actualIndex >= firestoreBalls.length;

                  return (
                    <View
                      key={`${actualIndex}-${ball.runs}-${ball.commentary}`}
                      style={[
                        styles.ballChip,
                        ball.wicket && styles.ballChipWicket,
                        (ball.runs === 4 || ball.runs === 6) &&
                          !ball.extras &&
                          styles.ballChipBoundary,
                        isOptimistic && styles.ballChipOptimistic,
                      ]}
                    >
                      <Text
                        style={[
                          styles.ballChipText,
                          ball.wicket && styles.ballChipTextWicket,
                          (ball.runs === 4 || ball.runs === 6) &&
                            !ball.extras &&
                            styles.ballChipTextBoundary,
                          isOptimistic && styles.ballChipTextOptimistic,
                        ]}
                      >
                        {formatBallDisplay(ball)}
                      </Text>
                    </View>
                  );
                })
            )}
          </View>
        </View>
      </ScrollView>

      {/* Scoring Buttons - Fixed at bottom for thumb access */}
      <View style={styles.buttonSection}>
        <Text style={styles.buttonSectionTitle}>SCORE RUNS</Text>

        {/* Score Buttons - Two rows for thumb-first layout */}
        <View style={styles.scoreGrid}>
          <View style={styles.scoreRow}>
            {[0, 1, 2].map((runs) => (
              <ScoreButton
                key={runs}
                value={runs}
                onPress={handleScore}
                style={styles.scoreButtonSpacing}
              />
            ))}
          </View>
          <View style={styles.scoreRow}>
            {[3, 4, 6].map((runs) => (
              <ScoreButton
                key={runs}
                value={runs}
                onPress={handleScore}
                style={styles.scoreButtonSpacing}
              />
            ))}
          </View>
        </View>

        {/* Extra Buttons */}
        <View style={styles.extraRow}>
          {(['WD', 'NB', 'B', 'LB'] as ExtraType[]).map((type) => (
            <ExtraButton
              key={type}
              type={type}
              onPress={handleExtra}
              style={styles.extraButtonSpacing}
            />
          ))}
        </View>

        {/* Wicket Button */}
        <WicketButton
          onPress={handleWicket}
          pulse={balls.length > 0}
          style={styles.wicketButton}
        />
      </View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.deepNavy,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  // Sync banner
  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray800,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  syncDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.electricGreen,
  },
  syncText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textSecondary,
  },
  syncError: {
    fontSize: Typography.fontSize.xs,
    color: Colors.error,
    flex: 1,
    textAlign: 'right',
  },
  // Over section
  overSection: {
    marginBottom: Spacing.lg,
    backgroundColor: Colors.gray800,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.electricGreen,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  // Recent balls
  recentSection: {
    marginBottom: Spacing.lg,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  undoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray700,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  undoIcon: {
    fontSize: Typography.fontSize.xl,
    color: Colors.electricGreen,
  },
  undoText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.white,
  },
  recentBalls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  emptyText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  ballChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.gray700,
    borderRadius: BorderRadius.md,
    minWidth: 50,
    alignItems: 'center',
  },
  ballChipWicket: {
    backgroundColor: Colors.error,
  },
  ballChipBoundary: {
    backgroundColor: Colors.electricGreen,
  },
  ballChipOptimistic: {
    opacity: 0.6,
    borderWidth: 1,
    borderColor: Colors.electricGreen,
    borderStyle: 'dashed',
  },
  ballChipText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
  },
  ballChipTextWicket: {
    color: Colors.white,
  },
  ballChipTextBoundary: {
    color: Colors.deepNavy,
  },
  ballChipTextOptimistic: {
    color: Colors.electricGreen,
  },
  // Button section
  buttonSection: {
    backgroundColor: Colors.gray900,
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    borderTopWidth: 2,
    borderTopColor: Colors.electricGreen,
  },
  buttonSectionTitle: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  scoreGrid: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  scoreButtonSpacing: {
    flex: 0,
  },
  extraRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  extraButtonSpacing: {
    flex: 0,
  },
  wicketButton: {
    marginHorizontal: 0,
  },
  // Demo Mode Controls
  demoControls: {
    backgroundColor: Colors.gray800,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.electricGreen,
  },
  demoModeIndicator: {
    marginBottom: Spacing.sm,
  },
  modeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.gray700,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.gray600,
  },
  modeBadgeActive: {
    backgroundColor: Colors.electricGreen,
    borderColor: Colors.electricGreen,
  },
  modeBadgeText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textSecondary,
  },
  modeBadgeTextActive: {
    color: Colors.deepNavy,
  },
  controlButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  controlButton: {
    flex: 1,
    backgroundColor: Colors.gray700,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.gray600,
  },
  controlButtonDanger: {
    backgroundColor: Colors.error,
    borderColor: Colors.error,
  },
  controlButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.white,
  },
});
