import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
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
  calculateInningsStats,
  formatOvers,
  calculateRunRate,
  type Ball,
} from '@crichead/core';

/**
 * Generate demo data for 2 complete overs of cricket
 * Includes a mix of runs, boundaries, wickets, and extras
 */
const generateDemoData = (): Ball[] => {
  return [
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
};

/**
 * ScoringScreen - Live cricket scoring interface
 *
 * Features:
 * - Real-time score tracking
 * - Thumb-optimized button layout
 * - Undo functionality
 * - Recent balls history
 * - Auto-calculated statistics
 * - Demo mode with pre-populated data
 */
export default function ScoringScreen() {
  const [balls, setBalls] = useState<Ball[]>(generateDemoData()); // Start with demo data
  const [teamName] = useState('India'); // In real app, this would come from props/context
  const [isDemoMode, setIsDemoMode] = useState(true);

  // Calculate current innings statistics using shared utility
  const stats = useMemo(() => calculateInningsStats(balls), [balls]);

  // Format current over
  const currentOverFormatted = formatOvers(stats.currentOver, stats.currentBall);

  // Calculate run rate
  const runRate = calculateRunRate(
    stats.totalRuns,
    stats.currentOver,
    stats.currentBall
  );

  // Get balls for current over only
  const currentOverBalls = useMemo(() => {
    const validBallsCount = stats.currentOver * 6 + stats.currentBall;
    const startIndex = Math.max(0, validBallsCount - stats.currentBall);
    return balls.slice(startIndex);
  }, [balls, stats]);

  // Get ball outcomes for OverProgress
  const ballOutcomes = useMemo(() => {
    return currentOverBalls.map((ball): 'W' | 4 | 6 | null => {
      if (ball.wicket) return 'W';
      if (ball.runs === 4) return 4;
      if (ball.runs === 6) return 6;
      return null;
    });
  }, [currentOverBalls]);

  // Handle score button press
  const handleScore = (runs: number) => {
    const newBall: Ball = {
      bowlerId: 'bowler1', // In real app, track actual bowler
      strikerId: 'batsman1', // In real app, track actual batsman
      runs,
      extras: null,
      wicket: null,
      commentary: `${runs} ${runs === 1 ? 'run' : 'runs'}`,
    };
    setBalls([...balls, newBall]);
  };

  // Handle extra button press
  const handleExtra = (type: ExtraType) => {
    // Map abbreviation to full type
    const extraTypeMap: Record<ExtraType, 'wd' | 'nb' | 'b' | 'lb'> = {
      WD: 'wd',
      NB: 'nb',
      B: 'b',
      LB: 'lb',
    };

    const newBall: Ball = {
      bowlerId: 'bowler1',
      strikerId: 'batsman1',
      runs: 0,
      extras: {
        type: extraTypeMap[type],
        runs: 1, // Most extras give 1 run
      },
      wicket: null,
      commentary: `${type} - 1 run`,
    };
    setBalls([...balls, newBall]);
  };

  // Handle wicket button press
  const handleWicket = () => {
    const newBall: Ball = {
      bowlerId: 'bowler1',
      strikerId: 'batsman1',
      runs: 0,
      extras: null,
      wicket: {
        type: 'caught', // In real app, show modal to select wicket type
        fielderId: 'fielder1',
      },
      commentary: 'WICKET! Caught out',
    };
    setBalls([...balls, newBall]);
  };

  // Handle undo - remove last ball
  const handleUndo = () => {
    if (balls.length > 0) {
      setBalls(balls.slice(0, -1));
    }
  };

  // Toggle between demo and live mode
  const toggleDemoMode = () => {
    if (isDemoMode) {
      // Switching to live mode - clear all balls
      Alert.alert(
        'Switch to Live Mode',
        'This will clear all demo data and start a fresh innings. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Start Live',
            style: 'destructive',
            onPress: () => {
              setBalls([]);
              setIsDemoMode(false);
            },
          },
        ]
      );
    } else {
      // Switching to demo mode - load demo data
      Alert.alert(
        'Load Demo Data',
        'This will replace your current scoring with demo data. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Load Demo',
            onPress: () => {
              setBalls(generateDemoData());
              setIsDemoMode(true);
            },
          },
        ]
      );
    }
  };

  // Reset current innings
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
            setBalls([]);
            setIsDemoMode(false);
          },
        },
      ]
    );
  };

  // Format ball display
  const formatBallDisplay = (ball: Ball, index: number): string => {
    if (ball.wicket) return '⚡ W';
    if (ball.extras?.type === 'wd') return 'WD';
    if (ball.extras?.type === 'nb') return `NB + ${ball.runs}`;
    if (ball.extras?.type === 'b') return `${ball.extras.runs}b`;
    if (ball.extras?.type === 'lb') return `${ball.extras.runs}lb`;
    return ball.runs.toString();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Demo Mode Controls */}
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

        {/* Live Score Header */}
        <LiveScoreHeader
          runs={stats.totalRuns}
          wickets={stats.totalWickets}
          overs={currentOverFormatted}
          runRate={runRate}
          teamName={teamName}
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
            {balls.length > 0 && (
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
                .map((ball, index) => (
                  <View
                    key={balls.length - index - 1}
                    style={[
                      styles.ballChip,
                      ball.wicket && styles.ballChipWicket,
                      (ball.runs === 4 || ball.runs === 6) &&
                        styles.ballChipBoundary,
                    ]}
                  >
                    <Text
                      style={[
                        styles.ballChipText,
                        ball.wicket && styles.ballChipTextWicket,
                        (ball.runs === 4 || ball.runs === 6) &&
                          styles.ballChipTextBoundary,
                      ]}
                    >
                      {formatBallDisplay(ball, index)}
                    </Text>
                  </View>
                ))
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.deepNavy,
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
