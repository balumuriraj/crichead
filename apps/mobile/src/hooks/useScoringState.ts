import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { type ExtraType } from '@crichead/ui/mobile';
import {
  useMatchSync,
  getFirebaseDb,
  EventSchema,
  EventScoring,
  migrateBallToEvent,
  useScoringEngine,
  createScoreEvent,
  createExtraEvent,
  createWicketEvent,
  createPenaltyEvent,
  updateMatchState,
  goLiveMatch,
} from '@crichead/core';
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
  balls: EventSchema.BallEvent[];
  stats: EventScoring.DerivedMatchState;
  currentOverBalls: EventSchema.BallEvent[];
  batsmenStatsMap: Record<string, EventScoring.BatterStats>;
  bowlerStatsMap: Record<string, EventScoring.BowlerStats>;
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
  completedOverBalls: EventSchema.BallEvent[];
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
  const [localBalls, setLocalBalls] = useState<EventSchema.BallEvent[]>([]);
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
        setResolvedConfig(record.config as QuickMatchConfig);
        setLocalBalls((record.balls as any[]).map(b => 
          b.deliveryType ? b : migrateBallToEvent(b, record.id, String(record.currentInningsIndex || 0))
        ));
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

  // ---- Derived state via core engine ----
  const balls = localBalls;

  const engineState = useScoringEngine({
    balls,
    config: resolvedConfig,
    match,
    isLiveMode,
    localCurrentInningsIndex,
    localFirstInningsRuns,
    strikerId,
    nonStrikerId,
    bowlerId,
  });

  const {
    stats,
    currentOverFormatted,
    runRate,
    maxOvers,
    maxWickets,
    matchStatus,
    currentInningsIndex,
    firstInningsRuns,
    isChasing,
    allOversCompleted,
    allOut,
    targetReached,
    isMatchFinished,
    isInningsComplete,
    playersReady,
    battingTeamId,
    bowlingTeamId,
    battingTeamPlayers,
    bowlingTeamPlayers,
    allPlayers,
    availableBatsmen,
    availableBowlers,
    getPlayerName,
    currentOverBalls,
    completedOverBalls,
    inningsEndReason,
    inningsEndScore,
    displayTeamName,
    canUndo,
  } = engineState;

  const batsmenStatsMap = stats.batterStats;
  const bowlerStatsMap = stats.bowlerStats;

  // We consider an over "just completed" if stats.currentBall === 0 and bowlerId === (the bowler of the last ball)
  const lastBallBowlerIdForInput = balls.length > 0 ? balls[balls.length - 1]!.bowlerId : null;
  const isOverCompleteWaiting = stats.currentOver > 0 && stats.currentBall === 0 && (bowlerId === null || bowlerId === lastBallBowlerIdForInput);

  // If we are waiting for an over completion action (modal is up, or user selected "Edit This Over"),
  // do not lock the UI into the "Innings Complete" pad yet so they can undo or review.
  const scoringDisabled = isInningsComplete && !showOverCompleteModal && !isOverCompleteWaiting;

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

  // ---- Reset players when innings completes (but NOT when match finishes) ----
  useEffect(() => {
    if (scoringDisabled && !prevInningsCompleteRef.current && !isMatchFinished) {
      setStrikerId(null);
      setNonStrikerId(null);
      setBowlerId(null);
      setPickerMode(null);
    }
    prevInningsCompleteRef.current = scoringDisabled;
  }, [scoringDisabled, isMatchFinished]);

  // ---- Auto-show OverCompleteModal when match finishes ----
  const prevMatchFinishedRef = useRef(false);
  useEffect(() => {
    if (isMatchFinished && !prevMatchFinishedRef.current) {
      setTimeout(() => setShowOverCompleteModal(true), 300);
    }
    prevMatchFinishedRef.current = isMatchFinished;
  }, [isMatchFinished]);

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
    async (ball: EventSchema.BallEvent) => {
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
      
      const newBall = createScoreEvent({
        matchId: liveMatchId || localMatchIdRef.current,
        inningsId: String(currentInningsIndex),
        bowlerId,
        strikerId,
        nonStrikerId: nonStrikerId || 'unknown',
      }, runs);
      
      addBall(newBall);
      if (runs % 2 === 1) {
        const prev = strikerId;
        setStrikerId(nonStrikerId);
        setNonStrikerId(prev);
      }
    },
    [addBall, strikerId, nonStrikerId, bowlerId, liveMatchId, currentInningsIndex]
  );

  const handleExtra = useCallback(
    (type: ExtraType) => {
      if (!strikerId || !bowlerId) return;
      
      const extraMap: Record<ExtraType, 'WD' | 'NB' | 'B' | 'LB'> = { WD: 'WD', NB: 'NB', B: 'B', LB: 'LB' };
      const newBall = createExtraEvent({
        matchId: liveMatchId || localMatchIdRef.current,
        inningsId: String(currentInningsIndex),
        bowlerId,
        strikerId,
        nonStrikerId: nonStrikerId || 'unknown',
      }, extraMap[type]);
      
      addBall(newBall);
    },
    [addBall, strikerId, bowlerId, nonStrikerId, liveMatchId, currentInningsIndex]
  );

  const handleWicket = useCallback(() => {
    if (!strikerId || !bowlerId) return;
    
    const newBall = createWicketEvent({
      matchId: liveMatchId || localMatchIdRef.current,
      inningsId: String(currentInningsIndex),
      bowlerId,
      strikerId,
      nonStrikerId: nonStrikerId || 'unknown',
    }, strikerId);
    
    addBall(newBall);
  }, [addBall, strikerId, bowlerId, nonStrikerId, liveMatchId, currentInningsIndex]);

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
            const newBall = createPenaltyEvent({
              matchId: liveMatchId || localMatchIdRef.current,
              inningsId: String(currentInningsIndex),
              bowlerId,
              strikerId,
              nonStrikerId: nonStrikerId || 'unknown',
            }, 5);
            addBall(newBall);
          },
        },
      ]
    );
  }, [addBall, strikerId, bowlerId, nonStrikerId, liveMatchId, currentInningsIndex]);

  const handleUndo = useCallback(async () => {
    if (localBalls.length === 0) return;
    
    const ballToUndo = localBalls[localBalls.length - 1];
    setLocalBalls((prev) => prev.slice(0, -1));

    // Restore the striker and non-striker to who they were at the start of the undone ball
    setStrikerId(ballToUndo.strikerId);
    setNonStrikerId(ballToUndo.nonStrikerId);
    
    if (isLiveMode) {
      try {
        await undoLastBallFromMatch();
        if (liveMatchId) {
          updateMatchState(liveMatchId, {
            currentStrikerId: ballToUndo.strikerId,
            currentNonStrikerId: ballToUndo.nonStrikerId,
          }).catch(() => {});
        }
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

      const newLiveMatchId = await goLiveMatch(
        resolvedConfig,
        inningsObj,
        matchStatus,
        strikerId,
        nonStrikerId,
        bowlerId,
        localCurrentInningsIndex,
        localBalls
      );

      setLiveMatchId(newLiveMatchId);
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
            updateMatchState(liveMatchId, {
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
        updateMatchState(liveMatchId, {
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
              try {
                await updateMatchState(liveMatchId, { status: 'abandoned' });
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
