import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import {
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
  formatBallDisplay,
  computeBatsmenStats,
  computeBowlerStats,
  type Ball,
} from '@crichead/core';

// ---------------------------------------------------------------------------
// Demo data
// ---------------------------------------------------------------------------

interface PlayerInfo {
  id: string;
  name: string;
  role: 'bat' | 'bowl' | 'all';
}

const DEMO_BATSMEN: PlayerInfo[] = [
  { id: 'bat1', name: 'Virat Kohli', role: 'bat' },
  { id: 'bat2', name: 'Rohit Sharma', role: 'bat' },
  { id: 'bat3', name: 'Hardik Pandya', role: 'all' },
  { id: 'bat4', name: 'KL Rahul', role: 'bat' },
  { id: 'bat5', name: 'Suryakumar Yadav', role: 'bat' },
  { id: 'bat6', name: 'Rishabh Pant', role: 'bat' },
  { id: 'bat7', name: 'Ravindra Jadeja', role: 'all' },
];

const DEMO_BOWLERS: PlayerInfo[] = [
  { id: 'bowl1', name: 'Jasprit Bumrah', role: 'bowl' },
  { id: 'bowl2', name: 'Mohammed Shami', role: 'bowl' },
  { id: 'bowl3', name: 'Ravichandran Ashwin', role: 'bowl' },
  { id: 'bowl4', name: 'Kuldeep Yadav', role: 'bowl' },
  { id: 'bat3', name: 'Hardik Pandya', role: 'all' },
  { id: 'bat7', name: 'Ravindra Jadeja', role: 'all' },
];

const generateDemoData = (): Ball[] => [
  { bowlerId: 'bowl1', strikerId: 'bat1', runs: 0, extras: null, wicket: null, commentary: 'Dot ball' },
  { bowlerId: 'bowl1', strikerId: 'bat1', runs: 1, extras: null, wicket: null, commentary: 'Single run' },
  { bowlerId: 'bowl1', strikerId: 'bat2', runs: 4, extras: null, wicket: null, commentary: 'FOUR! Beautiful cover drive' },
  { bowlerId: 'bowl1', strikerId: 'bat2', runs: 0, extras: null, wicket: null, commentary: 'Dot ball' },
  { bowlerId: 'bowl1', strikerId: 'bat2', runs: 0, extras: { type: 'wd', runs: 1 }, wicket: null, commentary: 'Wide down the leg side' },
  { bowlerId: 'bowl1', strikerId: 'bat2', runs: 2, extras: null, wicket: null, commentary: 'Two runs taken' },
  { bowlerId: 'bowl1', strikerId: 'bat2', runs: 0, extras: null, wicket: { type: 'caught', fielderId: 'fielder1' }, commentary: 'WICKET! Caught at mid-off' },
  { bowlerId: 'bowl2', strikerId: 'bat3', runs: 1, extras: null, wicket: null, commentary: 'Single run' },
  { bowlerId: 'bowl2', strikerId: 'bat1', runs: 6, extras: null, wicket: null, commentary: 'SIX! Massive hit over long-on!' },
  { bowlerId: 'bowl2', strikerId: 'bat1', runs: 0, extras: null, wicket: null, commentary: 'Dot ball' },
  { bowlerId: 'bowl2', strikerId: 'bat1', runs: 1, extras: { type: 'nb', runs: 1 }, wicket: null, commentary: 'No ball! Plus 1 run' },
  { bowlerId: 'bowl2', strikerId: 'bat3', runs: 0, extras: { type: 'b', runs: 2 }, wicket: null, commentary: 'Byes! 2 runs' },
  { bowlerId: 'bowl2', strikerId: 'bat3', runs: 4, extras: null, wicket: null, commentary: 'FOUR! Glorious shot through covers' },
  { bowlerId: 'bowl2', strikerId: 'bat3', runs: 1, extras: null, wicket: null, commentary: 'Single to end the over' },
];

// Helpers (formatBallDisplay, computeBatsmenStats, computeBowlerStats) imported from @crichead/core

type TabKey = 'comm' | 'players' | 'cards';
type PickerMode = 'striker' | 'nonStriker' | 'bowler' | null;

// ---------------------------------------------------------------------------
// ScoringScreen
// ---------------------------------------------------------------------------

interface ScoringScreenProps {
  matchId?: string | null;
  onBack?: () => void;
}

