/**
 * useScoringSession — React hook that wraps ScoringSession for React consumption.
 *
 * This is the primary hook that both mobile and web apps use.
 * It combines ScoringSession (orchestration) with useScoringEngine (derived stats).
 */

import { useRef, useSyncExternalStore, useCallback } from 'react';
import type { BallEvent, WicketTypeEvent } from '../../domain/schema/ballEvent';
import type { ExtraTypeCode, PickerMode } from '../../application/types';
import type { ScoringConfig } from '../../domain/types/ScoringConfig';
import type { FirestoreMatchDoc } from '../../domain/types/Firestore';
import { ScoringSession, type ScoringSessionConfig } from '../../application/ScoringSession';
import { useScoringEngine } from './useScoringEngine';

// ---- Hook Props ----

export interface UseScoringSessionProps {
  matchId: string;
  config: ScoringConfig | null;
  match?: FirestoreMatchDoc | null;
  isLiveMode: boolean;
  localCurrentInningsIndex: number;
  localFirstInningsRuns: number | null;

  /** Initial balls to seed the session */
  initialBalls?: BallEvent[];
  initialStrikerId?: string | null;
  initialNonStrikerId?: string | null;
  initialBowlerId?: string | null;
}

// ---- Hook Return ----

export interface UseScoringSessionReturn {
  /** Current ball events */
  balls: BallEvent[];

  /** Active player IDs */
  strikerId: string | null;
  nonStrikerId: string | null;
  bowlerId: string | null;

  /** Which player picker to show */
  pickerMode: PickerMode;

  /** Innings state */
  currentInningsIndex: number;
  firstInningsRuns: number | null;

  /** Derived match stats from the scoring engine */
  engineState: ReturnType<typeof useScoringEngine>;

  // ---- Actions ----
  handleScore: (runs: number) => BallEvent | null;
  handleExtra: (type: ExtraTypeCode) => BallEvent | null;
  handleWicket: (dismissedId?: string, wicketType?: WicketTypeEvent, fielderId?: string) => BallEvent | null;
  handlePenalty: (runs?: number) => BallEvent | null;
  undoBall: () => BallEvent | null;
  pickPlayer: (playerId: string) => void;
  swapStrike: () => void;
  setPickerMode: (mode: PickerMode) => void;

  /** Direct access to the session for advanced operations */
  session: ScoringSession;
}

// ---- Hook Implementation ----

export function useScoringSession(props: UseScoringSessionProps): UseScoringSessionReturn {
  const {
    matchId,
    config,
    match,
    isLiveMode,
    localCurrentInningsIndex,
    localFirstInningsRuns,
    initialBalls,
    initialStrikerId,
    initialNonStrikerId,
    initialBowlerId,
  } = props;

  // Create the session once and hold it for the lifetime of the component
  const sessionRef = useRef<ScoringSession | null>(null);
  if (!sessionRef.current) {
    const sessionConfig: ScoringSessionConfig = {
      matchId,
      currentInningsIndex: localCurrentInningsIndex,
      engineConfig: config ?? { oversPerInnings: 20 },
      initialBalls,
      initialStrikerId,
      initialNonStrikerId,
      initialBowlerId,
      firstInningsRuns: localFirstInningsRuns,
    };
    sessionRef.current = new ScoringSession(sessionConfig);
  }
  const session = sessionRef.current;

  // Subscribe to session state changes via useSyncExternalStore
  const snapshot = useSyncExternalStore(
    session.subscribe,
    () => session.getSnapshot(),
    () => session.getSnapshot()
  );

  // Use the scoring engine for derived stats (formatting, player lists, etc.)
  const engineState = useScoringEngine({
    balls: snapshot.balls,
    config,
    match,
    isLiveMode,
    localCurrentInningsIndex: snapshot.currentInningsIndex,
    localFirstInningsRuns: snapshot.firstInningsRuns,
    strikerId: snapshot.strikerId,
    nonStrikerId: snapshot.nonStrikerId,
    bowlerId: snapshot.bowlerId,
  });

  // ---- Memoized action wrappers ----

  const handleScore = useCallback(
    (runs: number) => session.handleScore(runs),
    [session]
  );

  const handleExtra = useCallback(
    (type: ExtraTypeCode) => session.handleExtra(type),
    [session]
  );

  const handleWicket = useCallback(
    (dismissedId?: string, wicketType?: WicketTypeEvent, fielderId?: string) =>
      session.handleWicket(dismissedId, wicketType, fielderId),
    [session]
  );

  const handlePenalty = useCallback(
    (runs?: number) => session.handlePenalty(runs),
    [session]
  );

  const undoBall = useCallback(
    () => session.undoBall(),
    [session]
  );

  const pickPlayer = useCallback(
    (playerId: string) => session.pickPlayer(playerId),
    [session]
  );

  const swapStrike = useCallback(
    () => session.swapStrike(),
    [session]
  );

  const setPickerMode = useCallback(
    (mode: PickerMode) => session.setPickerMode(mode),
    [session]
  );

  return {
    balls: snapshot.balls,
    strikerId: snapshot.strikerId,
    nonStrikerId: snapshot.nonStrikerId,
    bowlerId: snapshot.bowlerId,
    pickerMode: snapshot.pickerMode,
    currentInningsIndex: snapshot.currentInningsIndex,
    firstInningsRuns: snapshot.firstInningsRuns,
    engineState,
    handleScore,
    handleExtra,
    handleWicket,
    handlePenalty,
    undoBall,
    pickPlayer,
    swapStrike,
    setPickerMode,
    session,
  };
}
