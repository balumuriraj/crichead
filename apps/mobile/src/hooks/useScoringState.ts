import { useState, useCallback, useRef, useMemo } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { type ExtraType } from '@crichead/ui/mobile';
import {
  useScoringSession,
} from '@crichead/core/hooks';
import {
  EventSchema,
  EventScoring,
  type MatchRepository,
  type ExtraTypeCode,
} from '@crichead/core';
import type { QuickMatchConfig } from '../types/QuickMatchConfig';
import {
  generateLocalId,
  loadLocalMatch,
  normalizeLocalMatchId,
  saveLocalMatch,
} from '../utils/localMatchStore';
import type { TabKey } from '../types/scoring';
import type {
  ScorecardInnings,
  ScorecardBatterRow,
  ScorecardFallOfWicket,
} from '../types/scorecard';
import type { PickerMode, PlayerInfo } from '@crichead/core';
import { createLocalMatchRepository } from '../repositories/localMatchRepository';
import { useScoringUiState } from './scoring/useScoringUiState';
import { useOverCompletionFlow } from './scoring/useOverCompletionFlow';
import { useLocalMatchPersistence } from './scoring/useLocalMatchPersistence';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UseScoringStateInput {
  matchId: string | null;
  config?: QuickMatchConfig;
  initialLocalMatchId?: string;
}

function formatOvers(over: number, ball: number): string {
  return `${over}.${ball}`;
}

function deriveBattingOrder(config?: QuickMatchConfig): { firstBattingTeamId: string | null; secondBattingTeamId: string | null } {
  if (!config) {
    return { firstBattingTeamId: null, secondBattingTeamId: null };
  }

  const toss = config.toss;
  if (toss?.winner && toss?.decision) {
    const firstBattingTeamId =
      toss.decision === 'bat'
        ? toss.winner
        : toss.winner === config.teamA
          ? config.teamB
          : config.teamA;

    return {
      firstBattingTeamId,
      secondBattingTeamId: firstBattingTeamId === config.teamA ? config.teamB : config.teamA,
    };
  }

  return {
    firstBattingTeamId: config.teamA,
    secondBattingTeamId: config.teamB,
  };
}

function getTeamName(teamId: string | null, config?: QuickMatchConfig): string {
  if (!teamId || !config) return 'Team';
  return teamId === config.teamA ? config.teamAName : config.teamBName;
}