export default function ScoringScreen({ matchId = null, onBack }: ScoringScreenProps) {
  // ---- Firebase sync ----
  const {
    match,
    currentInningsBalls: firestoreBalls,
    loading: syncLoading,
    error: syncError,
    addBallToMatch,
  } = useMatchSync(matchId, { subscribeToBalls: true });

  // ---- Local / demo state ----
  const [localBalls, setLocalBalls] = useState<Ball[]>(generateDemoData());
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [teamName] = useState('India');

  // ---- Optimistic updates ----
  const [optimisticBalls, setOptimisticBalls] = useState<Ball[]>([]);

  // ---- Active player state ----
  const [strikerId, setStrikerId] = useState<string | null>('bat1');
  const [nonStrikerId, setNonStrikerId] = useState<string | null>('bat2');
  const [bowlerId, setBowlerId] = useState<string | null>('bowl1');
  const [pickerMode, setPickerMode] = useState<PickerMode>(null);

  // ---- Tab state ----
  const [activeTab, setActiveTab] = useState<TabKey>('players');

  const isLiveMode = matchId !== null;

  // ---- Reconcile optimistic balls ----
  // Ref must be declared before `balls` useMemo so it can read the
  // previous firestore count to compute the overlap.
  const prevFirestoreLenRef = useRef(firestoreBalls.length);

  // ---- Derived state ----
  const balls = useMemo(() => {
    if (!isLiveMode) return localBalls;
    // Firestore ball listener may deliver confirmed balls BEFORE the
    // reconciliation effect removes them from optimisticBalls.  During
    // that window the same ball exists in both arrays.  Compute the
    // overlap so we never double-count.
    const newlyConfirmed = Math.max(0, firestoreBalls.length - prevFirestoreLenRef.current);
    const pendingOptimistic = optimisticBalls.slice(newlyConfirmed);
    return [...firestoreBalls, ...pendingOptimistic];
  }, [isLiveMode, localBalls, firestoreBalls, optimisticBalls]);

  // Single source of truth: always derived from the deduped `balls` array
  // so display and detection can never disagree.
  const stats = useMemo(() => calculateInningsStats(balls), [balls]);

  const currentOverFormatted = formatOvers(stats.currentOver, stats.currentBall);
  const runRate = calculateRunRate(stats.totalRuns, stats.currentOver, stats.currentBall);

  const maxOvers = match?.oversPerInnings ?? 0;
  const maxWickets = (match?.playersPerSide ?? 11) - 1;
  const matchStatus = match?.status ?? 'live';
  const currentInningsIndex = match?.currentInningsIndex ?? 0;

  const allOversCompleted =
    maxOvers > 0 && stats.currentOver >= maxOvers && stats.currentBall === 0;
  const allOut = stats.totalWickets >= maxWickets;
  const isMatchFinished = matchStatus === 'finished';
  const isInningsComplete = allOversCompleted || allOut || isMatchFinished;
  const scoringDisabled = isLiveMode && isInningsComplete;

  const firstInningsRuns =
    match && match.innings.length > 1 ? match.innings[0].totalRuns : null;
  const isChasing = currentInningsIndex === 1 && firstInningsRuns !== null;

  // Players need to be selected before scoring can begin
  const playersReady = strikerId !== null && nonStrikerId !== null && bowlerId !== null;
  const inputDisabled = scoringDisabled || !playersReady || pickerMode !== null;

  // ---- Available players for picker ----
  const allPlayers = useMemo((): PlayerInfo[] => {
    if (!isLiveMode) return [...DEMO_BATSMEN, ...DEMO_BOWLERS].filter(
      (p, i, arr) => arr.findIndex((x) => x.id === p.id) === i,
    );
    // In live mode, pull from match.playingXI
    if (!match?.playingXI) return [];
    const players: PlayerInfo[] = [];
    for (const teamId of Object.keys(match.playingXI)) {
      for (const p of match.playingXI[teamId]) {
        if (!players.find((x) => x.id === p.id)) {
          players.push({ id: p.id, name: p.name, role: p.role });
        }
      }
    }
    return players;
  }, [isLiveMode, match]);

  // Dismissed batsmen
  const dismissedIds = useMemo(() => {
    const dismissed = new Set<string>();
    for (const b of balls) {
      if (b.wicket) dismissed.add(b.strikerId);
    }
    return dismissed;
  }, [balls]);

  const availableBatsmen = useMemo(() => {
    return allPlayers.filter((p) =>
      (p.role === 'bat' || p.role === 'all') &&
      !dismissedIds.has(p.id) &&
      p.id !== strikerId &&
      p.id !== nonStrikerId
    );
  }, [allPlayers, dismissedIds, strikerId, nonStrikerId]);

  const availableBowlers = useMemo(() => {
    return allPlayers.filter((p) =>
      (p.role === 'bowl' || p.role === 'all')
    );
  }, [allPlayers]);

  const getPlayerName = useCallback(
    (id: string | null) => {
      if (!id) return 'Select';
      return allPlayers.find((p) => p.id === id)?.name ?? id;
    },
    [allPlayers]
  );

  // Current over balls
  const currentOverBalls = useMemo(() => {
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

  // Batsmen and bowler stats
  const batsmenStatsMap = useMemo(() => computeBatsmenStats(balls), [balls]);
  const bowlerStatsMap = useMemo(() => computeBowlerStats(balls), [balls]);

  // ---- Detect over change / wicket for player prompts ----
  const prevBallsLenRef = useRef(balls.length);
  const prevOverRef = useRef(stats.currentOver);
  const prevWicketsRef = useRef(stats.totalWickets);

  // Refs for player IDs so the effect can read current values without depending on them
  const strikerIdRef = useRef(strikerId);
  const nonStrikerIdRef = useRef(nonStrikerId);
  strikerIdRef.current = strikerId;
  nonStrikerIdRef.current = nonStrikerId;

  useEffect(() => {
    const prevLen = prevBallsLenRef.current;

    // Handle reset (balls.length decreased) — sync refs to new state
    if (balls.length < prevLen) {
      console.log('[OVER-DETECT] RESET: balls', balls.length, 'prevLen', prevLen);
      prevBallsLenRef.current = balls.length;
      prevOverRef.current = stats.currentOver;
      prevWicketsRef.current = stats.totalWickets;
      return;
    }

    // No new ball added
    if (balls.length === prevLen) return;

    // New ball added — compare against previous refs
    const prevOver = prevOverRef.current;
    const prevWickets = prevWicketsRef.current;

    console.log('[OVER-DETECT] NEW BALL:', {
      ballsLen: balls.length,
      prevLen,
      currentOver: stats.currentOver,
      currentBall: stats.currentBall,
      prevOver,
      totalWickets: stats.totalWickets,
      prevWickets,
      overChanged: stats.currentOver > prevOver,
      wicketFell: stats.totalWickets > prevWickets,
    });

    prevBallsLenRef.current = balls.length;
    prevOverRef.current = stats.currentOver;
    prevWicketsRef.current = stats.totalWickets;

    const overChanged = stats.currentOver > prevOver;
    const wicketFell = stats.totalWickets > prevWickets;

    if (wicketFell && overChanged) {
      console.log('[OVER-DETECT] >>> WICKET + OVER CHANGE');
      setStrikerId(null);
      setBowlerId(null);
      setTimeout(() => setPickerMode('striker'), 300);
    } else if (wicketFell) {
      console.log('[OVER-DETECT] >>> WICKET');
      setStrikerId(null);
      setTimeout(() => setPickerMode('striker'), 300);
    } else if (overChanged) {
      console.log('[OVER-DETECT] >>> OVER CHANGE — showing bowler picker');
      setStrikerId(nonStrikerIdRef.current);
      setNonStrikerId(strikerIdRef.current);
      setBowlerId(null);
      setTimeout(() => setPickerMode('bowler'), 300);
    }
  }, [balls.length, stats]);

  // ---- Reconcile optimistic balls (state cleanup) ----
  useEffect(() => {
    if (firestoreBalls.length > prevFirestoreLenRef.current) {
      const newBallsCount = firestoreBalls.length - prevFirestoreLenRef.current;
      setOptimisticBalls((prev) => prev.slice(newBallsCount));
    }
    prevFirestoreLenRef.current = firestoreBalls.length;
  }, [firestoreBalls.length]);

  // ---- Handlers ----

  const addBall = useCallback(
    async (ball: Ball) => {
      if (isLiveMode) {
        setOptimisticBalls((prev) => [...prev, ball]);
        try {
          await addBallToMatch(ball);
        } catch {
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
      if (!strikerId || !bowlerId) return;
      const newBall: Ball = {
        bowlerId,
        strikerId,
        runs,
        extras: null,
        wicket: null,
        commentary: runs === 0 ? 'Dot ball' : runs === 4 ? 'FOUR!' : runs === 6 ? 'SIX!' : `${runs} ${runs === 1 ? 'run' : 'runs'}`,
      };
      addBall(newBall);
      // Swap strike on odd runs
      if (runs % 2 === 1) {
        const prev = strikerId;
        setStrikerId(nonStrikerId);
        setNonStrikerId(prev);
      }
    },
    [addBall, strikerId, nonStrikerId, bowlerId]
  );

  const handleExtra = useCallback(
    (type: ExtraType) => {
      if (!strikerId || !bowlerId) return;
      const extraTypeMap: Record<ExtraType, 'wd' | 'nb' | 'b' | 'lb'> = {
        WD: 'wd', NB: 'nb', B: 'b', LB: 'lb',
      };
      const newBall: Ball = {
        bowlerId,
        strikerId,
        runs: 0,
        extras: { type: extraTypeMap[type], runs: 1 },
        wicket: null,
        commentary: `${type} - 1 run`,
      };
      addBall(newBall);
    },
    [addBall, strikerId, bowlerId]
  );

  const handleWicket = useCallback(() => {
    if (!strikerId || !bowlerId) return;
    const newBall: Ball = {
      bowlerId,
      strikerId,
      runs: 0,
      extras: null,
      wicket: { type: 'caught', fielderId: 'fielder1' },
      commentary: `WICKET! ${getPlayerName(strikerId)} caught out`,
    };
    addBall(newBall);
  }, [addBall, strikerId, bowlerId, getPlayerName]);

  const handlePenalty = useCallback(() => {
    if (!strikerId || !bowlerId) return;
    Alert.alert(
      'Penalty Runs',
      'Add 5 penalty runs?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add 5 Runs',
          onPress: () => {
            const newBall: Ball = {
              bowlerId,
              strikerId,
              runs: 5,
              extras: null,
              wicket: null,
              commentary: 'PENALTY — 5 runs awarded',
            };
            addBall(newBall);
          },
        },
      ]
    );
  }, [addBall, strikerId, bowlerId]);

  const handleUndo = useCallback(() => {
    if (isLiveMode) {
      if (optimisticBalls.length > 0) {
        setOptimisticBalls((prev) => prev.slice(0, -1));
      }
    } else if (localBalls.length > 0) {
      setLocalBalls((prev) => prev.slice(0, -1));
    }
  }, [isLiveMode, optimisticBalls.length, localBalls.length]);

  const handlePickPlayer = useCallback(
    (playerId: string) => {
      if (pickerMode === 'striker') {
        setStrikerId(playerId);
        // If bowler is also null (wicket on last ball of over), queue bowler pick next
        if (bowlerId === null) {
          setPickerMode('bowler');
          return;
        }
      } else if (pickerMode === 'nonStriker') {
        setNonStrikerId(playerId);
      } else if (pickerMode === 'bowler') {
        setBowlerId(playerId);
      }
      setPickerMode(null);
    },
    [pickerMode, bowlerId]
  );

  const handleSwapStrike = useCallback(() => {
    const s = strikerId;
    const ns = nonStrikerId;
    setStrikerId(ns);
    setNonStrikerId(s);
  }, [strikerId, nonStrikerId]);

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
              setStrikerId(null);
              setNonStrikerId(null);
              setBowlerId(null);
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
              setStrikerId('bat1');
              setNonStrikerId('bat2');
              setBowlerId('bowl1');
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
            setStrikerId(null);
            setNonStrikerId(null);
            setBowlerId(null);
          },
        },
      ]
    );
  };

  // ---- Loading state ----
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

  const displayTeamName = isLiveMode ? (match?.teamA ?? 'Team') : teamName;
  const canUndo = isLiveMode ? optimisticBalls.length > 0 : localBalls.length > 0;

  // Players for the picker modal
  const pickerPlayers: PlayerInfo[] =
    pickerMode === 'bowler' ? availableBowlers :
    pickerMode === 'striker' || pickerMode === 'nonStriker' ? availableBatsmen :
    [];

  const pickerTitle =
    pickerMode === 'striker' ? 'Select Striker' :
    pickerMode === 'nonStriker' ? 'Select Non-Striker' :
    pickerMode === 'bowler' ? 'Select Bowler' : '';

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header (consistent with other screens) ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onBack}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backText}>{'\u2039'} Back</Text>
        </TouchableOpacity>

        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveBadgeText}>LIVE MATCH</Text>
        </View>

        <View style={{ width: 60 }} />
      </View>

      {/* ── Scrollable content ── */}
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
                  {isDemoMode ? 'DEMO MODE' : 'LIVE'}
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

        {/* Sync error */}
        {isLiveMode && syncError && (
          <View style={styles.syncBanner}>
            <Text style={styles.syncError}>{syncError.message}</Text>
          </View>
        )}

        {/* ── Score Section ── */}
        <View style={styles.scoreSection}>
          <Text style={styles.battingLabel}>
            {displayTeamName.toUpperCase()} BATTING
          </Text>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreText}>
              {stats.totalRuns}
              <Text style={styles.wicketsText}>/{stats.totalWickets}</Text>
            </Text>
            <View style={styles.oversBlock}>
              <Text style={styles.oversValue}>{currentOverFormatted}</Text>
              <Text style={styles.oversLabel}>OVERS</Text>
              <Text style={styles.crrText}>CRR: {runRate.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Target info */}
        {isLiveMode && isChasing && !isMatchFinished && (
          <View style={styles.targetBanner}>
            <Text style={styles.targetText}>
              Target: {firstInningsRuns! + 1} — Need{' '}
              {Math.max(0, firstInningsRuns! + 1 - stats.totalRuns)} from{' '}
              {maxOvers > 0
                ? Math.max(0, maxOvers * 6 - (stats.currentOver * 6 + stats.currentBall))
                : '?'}{' '}
              balls
            </Text>
          </View>
        )}

        {/* Innings / Match end banner */}
        {isLiveMode && isInningsComplete && (
          <View
            style={[
              styles.inningsEndBanner,
              isMatchFinished && styles.matchEndBanner,
            ]}
          >
            <Text style={styles.inningsEndTitle}>
              {isMatchFinished ? 'MATCH FINISHED' : 'INNINGS COMPLETE'}
            </Text>
            <Text style={styles.inningsEndReason}>
              {isMatchFinished && currentInningsIndex === 1 && firstInningsRuns !== null
                ? stats.totalRuns > firstInningsRuns
                  ? `${match?.innings[1]?.teamId ?? 'Team'} wins by ${maxWickets - stats.totalWickets} wickets`
                  : stats.totalRuns === firstInningsRuns
                    ? 'Match Tied'
                    : `${match?.innings[0]?.teamId ?? 'Team'} wins by ${firstInningsRuns - stats.totalRuns} runs`
                : allOut
                  ? `All out — ${stats.totalWickets} wickets`
                  : `${maxOvers} overs completed`}
            </Text>
            <Text style={styles.inningsEndScore}>
              {stats.totalRuns}/{stats.totalWickets} ({currentOverFormatted} ov)
            </Text>
          </View>
        )}

        {/* ── This Over ── */}
        <View style={styles.thisOverRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.thisOverScroll}
            contentContainerStyle={styles.thisOverBalls}
          >
            {currentOverBalls.map((ball, i) => {
              const isWicket = !!ball.wicket;
              const isBoundary = (ball.runs === 4 || ball.runs === 6) && !ball.extras;
              return (
                <View
                  key={i}
                  style={[
                    styles.overBallCircle,
                    isWicket && styles.overBallWicket,
                    isBoundary && styles.overBallBoundary,
                  ]}
                >
                  <Text
                    style={[
                      styles.overBallText,
                      isWicket && styles.overBallTextWicket,
                      isBoundary && styles.overBallTextBoundary,
                    ]}
                  >
                    {formatBallDisplay(ball)}
                  </Text>
                </View>
              );
            })}
            {Array.from({ length: Math.max(0, 6 - currentOverBalls.filter(b => {
              const isExtra = b?.extras?.type === 'wd' || b?.extras?.type === 'nb';
              return !isExtra;
            }).length) }).map((_, i) => (
              <View key={`empty-${i}`} style={styles.overBallEmpty} />
            ))}
          </ScrollView>
          <Text style={styles.thisOverLabel}>THIS OVER</Text>
        </View>

        {/* ── Tab Bar ── */}
        <View style={styles.tabBar}>
          {([
            { key: 'comm' as TabKey, label: 'COMM.' },
            { key: 'players' as TabKey, label: 'PLAYERS' },
            { key: 'cards' as TabKey, label: 'CARDS' },
          ]).map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Players Tab ── */}
        {activeTab === 'players' && (
          <View style={styles.playersContent}>
            {/* Batsmen Card */}
            <View style={styles.statsCard}>
              <View style={styles.statsHeaderRow}>
                <Text style={styles.statsHeaderLabel}>BATSMEN</Text>
                <Text style={styles.statsHeaderCol}>R</Text>
                <Text style={styles.statsHeaderCol}>B</Text>
                <Text style={styles.statsHeaderCol}>SR</Text>
              </View>

              {strikerId ? (() => {
                const s = batsmenStatsMap.get(strikerId);
                const runs = s?.runs ?? 0;
                const b = s?.balls ?? 0;
                const sr = b > 0 ? ((runs / b) * 100).toFixed(0) : '0';
                return (
                  <View style={styles.statsRow}>
                    <Text style={[styles.playerName, styles.playerNameStriker]}>
                      {getPlayerName(strikerId)}*
                    </Text>
                    <Text style={styles.statsValue}>{runs}</Text>
                    <Text style={styles.statsValue}>{b}</Text>
                    <Text style={styles.statsValue}>{sr}</Text>
                  </View>
                );
              })() : (
                <TouchableOpacity
                  style={styles.selectPlayerCard}
                  onPress={() => setPickerMode('striker')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.selectPlayerIcon}>+</Text>
                  <Text style={styles.selectPlayerText}>Select Striker</Text>
                </TouchableOpacity>
              )}

              {nonStrikerId ? (() => {
                const s = batsmenStatsMap.get(nonStrikerId);
                const runs = s?.runs ?? 0;
                const b = s?.balls ?? 0;
                const sr = b > 0 ? ((runs / b) * 100).toFixed(0) : '0';
                return (
                  <View style={styles.statsRow}>
                    <Text style={styles.playerName}>{getPlayerName(nonStrikerId)}</Text>
                    <Text style={styles.statsValue}>{runs}</Text>
                    <Text style={styles.statsValue}>{b}</Text>
                    <Text style={styles.statsValue}>{sr}</Text>
                  </View>
                );
              })() : (
                <TouchableOpacity
                  style={styles.selectPlayerCard}
                  onPress={() => setPickerMode('nonStriker')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.selectPlayerIcon}>+</Text>
                  <Text style={styles.selectPlayerText}>Select Non-Striker</Text>
                </TouchableOpacity>
              )}
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

              {bowlerId ? (() => {
                const s = bowlerStatsMap.get(bowlerId);
                const validBalls = s?.validBalls ?? 0;
                const overs = `${Math.floor(validBalls / 6)}.${validBalls % 6}`;
                const runs = s?.runs ?? 0;
                const wickets = s?.wickets ?? 0;
                const econ = validBalls > 0 ? ((runs / validBalls) * 6).toFixed(1) : '0.0';
                return (
                  <View style={styles.statsRow}>
                    <Text style={styles.playerName}>{getPlayerName(bowlerId)}</Text>
                    <Text style={styles.statsValue}>{overs}</Text>
                    <Text style={styles.statsValue}>{runs}</Text>
                    <Text style={[styles.statsValue, wickets > 0 && styles.statsValueHighlight]}>
                      {wickets}
                    </Text>
                    <Text style={styles.statsValue}>{econ}</Text>
                  </View>
                );
              })() : (
                <TouchableOpacity
                  style={styles.selectPlayerCard}
                  onPress={() => setPickerMode('bowler')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.selectPlayerIcon}>+</Text>
                  <Text style={styles.selectPlayerText}>Select Bowler</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* ── Commentary Tab ── */}
        {activeTab === 'comm' && (
          <View style={styles.commContent}>
            {balls.length === 0 ? (
              <Text style={styles.emptyStatsText}>No commentary yet</Text>
            ) : (
              balls
                .slice(-10)
                .reverse()
                .map((ball, index) => {
                  const actualIndex = balls.length - index - 1;
                  return (
                    <View key={`${actualIndex}-${ball.commentary}`} style={styles.commRow}>
                      <View style={[
                        styles.commBallBadge,
                        ball.wicket && styles.commBallBadgeWicket,
                        (ball.runs === 4 || ball.runs === 6) && !ball.extras && styles.commBallBadgeBoundary,
                      ]}>
                        <Text style={[
                          styles.commBallText,
                          (ball.wicket || ((ball.runs === 4 || ball.runs === 6) && !ball.extras)) && styles.commBallTextHighlight,
                        ]}>
                          {formatBallDisplay(ball)}
                        </Text>
                      </View>
                      <Text style={styles.commText}>{ball.commentary}</Text>
                    </View>
                  );
                })
            )}
          </View>
        )}

        {/* ── Cards Tab ── */}
        {activeTab === 'cards' && (
          <View style={styles.cardsContent}>
            <Text style={styles.emptyStatsText}>Scorecards coming soon</Text>
          </View>
        )}
      </ScrollView>

      {/* ── Scoring Pad (Fixed at bottom) ── */}
      <View style={[styles.scoringPad, (scoringDisabled) && styles.scoringPadDisabled]}>
        {scoringDisabled ? (
          <View style={styles.disabledOverlay}>
            <Text style={styles.disabledText}>
              {isMatchFinished ? 'Match has ended' : 'Innings complete'}
            </Text>
          </View>
        ) : !playersReady ? (
          <View style={styles.disabledOverlay}>
            <Text style={styles.disabledText}>Select all players to start scoring</Text>
            <View style={styles.quickSelectRow}>
              {!strikerId && (
                <TouchableOpacity
                  style={styles.quickSelectBtn}
                  onPress={() => setPickerMode('striker')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.quickSelectText}>Select Striker</Text>
                </TouchableOpacity>
              )}
              {!nonStrikerId && (
                <TouchableOpacity
                  style={styles.quickSelectBtn}
                  onPress={() => setPickerMode('nonStriker')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.quickSelectText}>Select Non-Striker</Text>
                </TouchableOpacity>
              )}
              {!bowlerId && (
                <TouchableOpacity
                  style={styles.quickSelectBtn}
                  onPress={() => setPickerMode('bowler')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.quickSelectText}>Select Bowler</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : (
          <>
            {/* Run buttons: 0 1 2 3 */}
            <View style={styles.runRow}>
              {[0, 1, 2, 3].map((runs) => (
                <TouchableOpacity
                  key={runs}
                  style={styles.runButton}
                  onPress={() => handleScore(runs)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.runButtonText}>{runs}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Boundary + Wicket row */}
            <View style={styles.boundaryRow}>
              <TouchableOpacity
                style={styles.boundaryButton}
                onPress={() => handleScore(4)}
                activeOpacity={0.7}
              >
                <Text style={styles.boundaryButtonText}>4</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.boundaryButton}
                onPress={() => handleScore(6)}
                activeOpacity={0.7}
              >
                <Text style={styles.boundaryButtonText}>6</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.wicketButton}
                onPress={handleWicket}
                activeOpacity={0.7}
              >
                <Text style={styles.wicketButtonText}>WICKET</Text>
              </TouchableOpacity>
            </View>

            {/* Extras + Penalty + Undo row */}
            <View style={styles.extrasRow}>
              {(['WD', 'NB', 'B', 'LB'] as ExtraType[]).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={styles.extraButton}
                  onPress={() => handleExtra(type)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.extraButtonText}>{type}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.penaltyButton}
                onPress={handlePenalty}
                activeOpacity={0.7}
              >
                <Text style={styles.penaltyButtonText}>PEN</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.undoButton, !canUndo && styles.undoButtonDisabled]}
                onPress={handleUndo}
                disabled={!canUndo}
                activeOpacity={0.7}
              >
                <Text style={[styles.undoIcon, !canUndo && styles.undoIconDisabled]}>{'\u21A9'}</Text>
              </TouchableOpacity>
            </View>

            {/* Swap Player row */}
            <View style={styles.swapRow}>
              <TouchableOpacity
                style={styles.swapButton}
                onPress={handleSwapStrike}
                activeOpacity={0.7}
              >
                <Text style={styles.swapIcon}>{'\u21C4'}</Text>
                <Text style={styles.swapText}>SWAP STRIKE</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* ── Player Picker Modal ── */}
      <Modal
        visible={pickerMode !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setPickerMode(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{pickerTitle}</Text>
              <TouchableOpacity
                onPress={() => setPickerMode(null)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalClose}>{'\u2715'}</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {pickerPlayers.length === 0 ? (
                <Text style={styles.emptyStatsText}>No players available</Text>
              ) : (
                pickerPlayers.map((player) => (
                  <TouchableOpacity
                    key={player.id}
                    style={styles.pickerRow}
                    onPress={() => handlePickPlayer(player.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.pickerAvatar}>
                      <Text style={styles.pickerAvatarText}>
                        {player.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.pickerInfo}>
                      <Text style={styles.pickerName}>{player.name}</Text>
                      <Text style={styles.pickerRole}>
                        {player.role === 'bat' ? 'Batsman' : player.role === 'bowl' ? 'Bowler' : 'All-rounder'}
                      </Text>
                    </View>
                    <View style={styles.pickerChevron}>
                      <Text style={styles.pickerChevronText}>{'\u203A'}</Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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

  // ── Header (consistent with other screens) ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backText: {
    fontSize: Typography.fontSize.base,
    color: Colors.white,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.electricGreen + '1A',
    borderWidth: 1,
    borderColor: Colors.electricGreen + '4D',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.electricGreen,
  },
  liveBadgeText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.electricGreen,
    letterSpacing: 1,
  },

  // ── Scroll ──
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },

  // ── Score Section ──
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

  // ── This Over ──
  thisOverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  thisOverScroll: {
    flex: 1,
    marginRight: Spacing.md,
  },
  thisOverBalls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  overBallCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.gray700,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.gray600,
  },
  overBallWicket: {
    backgroundColor: Colors.error,
    borderColor: Colors.error,
  },
  overBallBoundary: {
    backgroundColor: Colors.electricGreen,
    borderColor: Colors.electricGreen,
  },
  overBallText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
  },
  overBallTextWicket: {
    color: Colors.white,
  },
  overBallTextBoundary: {
    color: Colors.deepNavy,
  },
  overBallEmpty: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.gray600,
  },
  thisOverLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textSecondary,
    letterSpacing: 1,
  },

  // ── Tab Bar ──
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.gray800,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xs,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: Colors.electricGreen,
  },
  tabText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.gray400,
    letterSpacing: 0.5,
  },
  tabTextActive: {
    color: Colors.deepNavy,
  },

  // ── Players Tab ──
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
  emptyStatsText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.gray500,
    fontStyle: 'italic',
    paddingVertical: Spacing.md,
  },

  // ── Select Player Card (empty state) ──
  selectPlayerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.electricGreen + '4D',
    borderStyle: 'dashed',
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm + 2,
    marginTop: Spacing.xs,
    gap: Spacing.sm,
  },
  selectPlayerIcon: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.electricGreen,
  },
  selectPlayerText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.electricGreen,
  },

  // ── Commentary Tab ──
  commContent: {
    gap: Spacing.sm,
  },
  commRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray800,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  commBallBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.gray700,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commBallBadgeWicket: {
    backgroundColor: Colors.error,
  },
  commBallBadgeBoundary: {
    backgroundColor: Colors.electricGreen,
  },
  commBallText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
  },
  commBallTextHighlight: {
    color: Colors.deepNavy,
  },
  commText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },

  // ── Cards Tab ──
  cardsContent: {
    backgroundColor: Colors.gray800,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },

  // ── Scoring Pad ──
  scoringPad: {
    backgroundColor: Colors.gray800,
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  scoringPadDisabled: {
    opacity: 0.5,
  },
  runRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  runButton: {
    flex: 1,
    height: 56,
    backgroundColor: Colors.gray700,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.gray600,
  },
  runButtonText: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
  },
  boundaryRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  boundaryButton: {
    flex: 1,
    height: 56,
    backgroundColor: Colors.electricGreen,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  boundaryButtonText: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.deepNavy,
  },
  wicketButton: {
    flex: 2,
    height: 56,
    backgroundColor: Colors.error,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wicketButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.extrabold,
    color: Colors.white,
    letterSpacing: 1,
  },
  extrasRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  extraButton: {
    flex: 1,
    height: 44,
    backgroundColor: Colors.gray700,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.gray600,
  },
  extraButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textSecondary,
  },
  penaltyButton: {
    flex: 1,
    height: 44,
    backgroundColor: Colors.warning + '1A',
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.warning + '4D',
  },
  penaltyButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.warning,
  },
  undoButton: {
    width: 44,
    height: 44,
    backgroundColor: Colors.gray700,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.gray600,
  },
  undoButtonDisabled: {
    opacity: 0.4,
  },
  undoIcon: {
    fontSize: Typography.fontSize.xl,
    color: Colors.white,
  },
  undoIconDisabled: {
    color: Colors.gray500,
  },
  swapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  swapIcon: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
  },
  swapText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textSecondary,
    letterSpacing: 1,
  },

  // ── Quick select (when players not set) ──
  quickSelectRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  quickSelectBtn: {
    backgroundColor: Colors.electricGreen,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  quickSelectText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.deepNavy,
  },

  // ── Sync banner ──
  syncBanner: {
    backgroundColor: Colors.error + '1A',
    borderWidth: 1,
    borderColor: Colors.error + '4D',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
  },
  syncError: {
    fontSize: Typography.fontSize.xs,
    color: Colors.error,
  },

  // ── Demo Mode Controls ──
  demoControls: {
    backgroundColor: Colors.gray800,
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  demoModeIndicator: {
    marginBottom: Spacing.sm,
  },
  modeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.gray700,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.gray600,
  },
  modeBadgeActive: {
    backgroundColor: Colors.electricGreen,
    borderColor: Colors.electricGreen,
  },
  modeBadgeText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textSecondary,
    letterSpacing: 1,
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
    borderRadius: BorderRadius.lg,
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

  // ── Banners ──
  targetBanner: {
    backgroundColor: Colors.electricGreen + '1A',
    borderWidth: 1,
    borderColor: Colors.electricGreen + '4D',
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  targetText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.electricGreen,
    textAlign: 'center',
  },
  inningsEndBanner: {
    backgroundColor: Colors.warning + '1A',
    borderWidth: 1,
    borderColor: Colors.warning + '4D',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    alignItems: 'center',
  },
  matchEndBanner: {
    backgroundColor: Colors.electricGreen + '1A',
    borderColor: Colors.electricGreen + '4D',
  },
  inningsEndTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
    letterSpacing: 2,
    marginBottom: Spacing.xs,
  },
  inningsEndReason: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  inningsEndScore: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.electricGreen,
  },
  disabledOverlay: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  disabledText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textSecondary,
    letterSpacing: 1,
  },

  // ── Player Picker Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.deepNavy,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '60%',
    borderTopWidth: 2,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: Colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
  },
  modalClose: {
    fontSize: Typography.fontSize.xl,
    color: Colors.gray400,
    padding: Spacing.xs,
  },
  modalScroll: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray800,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pickerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.gray700,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  pickerAvatarText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
  },
  pickerInfo: {
    flex: 1,
  },
  pickerName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
  },
  pickerRole: {
    fontSize: Typography.fontSize.xs,
    color: Colors.gray500,
    marginTop: 2,
  },
  pickerChevron: {
    marginLeft: Spacing.sm,
  },
  pickerChevronText: {
    fontSize: Typography.fontSize['2xl'],
    color: Colors.gray500,
  },
});
