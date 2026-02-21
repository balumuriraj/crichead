import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { type ExtraType } from '@crichead/ui/mobile';
import {
  useMatchSync,
  calculateInningsStats,
  formatOvers,
  calculateRunRate,
  computeBatsmenStats,
  computeBowlerStats,
  getFirebaseDb,
  type Ball,
} from '@crichead/core';
import { addDoc, collection, updateDoc, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import type { QuickMatchConfig } from '../types/QuickMatchConfig';
import {
  generateLocalId,
  saveLocalMatch,
  loadLocalMatch,
} from '../utils/localMatchStore';
import type { TabKey, PickerMode, PlayerInfo } from '../types/scoring';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type UseMatchSyncReturn = ReturnType<typeof useMatchSync>;

interface UseScoringStateInput {
  matchId: string | null;
  config?: QuickMatchConfig;
  initialLocalMatchId?: string;
  match: UseMatchSyncReturn['match'];
  firestoreBalls: UseMatchSyncReturn['currentInningsBalls'];
  syncError: UseMatchSyncReturn['error'];
  addBallToMatch: UseMatchSyncReturn['addBallToMatch'];
  endCurrentInnings: UseMatchSyncReturn['endCurrentInnings'];
  undoLastBallFromMatch: UseMatchSyncReturn['undoLastBallFromMatch'];
  liveMatchId: string | null;
  setLiveMatchId: React.Dispatch<React.SetStateAction<string | null>>;
}

export interface ScoringState {
  // Loading
  localLoading: boolean;
  // Live mode
  isLiveMode: boolean;
  canGoLive: boolean;
  // Display
  displayTeamName: string;
  currentOverFormatted: string;
  runRate: number;
  // Stats
  balls: Ball[];
  stats: ReturnType<typeof calculateInningsStats>;
  currentOverBalls: Ball[];
  batsmenStatsMap: ReturnType<typeof computeBatsmenStats>;
  bowlerStatsMap: ReturnType<typeof computeBowlerStats>;
  // Match state
  maxOvers: number;
  maxWickets: number;
  isInningsComplete: boolean;
  isMatchFinished: boolean;
  scoringDisabled: boolean;
  isChasing: boolean;
  firstInningsRuns: number | null;
  currentInningsIndex: number;
  allOut: boolean;
  // Precomputed innings-end banner strings
  inningsEndReason: string;
  inningsEndScore: string;
  // Player state
  playersReady: boolean;
  inputDisabled: boolean;
  canUndo: boolean;
  strikerId: string | null;
  nonStrikerId: string | null;
  bowlerId: string | null;
  pickerMode: PickerMode;
  pickerPlayers: PlayerInfo[];
  pickerTitle: string;
  // UI state
  activeTab: TabKey;
  showSettingsModal: boolean;
  expandedSection: string | null;
  showOverCompleteModal: boolean;
  isOverCompleteWaiting: boolean;
  // Setters
  setPickerMode: (mode: PickerMode) => void;
  setActiveTab: (tab: TabKey) => void;
  setShowSettingsModal: (show: boolean) => void;
  setExpandedSection: (section: string | null) => void;
  setShowOverCompleteModal: (show: boolean) => void;
  // Handlers
  getPlayerName: (id: string | null) => string;
  handleScore: (runs: number) => void;
  handleExtra: (type: ExtraType) => void;
  handleWicket: () => void;
  handlePenalty: () => void;
  handleUndo: () => void;
  handleGoLive: () => Promise<void>;
  handlePickPlayer: (playerId: string) => void;
  handleSwapStrike: () => void;
  handleEndInnings: () => Promise<void>;
  handleEndMatch: () => Promise<void>;
  handleStartNextOver: () => void;
  completedOverBalls: Ball[];
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useScoringState({
  config,
  initialLocalMatchId,
  match,
  firestoreBalls,
  syncError: _syncError,
  addBallToMatch,
  endCurrentInnings,
  undoLastBallFromMatch,
  liveMatchId,
  setLiveMatchId,
}: UseScoringStateInput): ScoringState {
  const router = useRouter();

  // ---- Local state ----
  const [localBalls, setLocalBalls] = useState<Ball[]>([]);
  const [resolvedConfig, setResolvedConfig] = useState<QuickMatchConfig | undefined>(config);
  const [localLoading, setLocalLoading] = useState(!!initialLocalMatchId);

  // ---- Local mode innings state ----
  const [localCurrentInningsIndex, setLocalCurrentInningsIndex] = useState(0);
  const [localFirstInningsRuns, setLocalFirstInningsRuns] = useState<number | null>(null);

  // ---- Active player state ----
  const [strikerId, setStrikerId] = useState<string | null>(null);
  const [nonStrikerId, setNonStrikerId] = useState<string | null>(null);
  const [bowlerId, setBowlerId] = useState<string | null>(null);
  const [pickerMode, setPickerMode] = useState<PickerMode>(null);

  // ---- Tab/UI state ----
  const [activeTab, setActiveTab] = useState<TabKey>('players');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>('Match Settings');
  const [showOverCompleteModal, setShowOverCompleteModal] = useState(false);

  const isLiveMode = liveMatchId !== null;

  // ---- Stable refs ----
  const localMatchIdRef = useRef<string>(initialLocalMatchId ?? generateLocalId());
  const isMatchEndedRef = useRef<boolean>(false);
  const prevFirestoreLenRef = useRef(firestoreBalls.length);

  // ---- Load from AsyncStorage when resuming a local match ----
  useEffect(() => {
    if (!initialLocalMatchId) return;
    loadLocalMatch(initialLocalMatchId).then((record) => {
      if (record) {
        setResolvedConfig(record.config);
        setLocalBalls(record.balls);
        setStrikerId(record.strikerId);
        setNonStrikerId(record.nonStrikerId);
        setBowlerId(record.bowlerId);
        if (record.currentInningsIndex !== undefined) {
          setLocalCurrentInningsIndex(record.currentInningsIndex);
        }
        if (record.firstInningsRuns !== undefined) {
          setLocalFirstInningsRuns(record.firstInningsRuns);
        }
      }
      setLocalLoading(false);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Derived state ----
  const balls = localBalls;

  const stats = useMemo(() => calculateInningsStats(balls), [balls]);

  const currentOverFormatted = formatOvers(stats.currentOver, stats.currentBall);
  const runRate = calculateRunRate(stats.totalRuns, stats.currentOver, stats.currentBall);

  const maxOvers = match?.oversPerInnings ?? resolvedConfig?.oversPerInnings ?? 0;
  const wicketsPerInnings = match?.wicketsPerInnings ?? resolvedConfig?.wicketsPerInnings ?? 10;
  const maxWickets = Math.min(wicketsPerInnings, (match?.playersPerSide ?? resolvedConfig?.playersPerSide ?? 11) - 1);
  const matchStatus = match?.status ?? 'live';
  const currentInningsIndex = isLiveMode ? (match?.currentInningsIndex ?? 0) : localCurrentInningsIndex;

  const firstInningsRuns = isLiveMode
    ? (match && match.innings.length > 1 ? match.innings[0].totalRuns : null)
    : localFirstInningsRuns;
  const isChasing = currentInningsIndex === 1 && firstInningsRuns !== null;

  const allOversCompleted =
    maxOvers > 0 && stats.currentOver >= maxOvers && stats.currentBall === 0;
  const allOut = stats.totalWickets >= maxWickets;
  const targetReached = isChasing && firstInningsRuns !== null && stats.totalRuns > firstInningsRuns;
  
  const isMatchFinished = isLiveMode 
    ? matchStatus === 'finished' 
    : (currentInningsIndex === 1 && (allOversCompleted || allOut || targetReached));
    
  const isInningsComplete = allOversCompleted || allOut || targetReached || (isLiveMode && isMatchFinished);

  // We consider an over "just completed" if stats.currentBall === 0 and bowlerId === (the bowler of the last ball)
  const lastBallBowlerIdForInput = balls.length > 0 ? balls[balls.length - 1].bowlerId : null;
  const isOverCompleteWaiting = stats.currentOver > 0 && stats.currentBall === 0 && (bowlerId === null || bowlerId === lastBallBowlerIdForInput);

  // If we are waiting for an over completion action (modal is up, or user selected "Edit This Over"),
  // do not lock the UI into the "Innings Complete" pad yet so they can undo or review.
  const scoringDisabled = isInningsComplete && !showOverCompleteModal && !isOverCompleteWaiting;

  const playersReady = strikerId !== null && nonStrikerId !== null && bowlerId !== null;

  // ---- Batting/bowling team IDs ----
  const battingTeamId: string | null = isLiveMode
    ? (match?.innings[currentInningsIndex]?.teamId ?? null)
    : resolvedConfig
      ? (localCurrentInningsIndex === 0
          ? (resolvedConfig.toss.decision === 'bat'
              ? resolvedConfig.toss.winner
              : resolvedConfig.toss.winner === resolvedConfig.teamA
                ? resolvedConfig.teamB
                : resolvedConfig.teamA)
          : (resolvedConfig.toss.decision === 'bat'
              ? (resolvedConfig.toss.winner === resolvedConfig.teamA ? resolvedConfig.teamB : resolvedConfig.teamA)
              : resolvedConfig.toss.winner)
        )
      : null;

  const bowlingTeamId: string | null =
    battingTeamId && resolvedConfig
      ? (battingTeamId === resolvedConfig.teamA ? resolvedConfig.teamB : resolvedConfig.teamA)
      : isLiveMode && battingTeamId && match
        ? (match.teamA === battingTeamId ? match.teamB : match.teamA)
        : null;

  const battingTeamPlayers = useMemo((): PlayerInfo[] => {
    if (!battingTeamId) return [];
    const xi = isLiveMode ? match?.playingXI : resolvedConfig?.playingXI;
    if (!xi) return [];
    return (xi[battingTeamId] ?? []).map((p) => ({ id: p.id, name: p.name, role: p.role }));
  }, [isLiveMode, match, resolvedConfig, battingTeamId]);

  const bowlingTeamPlayers = useMemo((): PlayerInfo[] => {
    if (!bowlingTeamId) return [];
    const xi = isLiveMode ? match?.playingXI : resolvedConfig?.playingXI;
    if (!xi) return [];
    return (xi[bowlingTeamId] ?? []).map((p) => ({ id: p.id, name: p.name, role: p.role }));
  }, [isLiveMode, match, resolvedConfig, bowlingTeamId]);

  const allPlayers = useMemo((): PlayerInfo[] => {
    return [...battingTeamPlayers, ...bowlingTeamPlayers].filter(
      (p, i, arr) => arr.findIndex((x) => x.id === p.id) === i,
    );
  }, [battingTeamPlayers, bowlingTeamPlayers]);

  const dismissedIds = useMemo(() => {
    const dismissed = new Set<string>();
    for (const b of balls) {
      if (b.wicket) dismissed.add(b.strikerId);
    }
    return dismissed;
  }, [balls]);

  const availableBatsmen = useMemo(() => {
    return battingTeamPlayers.filter((p) =>
      !dismissedIds.has(p.id) &&
      p.id !== strikerId &&
      p.id !== nonStrikerId
    );
  }, [battingTeamPlayers, dismissedIds, strikerId, nonStrikerId]);

  const availableBowlers = useMemo(() => {
    // If an over just completed, exclude the bowler who bowled it
    if (stats.currentOver > 0 && stats.currentBall === 0 && balls.length > 0) {
      const lastBowlerId = balls[balls.length - 1].bowlerId;
      return bowlingTeamPlayers.filter((p) => p.id !== lastBowlerId);
    }
    return bowlingTeamPlayers;
  }, [bowlingTeamPlayers, stats.currentOver, stats.currentBall, balls]);

  const getPlayerName = useCallback(
    (id: string | null) => {
      if (!id) return 'Select';
      return allPlayers.find((p) => p.id === id)?.name ?? id;
    },
    [allPlayers]
  );

  const currentOverBalls = useMemo(() => {
    // If an over just completed (currentBall is 0) AND a new bowler hasn't
    // been picked yet, we want to keep showing the balls from the over
    // that just finished. The bowlerId remains the previous bowler until
    // "Start Next Over" is clicked, and then it becomes null. Once a new
    // bowler is picked, bowlerId will differ from the last ball's bowler.
    const lastBallBowlerId = balls.length > 0 ? balls[balls.length - 1].bowlerId : null;
    const isWaitingForNewBowler = 
      stats.currentOver > 0 && 
      stats.currentBall === 0 && 
      (bowlerId === null || bowlerId === lastBallBowlerId);
      
    const ballsToFetch = isWaitingForNewBowler ? 6 : stats.currentBall;

    let validSeen = 0;
    let overStartIdx = balls.length;
    for (let i = balls.length - 1; i >= 0; i--) {
      const b = balls[i];
      const isExtra = b?.extras?.type === 'wd' || b?.extras?.type === 'nb';
      if (!isExtra) validSeen++;
      if (validSeen > ballsToFetch) {
        overStartIdx = i + 1;
        break;
      }
      if (i === 0) overStartIdx = 0;
    }
    return balls.slice(overStartIdx);
  }, [balls, stats, bowlerId]);

  const completedOverBalls = useMemo(() => {
    // Only compute this if we are exactly at the start of a new over
    if (stats.currentOver === 0 || stats.currentBall > 0) return [];
    
    let validSeen = 0;
    const overBalls: Ball[] = [];
    for (let i = balls.length - 1; i >= 0; i--) {
      const b = balls[i];
      overBalls.unshift(b);
      const isExtra = b?.extras?.type === 'wd' || b?.extras?.type === 'nb';
      if (!isExtra) validSeen++;
      if (validSeen === 6) {
        break;
      }
    }
    return overBalls;
  }, [balls, stats]);

  const batsmenStatsMap = useMemo(() => computeBatsmenStats(balls), [balls]);
  const bowlerStatsMap = useMemo(() => computeBowlerStats(balls), [balls]);

  // ---- Innings end banner strings (precomputed) ----
  const inningsEndReason = useMemo(() => {
    if (isMatchFinished && currentInningsIndex === 1 && firstInningsRuns !== null) {
      const getTeamName = (teamId: string | undefined) => {
        if (!teamId) return 'Team';
        if (isLiveMode && match) {
          return teamId === match.teamA ? (match.teamAName ?? match.teamA) : (match.teamBName ?? match.teamB);
        }
        if (resolvedConfig) {
          return teamId === resolvedConfig.teamA ? resolvedConfig.teamAName : resolvedConfig.teamBName;
        }
        return 'Team';
      };

      const innings2TeamId = isLiveMode ? match?.innings[1]?.teamId : battingTeamId;
      const innings1TeamId = isLiveMode ? match?.innings[0]?.teamId : bowlingTeamId;
      
      const innings2TeamName = getTeamName(innings2TeamId ?? undefined);
      const innings1TeamName = getTeamName(innings1TeamId ?? undefined);

      if (stats.totalRuns > firstInningsRuns) {
        return `${innings2TeamName} wins by ${maxWickets - stats.totalWickets} wickets`;
      } else if (stats.totalRuns === firstInningsRuns) {
        return 'Match Tied';
      } else {
        return `${innings1TeamName} wins by ${firstInningsRuns - stats.totalRuns} runs`;
      }
    }
    if (allOut) return `All out — ${stats.totalWickets} wickets`;
    return `${maxOvers} overs completed`;
  }, [
    isMatchFinished, currentInningsIndex, firstInningsRuns, stats.totalRuns, stats.totalWickets, 
    maxWickets, maxOvers, allOut, isLiveMode, match, resolvedConfig, battingTeamId, bowlingTeamId
  ]);

  const inningsEndScore = `${stats.totalRuns}/${stats.totalWickets} (${currentOverFormatted} ov)`;

  // ---- Display values ----
  const displayTeamName = isLiveMode
    ? (battingTeamId === match?.teamA
        ? (match?.teamAName ?? match?.teamA)
        : (match?.teamBName ?? match?.teamB)) ?? 'Team'
    : resolvedConfig
      ? (battingTeamId === resolvedConfig.teamA
          ? resolvedConfig.teamAName
          : resolvedConfig.teamBName)
      : 'Team';

  const canUndo = localBalls.length > 0;

  const inputDisabled =
    !playersReady ||
    scoringDisabled ||
    showSettingsModal ||
    showOverCompleteModal ||
    isOverCompleteWaiting;

  const pickerPlayers: PlayerInfo[] =
    pickerMode === 'bowler' ? availableBowlers :
    pickerMode === 'striker' || pickerMode === 'nonStriker' ? availableBatsmen :
    [];

  const pickerTitle =
    pickerMode === 'striker' ? 'Select Striker' :
    pickerMode === 'nonStriker' ? 'Select Non-Striker' :
    pickerMode === 'bowler' ? 'Select Bowler' : '';

  // ---- Detect over change / wicket for player prompts ----
  const prevBallsLenRef = useRef(balls.length);
  const prevOverRef = useRef(stats.currentOver);
  const prevWicketsRef = useRef(stats.totalWickets);
  const strikerIdRef = useRef(strikerId);
  const nonStrikerIdRef = useRef(nonStrikerId);
  strikerIdRef.current = strikerId;
  nonStrikerIdRef.current = nonStrikerId;
  const cascadeToBowlerRef = useRef(false);
  const prevInningsCompleteRef = useRef(false);

  useEffect(() => {
    const prevLen = prevBallsLenRef.current;

    if (balls.length < prevLen) {
      prevBallsLenRef.current = balls.length;
      prevOverRef.current = stats.currentOver;
      prevWicketsRef.current = stats.totalWickets;
      return;
    }

    if (balls.length === prevLen) return;

    const prevOver = prevOverRef.current;
    const prevWickets = prevWicketsRef.current;

    prevBallsLenRef.current = balls.length;
    prevOverRef.current = stats.currentOver;
    prevWicketsRef.current = stats.totalWickets;

    const overChanged = stats.currentOver > prevOver;
    const wicketFell = stats.totalWickets > prevWickets;

    if (wicketFell && overChanged) {
      cascadeToBowlerRef.current = true;
      setStrikerId(null);
      // Removed setBowlerId(null) here so modal shows correct bowler
      setTimeout(() => setShowOverCompleteModal(true), 300);
    } else if (wicketFell) {
      setStrikerId(null);
      setTimeout(() => setPickerMode('striker'), 300);
    } else if (overChanged) {
      setStrikerId(nonStrikerIdRef.current);
      setNonStrikerId(strikerIdRef.current);
      // Removed setBowlerId(null) here so modal shows correct bowler
      setTimeout(() => setShowOverCompleteModal(true), 300);
    }
  }, [balls.length, stats]);

  const handleStartNextOver = useCallback(() => {
    setShowOverCompleteModal(false);
    setBowlerId(null); // Clear bowlerId now to force picker and update playersReady
    setTimeout(() => {
      if (cascadeToBowlerRef.current) {
        setPickerMode('striker');
      } else {
        setPickerMode('bowler');
      }
    }, 300);
  }, []);

  // ---- Reset players when innings completes ----
  useEffect(() => {
    if (scoringDisabled && !prevInningsCompleteRef.current) {
      setStrikerId(null);
      setNonStrikerId(null);
      setBowlerId(null);
      setPickerMode(null);
    }
    prevInningsCompleteRef.current = scoringDisabled;
  }, [scoringDisabled]);

  // ---- Initialize live balls once ----
  const hasInitializedLiveBallsRef = useRef(false);
  useEffect(() => {
    if (!isLiveMode || !match || hasInitializedLiveBallsRef.current) return;
    const expectedBalls = match.innings[match.currentInningsIndex]?.ballCount ?? 0;
    if (firestoreBalls.length === expectedBalls) {
      if (firestoreBalls.length > 0 && localBalls.length === 0) {
        setLocalBalls(firestoreBalls);
      }
      hasInitializedLiveBallsRef.current = true;
    }
  }, [isLiveMode, match, firestoreBalls, localBalls.length]);

  // ---- Load live player state from Firestore on first match load ----
  const hasLoadedPlayersRef = useRef(false);

  useEffect(() => {
    if (!isLiveMode || !match || hasLoadedPlayersRef.current) return;
    if (match.currentStrikerId) setStrikerId(match.currentStrikerId);
    if (match.currentNonStrikerId) setNonStrikerId(match.currentNonStrikerId);
    if (match.currentBowlerId) setBowlerId(match.currentBowlerId);
    hasLoadedPlayersRef.current = true;
  }, [match, isLiveMode]);

  // ---- Persist local match state to AsyncStorage ----
  useEffect(() => {
    if (isLiveMode || !resolvedConfig || isMatchEndedRef.current) return;
    saveLocalMatch({
      id: localMatchIdRef.current,
      config: resolvedConfig,
      balls: localBalls,
      strikerId,
      nonStrikerId,
      bowlerId,
      status: localBalls.length > 0 || localCurrentInningsIndex > 0 ? 'live' : 'upcoming',
      currentInningsIndex: localCurrentInningsIndex,
      firstInningsRuns: localFirstInningsRuns,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }, [
    isLiveMode,
    resolvedConfig,
    localBalls,
    strikerId,
    nonStrikerId,
    bowlerId,
    localCurrentInningsIndex,
    localFirstInningsRuns,
  ]);

  // ---- Handlers ----

  const addBall = useCallback(
    async (ball: Ball) => {
      setLocalBalls((prev) => [...prev, ball]);
      
      if (isLiveMode) {
        try {
          await addBallToMatch(ball);
        } catch {
          setLocalBalls((prev) => {
            const idx = prev.lastIndexOf(ball);
            if (idx !== -1) {
              const next = [...prev];
              next.splice(idx, 1);
              return next;
            }
            return prev;
          });
          Alert.alert('Sync Error', 'Failed to save ball. Please try again.');
        }
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

  const handleUndo = useCallback(async () => {
    if (localBalls.length === 0) return;
    
    const ballToUndo = localBalls[localBalls.length - 1];
    setLocalBalls((prev) => prev.slice(0, -1));
    
    if (isLiveMode) {
      try {
        await undoLastBallFromMatch();
      } catch (err) {
        console.error('Failed to undo ball from Firebase:', err);
        setLocalBalls((prev) => [...prev, ballToUndo]); // revert
        Alert.alert('Sync Error', 'Failed to undo ball on the server. Please check your connection.');
      }
    }
  }, [isLiveMode, localBalls, undoLastBallFromMatch]);

  const handleGoLive = useCallback(async () => {
    if (!resolvedConfig) return;
    try {
      const db = getFirebaseDb();
      const battingFirstId =
        resolvedConfig.toss.decision === 'bat'
          ? resolvedConfig.toss.winner
          : resolvedConfig.toss.winner === resolvedConfig.teamA
            ? resolvedConfig.teamB
            : resolvedConfig.teamA;

      const inningsObj = [];
      const firstInningsTeamId = battingFirstId;
      const secondBattingTeamId =
        firstInningsTeamId === resolvedConfig.teamA ? resolvedConfig.teamB : resolvedConfig.teamA;

      if (localCurrentInningsIndex === 0) {
        inningsObj.push({
          teamId: firstInningsTeamId,
          totalRuns: stats.totalRuns,
          totalWickets: stats.totalWickets,
          overs: stats.currentOver + stats.currentBall / 10,
          ballCount: balls.length,
        });
      } else {
        inningsObj.push({
          teamId: firstInningsTeamId,
          totalRuns: localFirstInningsRuns ?? 0,
          totalWickets: 10, // Assuming all out or overs done for a local match
          overs: resolvedConfig.oversPerInnings,
          ballCount: resolvedConfig.oversPerInnings * 6,
        });
        inningsObj.push({
          teamId: secondBattingTeamId,
          totalRuns: stats.totalRuns,
          totalWickets: stats.totalWickets,
          overs: stats.currentOver + stats.currentBall / 10,
          ballCount: balls.length,
        });
      }

      const matchStatus = localCurrentInningsIndex === 1 && allOut ? 'finished' : 'live';

      const ref = await addDoc(collection(db, 'matches'), {
        ...resolvedConfig,
        status: matchStatus,
        currentInningsIndex: localCurrentInningsIndex,
        innings: inningsObj,
        quickMatch: true,
        currentStrikerId: strikerId,
        currentNonStrikerId: nonStrikerId,
        currentBowlerId: bowlerId,
      });

      if (localBalls.length > 0) {
        const batch = writeBatch(db);
        const ballsRef = collection(db, 'matches', ref.id, 'innings', String(localCurrentInningsIndex), 'balls');
        localBalls.forEach((ball, idx) => {
          const ballDoc = doc(ballsRef);
          batch.set(ballDoc, {
            ...ball,
            sequence: idx,
            timestamp: serverTimestamp(),
          });
        });
        await batch.commit();
      }

      setLiveMatchId(ref.id);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to go live');
    }
  }, [
    resolvedConfig,
    localCurrentInningsIndex,
    localFirstInningsRuns,
    stats,
    balls.length,
    allOut,
    strikerId,
    nonStrikerId,
    bowlerId,
    localBalls,
    setLiveMatchId,
  ]);

  const handlePickPlayer = useCallback(
    (playerId: string) => {
      let newStrikerId = strikerId;
      let newNonStrikerId = nonStrikerId;
      let newBowlerId = bowlerId;

      if (pickerMode === 'striker') {
        setStrikerId(playerId);
        newStrikerId = playerId;
        if (cascadeToBowlerRef.current) {
          cascadeToBowlerRef.current = false;
          setPickerMode('bowler');
          if (isLiveMode && liveMatchId) {
            const db = getFirebaseDb();
            updateDoc(doc(db, 'matches', liveMatchId), {
              currentStrikerId: playerId,
              currentNonStrikerId: newNonStrikerId,
              currentBowlerId: newBowlerId,
            }).catch(() => {});
          }
          return;
        }
      } else if (pickerMode === 'nonStriker') {
        setNonStrikerId(playerId);
        newNonStrikerId = playerId;
      } else if (pickerMode === 'bowler') {
        setBowlerId(playerId);
        newBowlerId = playerId;
      }
      setPickerMode(null);

      if (isLiveMode && liveMatchId) {
        const db = getFirebaseDb();
        updateDoc(doc(db, 'matches', liveMatchId), {
          currentStrikerId: newStrikerId,
          currentNonStrikerId: newNonStrikerId,
          currentBowlerId: newBowlerId,
        }).catch(() => {});
      }
    },
    [pickerMode, strikerId, nonStrikerId, bowlerId, isLiveMode, liveMatchId]
  );

  const handleSwapStrike = useCallback(() => {
    const s = strikerId;
    const ns = nonStrikerId;
    setStrikerId(ns);
    setNonStrikerId(s);
  }, [strikerId, nonStrikerId]);

  const handleEndInnings = useCallback(async () => {
    Alert.alert(
      'End Innings',
      'Are you sure you want to end this innings?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Innings',
          style: 'destructive',
          onPress: async () => {
            if (isLiveMode) {
              try {
                await endCurrentInnings();
                setShowOverCompleteModal(false);
                setBowlerId(null);
              } catch (e) {
                console.error('Failed to end current innings', e);
                Alert.alert('Error', 'Failed to end the innings on the server.');
              }
            } else {
              if (localCurrentInningsIndex === 0) {
                setLocalFirstInningsRuns(stats.totalRuns);
                setLocalCurrentInningsIndex(1);
                setLocalBalls([]);
                setShowOverCompleteModal(false);
                setBowlerId(null);
                setStrikerId(null);
                setNonStrikerId(null);
              } else {
                Alert.alert('Match Ended', 'The local match is over.');
                setShowOverCompleteModal(false);
                setBowlerId(null);
              }
            }
          }
        }
      ]
    );
  }, [isLiveMode, endCurrentInnings, localCurrentInningsIndex, stats.totalRuns]);

  const handleEndMatch = useCallback(async () => {
    Alert.alert(
      isLiveMode ? 'End Match' : 'Abandon Match',
      `Are you sure you want to ${isLiveMode ? 'end' : 'abandon'} this match? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isLiveMode ? 'End Match' : 'Abandon Match',
          style: 'destructive',
          onPress: async () => {
            setShowSettingsModal(false);
            isMatchEndedRef.current = true;
            if (isLiveMode && liveMatchId) {
              const db = getFirebaseDb();
              const matchRef = doc(db, 'matches', liveMatchId);
              try {
                await updateDoc(matchRef, { status: 'abandoned' });
              } catch (e) {
                console.error('Failed to end live match', e);
                Alert.alert('Error', 'Failed to end the match on the server.');
                isMatchEndedRef.current = false;
                return;
              }
            } else if (!isLiveMode && resolvedConfig) {
              await saveLocalMatch({
                id: localMatchIdRef.current,
                config: resolvedConfig,
                balls: localBalls,
                strikerId,
                nonStrikerId,
                bowlerId,
                status: 'abandoned',
                currentInningsIndex: localCurrentInningsIndex,
                firstInningsRuns: localFirstInningsRuns,
                createdAt: Date.now(),
                updatedAt: Date.now(),
              });
            }
            router.replace('/(tabs)');
          }
        }
      ]
    );
  }, [
    isLiveMode, liveMatchId, resolvedConfig, localBalls, strikerId, nonStrikerId, bowlerId, router,
    localCurrentInningsIndex, localFirstInningsRuns
  ]);

  return {
    localLoading,
    isLiveMode,
    canGoLive: !isLiveMode && resolvedConfig !== undefined,
    displayTeamName,
    currentOverFormatted,
    runRate,
    balls,
    stats,
    currentOverBalls,
    batsmenStatsMap,
    bowlerStatsMap,
    maxOvers,
    maxWickets,
    isInningsComplete,
    isMatchFinished,
    scoringDisabled,
    isChasing,
    firstInningsRuns,
    currentInningsIndex,
    allOut,
    inningsEndReason,
    inningsEndScore,
    playersReady,
    inputDisabled,
    canUndo,
    strikerId,
    nonStrikerId,
    bowlerId,
    pickerMode,
    pickerPlayers,
    pickerTitle,
    activeTab,
    showSettingsModal,
    expandedSection,
    setPickerMode,
    setActiveTab,
    setShowSettingsModal,
    setExpandedSection,
    getPlayerName,
    handleScore,
    handleExtra,
    handleWicket,
    handlePenalty,
    handleUndo,
    handleGoLive,
    handlePickPlayer,
    handleSwapStrike,
    handleEndInnings,
    handleEndMatch,
    handleStartNextOver,
    showOverCompleteModal,
    setShowOverCompleteModal,
    completedOverBalls,
    isOverCompleteWaiting,
  };
}