function formatDismissal(ball: EventSchema.BallEvent): string {
  if (!ball.wicket) {
    return '';
  }

  const wicketType = ball.wicket.type;
  if (wicketType === 'run out') {
    return 'run out';
  }
  return wicketType;
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
  scorecardInnings: ScorecardInnings[];
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

  // ---- Tab/UI state ----
  const {
    activeTab,
    setActiveTab,
    showSettingsModal,
    setShowSettingsModal,
    expandedSection,
    setExpandedSection,
  } = useScoringUiState();

  const isLiveMode = false;
  const canonicalMatchId = matchId
    ? normalizeLocalMatchId(matchId)
    : initialLocalMatchId ?? generateLocalId();

  // ---- Stable refs ----
  const localMatchIdRef = useRef<string>(canonicalMatchId);
  const isMatchEndedRef = useRef<boolean>(false);
  const resolvedConfigRef = useRef<QuickMatchConfig | undefined>(resolvedConfig);
  resolvedConfigRef.current = resolvedConfig;
  const repositoryRef = useRef<MatchRepository>(
    createLocalMatchRepository({
      matchId: localMatchIdRef.current,
      getConfig: () => resolvedConfigRef.current,
    })
  );

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
    matchId: localMatchIdRef.current,
    config: resolvedConfig ?? null,
    repository: repositoryRef.current,
    match: null,
    isLiveMode,
    localCurrentInningsIndex: 0,
    localFirstInningsRuns: null,
  });

  const { localLoading } = useLocalMatchPersistence({
    initialLocalMatchId,
    localMatchId: localMatchIdRef.current,
    session,
    setResolvedConfig,
    isMatchEndedRef,
  });

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

  const scorecardInnings = useMemo<ScorecardInnings[]>(() => {
    if (balls.length === 0) {
      return [];
    }

    const { firstBattingTeamId, secondBattingTeamId } = deriveBattingOrder(resolvedConfig);
    const inningsTeamMap: Record<number, string | null> = {
      0: firstBattingTeamId,
      1: secondBattingTeamId,
    };

    const inningsIndices = Array.from(
      new Set(
        balls
          .map((ball) => Number.parseInt(ball.inningsId, 10))
          .filter((index) => Number.isFinite(index))
      )
    ).sort((a, b) => a - b);

    return inningsIndices.map((inningsIndex) => {
      const inningsId = String(inningsIndex);
      const inningsBalls = balls.filter((ball) => ball.inningsId === inningsId);
      const inningsState = EventScoring.getMatchStatus(inningsBalls, {
        oversPerInnings: maxOvers,
        wicketsPerInnings: maxWickets,
      });

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

      let runsAtWicket = 0;
      let wicketsFallen = 0;
      let legalBallsAtWicket = 0;
      for (const ball of inningsBalls) {
        const isLegalDelivery = ball.deliveryType !== 'wide' && ball.deliveryType !== 'no-ball';
        if (isLegalDelivery) {
          legalBallsAtWicket += 1;
        }
        runsAtWicket += ball.runs.bat + ball.runs.extra + (ball.runs.penalty || 0);
        if (ball.wicket) {
          wicketsFallen += 1;
          dismissalByPlayer.set(ball.wicket.dismissedId, formatDismissal(ball));
          fallOfWickets.push({
            wicketNumber: wicketsFallen,
            score: `${runsAtWicket}/${wicketsFallen}`,
            playerName: getPlayerName(ball.wicket.dismissedId),
            over: formatOvers(
              Math.floor(legalBallsAtWicket / 6),
              legalBallsAtWicket % 6,
            ),
          });
        }
      }

      const battingRows: ScorecardBatterRow[] = Array.from(playerFirstSeen.entries())
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

      const bowlingRows = Object.entries(inningsState.bowlerStats)
        .map(([playerId, bowlerStats]) => {
          const validBalls = bowlerStats.validBalls ?? 0;
          const overs = formatOvers(
            Math.floor(validBalls / 6),
            validBalls % 6,
          );
          const economy = bowlerStats.validBalls > 0
            ? ((bowlerStats.runs / bowlerStats.validBalls) * 6).toFixed(1)
            : '0.0';
          return {
            validBalls,
            playerId,
            playerName: getPlayerName(playerId),
            overs,
            maidens: bowlerStats.maidens,
            runs: bowlerStats.runs,
            wickets: bowlerStats.wickets,
            economy,
          };
        })
        .sort((left, right) => right.validBalls - left.validBalls)
        .map(({ validBalls: _validBalls, ...row }) => row);

      const teamId = inningsTeamMap[inningsIndex] ?? null;

      return {
        inningsIndex,
        teamId: teamId ?? `innings-${inningsIndex}`,
        teamName: getTeamName(teamId, resolvedConfig),
        score: `${inningsState.totalRuns}/${inningsState.totalWickets}`,
        overs: formatOvers(inningsState.currentOver, inningsState.currentBall),
        batting: battingRows,
        bowling: bowlingRows,
        extras: inningsState.extras,
        fallOfWickets,
      };
    });
  }, [balls, getPlayerName, maxOvers, maxWickets, resolvedConfig]);

  const {
    showOverCompleteModal,
    setShowOverCompleteModal,
    isOverCompleteWaiting,
    handleStartNextOver,
    resetOverCompletionFlow,
  } = useOverCompletionFlow({
    ballsLength: balls.length,
    currentOver: stats.currentOver,
    currentBall: stats.currentBall,
    isMatchFinished,
    pickerMode,
    sessionSetPickerMode,
    strikerId,
    nonStrikerId,
    bowlerId,
  });

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
              resetOverCompletionFlow();
            } else {
              Alert.alert('Match Ended', 'The local match is over.');
              resetOverCompletionFlow();
              session.setPlayers(strikerId, nonStrikerId, null);
            }
          }
        }
      ]
    );
  }, [currentInningsIndex, nonStrikerId, resetOverCompletionFlow, session, stats.totalRuns, strikerId]);

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
              const persistedRecord = await loadLocalMatch(localMatchIdRef.current);
              const persistedBalls = (persistedRecord?.balls ?? []) as EventSchema.BallEvent[];
              const currentInningsId = String(currentInningsIndex);

              const historicalBalls = persistedBalls.filter((ball) => {
                if (!ball || typeof ball !== 'object' || !('deliveryType' in ball)) {
                  return true;
                }

                return (ball as EventSchema.BallEvent).inningsId !== currentInningsId;
              });

              const mergedBalls = [...historicalBalls, ...balls];

              await saveLocalMatch({
                id: localMatchIdRef.current,
                config: resolvedConfig,
                balls: mergedBalls,
                strikerId,
                nonStrikerId,
                bowlerId,
                status: isMatchFinished ? 'finished' : 'abandoned',
                currentInningsIndex,
                firstInningsRuns,
                createdAt: persistedRecord?.createdAt ?? Date.now(),
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
    currentInningsIndex, firstInningsRuns, isMatchFinished
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
    scorecardInnings,
  };
}
