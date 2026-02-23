import { useState, useCallback, useRef, useEffect } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { type ExtraType } from '@crichead/ui/mobile';
import {
  useScoringSession,
} from '@crichead/core/hooks';
import {
  EventSchema,
  EventScoring,
  migrateBallToEvent,
  type ExtraTypeCode,
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
  matchId,
  config,
  initialLocalMatchId,
}: UseScoringStateInput): ScoringState {
  const router = useRouter();

  // ---- Local state ----
  const [resolvedConfig, setResolvedConfig] = useState<QuickMatchConfig | undefined>(config);
  const [localLoading, setLocalLoading] = useState(!!initialLocalMatchId);

  // ---- Tab/UI state ----
  const [activeTab, setActiveTab] = useState<TabKey>('players');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>('Match Settings');
  const [showOverCompleteModal, setShowOverCompleteModal] = useState(false);
  const [isAwaitingNextOverConfirmation, setIsAwaitingNextOverConfirmation] = useState(false);

  const isLiveMode = false;

  // ---- Stable refs ----
  const localMatchIdRef = useRef<string>(initialLocalMatchId ?? generateLocalId());
  const isMatchEndedRef = useRef<boolean>(false);

  // ---- Core session (ScoringSession orchestration) ----
  const {
    balls,
    strikerId,
    nonStrikerId,
    bowlerId,
    pickerMode,
    currentInningsIndex,
    firstInningsRuns,
    engineState,
    handleScore: sessionHandleScore,
    handleExtra: sessionHandleExtra,
    handleWicket: sessionHandleWicket,
    handlePenalty: sessionHandlePenalty,
    undoBall: sessionUndoBall,
    pickPlayer: sessionPickPlayer,
    swapStrike: sessionSwapStrike,
    setPickerMode: sessionSetPickerMode,
    session,
  } = useScoringSession({
    matchId: matchId ?? localMatchIdRef.current,
    config: resolvedConfig ?? null,
    match: null,
    isLiveMode,
    localCurrentInningsIndex: 0,
    localFirstInningsRuns: null,
  });

  // ---- Load from AsyncStorage when resuming a local match ----
  useEffect(() => {
    if (!initialLocalMatchId) return;
    loadLocalMatch(initialLocalMatchId).then((record) => {
      if (record) {
        setResolvedConfig(record.config as QuickMatchConfig);
        const loadedBalls = (record.balls as any[]).map((b) =>
          b.deliveryType ? b : migrateBallToEvent(b, record.id, String(record.currentInningsIndex || 0))
        );

        session.setMatchId(record.id ?? localMatchIdRef.current);
        session.setCurrentInningsIndex(record.currentInningsIndex ?? 0);
        session.setFirstInningsRuns(record.firstInningsRuns ?? null);
        session.setBalls(loadedBalls);
        session.setPlayers(
          record.strikerId ?? null,
          record.nonStrikerId ?? null,
          record.bowlerId ?? null
        );
      }
      setLocalLoading(false);
    });
  }, [initialLocalMatchId, session]);

  const {
    stats,
    currentOverFormatted,
    runRate,
    maxOvers,
    maxWickets,
    matchStatus,
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

  const isOverCompleteWaiting = isAwaitingNextOverConfirmation && !showOverCompleteModal;

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

  // ---- Detect over completion for modal prompt ----
  const prevBallsLenRef = useRef(balls.length);
  const prevOverRef = useRef(stats.currentOver);

  useEffect(() => {
    const prevLen = prevBallsLenRef.current;

    if (balls.length <= prevLen) {
      prevBallsLenRef.current = balls.length;
      prevOverRef.current = stats.currentOver;
      return;
    }

    const prevOver = prevOverRef.current;

    prevBallsLenRef.current = balls.length;
    prevOverRef.current = stats.currentOver;

    const overChanged = stats.currentOver > prevOver;

    if (overChanged) {
      // Modal-first flow: pause picker prompts until user confirms next over.
      if (pickerMode !== null) {
        sessionSetPickerMode(null);
      }
      setIsAwaitingNextOverConfirmation(true);
      setShowOverCompleteModal(true);
      return;
    }

    if (stats.currentBall > 0) {
      setIsAwaitingNextOverConfirmation(false);
    }
  }, [balls.length, pickerMode, sessionSetPickerMode, stats.currentOver, stats.currentBall]);

  const handleStartNextOver = useCallback(() => {
    sessionSetPickerMode(null);

    setIsAwaitingNextOverConfirmation(false);
    setShowOverCompleteModal(false);
  }, [sessionSetPickerMode]);

  // ---- Auto-show OverCompleteModal when match finishes ----
  const prevMatchFinishedRef = useRef(false);
  useEffect(() => {
    if (isMatchFinished && !prevMatchFinishedRef.current) {
      setShowOverCompleteModal(true);
    }
    prevMatchFinishedRef.current = isMatchFinished;
  }, [isMatchFinished]);

  // Clear stale over-wait lock once next-over players are fully selected
  useEffect(() => {
    if (
      isAwaitingNextOverConfirmation &&
      !showOverCompleteModal &&
      strikerId !== null &&
      nonStrikerId !== null &&
      bowlerId !== null
    ) {
      setIsAwaitingNextOverConfirmation(false);
    }
  }, [
    isAwaitingNextOverConfirmation,
    showOverCompleteModal,
    strikerId,
    nonStrikerId,
    bowlerId,
  ]);

  // ---- Persist local match state to AsyncStorage ----
  useEffect(() => {
    if (isLiveMode || !resolvedConfig || isMatchEndedRef.current) return;
    saveLocalMatch({
      id: localMatchIdRef.current,
      config: resolvedConfig,
      balls,
      strikerId,
      nonStrikerId,
      bowlerId,
      status: balls.length > 0 || currentInningsIndex > 0 ? 'live' : 'upcoming',
      currentInningsIndex,
      firstInningsRuns,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }, [
    isLiveMode,
    resolvedConfig,
    balls,
    strikerId,
    nonStrikerId,
    bowlerId,
    currentInningsIndex,
    firstInningsRuns,
  ]);

  // ---- Handlers ----

  const handleScore = useCallback(
    (runs: number) => {
      sessionHandleScore(runs);
    },
    [sessionHandleScore]
  );

  const handleExtra = useCallback(
    (type: ExtraType) => {
      const extraMap: Record<string, ExtraTypeCode> = {
        WD: 'WD', NB: 'NB', B: 'B', LB: 'LB',
        wd: 'WD', nb: 'NB', b: 'B', lb: 'LB',
      };

      const mappedType = extraMap[type as string];
      if (!mappedType) return;
      sessionHandleExtra(mappedType);
    },
    [sessionHandleExtra]
  );

  const handleWicket = useCallback(() => {
    sessionHandleWicket();
  }, [sessionHandleWicket]);

  const handlePenalty = useCallback(() => {
    Alert.alert(
      'Penalty Runs',
      'Add 5 penalty runs?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add 5 Runs',
          onPress: () => {
            sessionHandlePenalty(5);
          },
        },
      ]
    );
  }, [sessionHandlePenalty]);

  const handleUndo = useCallback(async () => {
    sessionUndoBall();
  }, [sessionUndoBall]);


  const handlePickPlayer = useCallback(
    (playerId: string) => {
      sessionPickPlayer(playerId);
    },
    [sessionPickPlayer]
  );

  const handleSwapStrike = useCallback(() => {
    sessionSwapStrike();
  }, [sessionSwapStrike]);

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
            if (currentInningsIndex === 0) {
              session.startNextInnings(stats.totalRuns);
              setIsAwaitingNextOverConfirmation(false);
              setShowOverCompleteModal(false);
            } else {
              Alert.alert('Match Ended', 'The local match is over.');
              setIsAwaitingNextOverConfirmation(false);
              setShowOverCompleteModal(false);
              session.setPlayers(strikerId, nonStrikerId, null);
            }
          }
        }
      ]
    );
  }, [currentInningsIndex, nonStrikerId, session, stats.totalRuns, strikerId]);

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
                balls,
                strikerId,
                nonStrikerId,
                bowlerId,
                status: 'abandoned',
                currentInningsIndex,
                firstInningsRuns,
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
    resolvedConfig, balls, strikerId, nonStrikerId, bowlerId, router,
    currentInningsIndex, firstInningsRuns
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
    setPickerMode: sessionSetPickerMode,
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
