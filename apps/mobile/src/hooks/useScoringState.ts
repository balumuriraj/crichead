import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { type ExtraType } from '@crichead/ui/mobile';
import {
  useScoringEngine,
} from '@crichead/core/hooks';
import {
  EventSchema,
  EventScoring,
  migrateBallToEvent,
  createScoreEvent,
  createExtraEvent,
  createWicketEvent,
  createPenaltyEvent,
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

interface UseScoringStateInput {
  matchId: string | null;
  config?: QuickMatchConfig;
  initialLocalMatchId?: string;
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

  const isLiveMode = false;

  // ---- Stable refs ----
  const localMatchIdRef = useRef<string>(initialLocalMatchId ?? generateLocalId());
  const isMatchEndedRef = useRef<boolean>(false);

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
    config: resolvedConfig ?? null,
    match: null,
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
    },
    []
  );

  const handleScore = useCallback(
    (runs: number) => {
      if (!strikerId || !bowlerId) return;
      
      const newBall = createScoreEvent({
        matchId: localMatchIdRef.current,
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
    [addBall, strikerId, nonStrikerId, bowlerId, currentInningsIndex]
  );

  const handleExtra = useCallback(
    (type: ExtraType) => {
      if (!strikerId || !bowlerId) return;
      const extraMap: Record<string, 'wd' | 'nb' | 'b' | 'lb'> = {
        WD: 'wd', NB: 'nb', B: 'b', LB: 'lb',
        wd: 'wd', nb: 'nb', b: 'b', lb: 'lb'
      };
      
      const mappedType = extraMap[type as string];

      const newBall = createExtraEvent({
        matchId: localMatchIdRef.current,
        inningsId: String(currentInningsIndex),
        bowlerId,
        strikerId,
        nonStrikerId: nonStrikerId || 'unknown',
      }, type as any);
      
      addBall(newBall);
    },
    [addBall, strikerId, bowlerId, nonStrikerId, currentInningsIndex]
  );

  const handleWicket = useCallback(() => {
    if (!strikerId || !bowlerId) return;
    
    const newBall = createWicketEvent({
      matchId: localMatchIdRef.current,
      inningsId: String(currentInningsIndex),
      bowlerId,
      strikerId,
      nonStrikerId: nonStrikerId || 'unknown',
    }, strikerId);
    
    addBall(newBall);
  }, [addBall, strikerId, bowlerId, nonStrikerId, currentInningsIndex]);

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
              matchId: localMatchIdRef.current,
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
  }, [addBall, strikerId, bowlerId, nonStrikerId, currentInningsIndex]);

  const handleUndo = useCallback(async () => {
    if (localBalls.length === 0) return;
    
    const ballToUndo = localBalls[localBalls.length - 1];
    setLocalBalls((prev) => prev.slice(0, -1));

    // Restore the striker and non-striker to who they were at the start of the undone ball
    setStrikerId(ballToUndo.strikerId);
    setNonStrikerId(ballToUndo.nonStrikerId);
  }, [localBalls]);


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
    },
    [pickerMode, strikerId, nonStrikerId, bowlerId]
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
      ]
    );
  }, [localCurrentInningsIndex, stats.totalRuns]);

  const handleEndMatch = useCallback(async () => {
    Alert.alert(
      'End Match',
      `Are you sure you want to end this match? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Match',
          style: 'destructive',
          onPress: async () => {
            setShowSettingsModal(false);
            isMatchEndedRef.current = true;
            if (resolvedConfig) {
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
    resolvedConfig, localBalls, strikerId, nonStrikerId, bowlerId, router,
    localCurrentInningsIndex, localFirstInningsRuns
  ]);

  return {
    localLoading,
    isLiveMode,
    canGoLive: false,
    displayTeamName: displayTeamName ?? 'Unknown',
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
