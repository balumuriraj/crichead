import { useMemo, useCallback } from 'react';
import type { BallEvent } from '../../domain/schema/ballEvent';
import { getMatchStatus } from '../../domain/scoring/derivedState';
import { formatOvers, calculateRunRate } from '../../shared/utils';

// Using `any` for match/config temporarily since those types are scattered
export interface UseScoringEngineProps {
  balls: BallEvent[];
  config: any; // e.g. QuickMatchConfig
  match?: any; // e.g. FirestoreMatchDoc
  
  isLiveMode: boolean;
  localCurrentInningsIndex: number;
  localFirstInningsRuns: number | null;
  
  strikerId: string | null;
  nonStrikerId: string | null;
  bowlerId: string | null;
}

export function useScoringEngine({
  balls,
  config,
  match,
  isLiveMode,
  localCurrentInningsIndex,
  localFirstInningsRuns,
  strikerId,
  nonStrikerId,
  bowlerId,
}: UseScoringEngineProps) {
  
  const dummyConfig = useMemo(() => ({ v: 1, format: 't20', oversPerInnings: 20, wicketsPerInnings: 10, venue: '', scheduledDate: '', playersPerSide: 11 } as any), []);
  const stats = useMemo(() => getMatchStatus(balls, config || dummyConfig), [balls, config, dummyConfig]);

  const currentOverFormatted = formatOvers(stats.currentOver, stats.currentBall);
  const runRate = calculateRunRate(stats.totalRuns, stats.currentOver, stats.currentBall);

  const maxOvers = match?.oversPerInnings ?? config?.oversPerInnings ?? 0;
  const wicketsPerInnings = match?.wicketsPerInnings ?? config?.wicketsPerInnings ?? 10;
  const maxWickets = Math.min(wicketsPerInnings, (match?.playersPerSide ?? config?.playersPerSide ?? 11) - 1);
  const matchStatus = match?.status ?? 'live';
  const currentInningsIndex = isLiveMode ? (match?.currentInningsIndex ?? 0) : localCurrentInningsIndex;

  const firstInningsRuns = isLiveMode
    ? (match && match.innings?.length > 1 ? match.innings[0].totalRuns : null)
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

  const playersReady = strikerId !== null && nonStrikerId !== null && bowlerId !== null;

  // ---- Batting/bowling team IDs ----
  const battingTeamId: string | null = isLiveMode
    ? (match?.innings?.[currentInningsIndex]?.teamId ?? null)
    : config
      ? (localCurrentInningsIndex === 0
          ? (config.toss?.decision === 'bat'
              ? config.toss.winner
              : config.toss.winner === config.teamA
                ? config.teamB
                : config.teamA)
          : (config.toss?.decision === 'bat'
              ? (config.toss.winner === config.teamA ? config.teamB : config.teamA)
              : config.toss.winner)
        )
      : null;

  const bowlingTeamId: string | null =
    battingTeamId && config
      ? (battingTeamId === config.teamA ? config.teamB : config.teamA)
      : isLiveMode && battingTeamId && match
        ? (match.teamA === battingTeamId ? match.teamB : match.teamA)
        : null;

  const battingTeamPlayers = useMemo(() => {
    if (!battingTeamId) return [];
    const xi = isLiveMode ? match?.playingXI : config?.playingXI;
    if (!xi) return [];
    return (xi[battingTeamId] ?? []).map((p: any) => ({ id: p.id, name: p.name, role: p.role }));
  }, [isLiveMode, match, config, battingTeamId]);

  const bowlingTeamPlayers = useMemo(() => {
    if (!bowlingTeamId) return [];
    const xi = isLiveMode ? match?.playingXI : config?.playingXI;
    if (!xi) return [];
    return (xi[bowlingTeamId] ?? []).map((p: any) => ({ id: p.id, name: p.name, role: p.role }));
  }, [isLiveMode, match, config, bowlingTeamId]);

  const allPlayers = useMemo(() => {
    return [...battingTeamPlayers, ...bowlingTeamPlayers].filter(
      (p, i, arr) => arr.findIndex((x) => x.id === p.id) === i,
    );
  }, [battingTeamPlayers, bowlingTeamPlayers]);

  const dismissedIds = useMemo(() => {
    const dismissed = new Set<string>();
    for (const b of balls) {
      if (b.wicket) dismissed.add(b.wicket.dismissedId || b.strikerId);
    }
    return dismissed;
  }, [balls]);

  const availableBatsmen = useMemo(() => {
    return battingTeamPlayers.filter((p: any) =>
      !dismissedIds.has(p.id) &&
      p.id !== strikerId &&
      p.id !== nonStrikerId
    );
  }, [battingTeamPlayers, dismissedIds, strikerId, nonStrikerId]);

  const availableBowlers = useMemo(() => {
    // If an over just completed, exclude the bowler who bowled it
    if (stats.currentOver > 0 && stats.currentBall === 0 && balls.length > 0) {
      const lastBowlerId = balls[balls.length - 1]!.bowlerId;
      return bowlingTeamPlayers.filter((p: any) => p.id !== lastBowlerId);
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
    const lastBallBowlerId = balls.length > 0 ? balls[balls.length - 1]!.bowlerId : null;
    const isWaitingForNewBowler = 
      stats.currentOver > 0 && 
      stats.currentBall === 0 && 
      (bowlerId === null || bowlerId === lastBallBowlerId);
      
    const ballsToFetch = isWaitingForNewBowler ? 6 : stats.currentBall;

    let validSeen = 0;
    let overStartIdx = balls.length;
    for (let i = balls.length - 1; i >= 0; i--) {
      const b = balls[i];
      const isExtra = b?.deliveryType === 'wide' || b?.deliveryType === 'no-ball';
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
    if (stats.currentOver === 0 || stats.currentBall > 0) return [];
    
    let validSeen = 0;
    const overBalls: BallEvent[] = [];
    for (let i = balls.length - 1; i >= 0; i--) {
      const b = balls[i] as BallEvent;
      overBalls.unshift(b);
      const isExtra = b?.deliveryType === 'wide' || b?.deliveryType === 'no-ball';
      if (!isExtra) validSeen++;
      if (validSeen === 6) break;
    }
    return overBalls;
  }, [balls, stats]);

  // ---- Innings end banner strings (precomputed) ----
  const inningsEndReason = useMemo(() => {
    if (isMatchFinished && currentInningsIndex === 1 && firstInningsRuns !== null) {
      const getTeamName = (teamId: string | undefined) => {
        if (!teamId) return 'Team';
        if (isLiveMode && match) {
           return teamId === match.teamA ? (match.teamAName ?? match.teamA) : (match.teamBName ?? match.teamB);
        }
        if (config) {
           return teamId === config.teamA ? config.teamAName : config.teamBName;
        }
        return 'Team';
      };

      const innings2TeamId = isLiveMode ? (match?.innings || [])[1]?.teamId : battingTeamId;
      const innings1TeamId = isLiveMode ? (match?.innings || [])[0]?.teamId : bowlingTeamId;
      
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
    maxWickets, maxOvers, allOut, isLiveMode, match, config, battingTeamId, bowlingTeamId
  ]);

  const inningsEndScore = `${stats.totalRuns}/${stats.totalWickets} (${currentOverFormatted} ov)`;

  const displayTeamName = isLiveMode
    ? (battingTeamId === match?.teamA
        ? (match?.teamAName ?? match?.teamA)
        : (match?.teamBName ?? match?.teamB)) ?? 'Team'
    : config
      ? (battingTeamId === config.teamA
          ? config.teamAName
          : config.teamBName)
      : 'Team';
      
  const canUndo = balls.length > 0;
  
  // Return engine computed state
  return {
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
  };
}
