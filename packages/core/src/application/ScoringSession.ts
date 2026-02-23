/**
 * ScoringSession — Framework-agnostic orchestration class.
 *
 * Manages the mutable state and state-machine transitions for a cricket
 * scoring session. Both the mobile and web apps delegate to this class
 * instead of implementing the orchestration logic independently.
 *
 * The class is React-free: it manages state internally and exposes a
 * `getSnapshot()` method for React (or any framework) to consume.
 */

import type { BallEvent, WicketTypeEvent } from '../domain/schema/ballEvent';
import type { ExtraTypeCode, PickerMode } from './types';
import {
  createScoreEvent,
  createExtraEvent,
  createWicketEvent,
  createPenaltyEvent,
} from './actions/actions';
import { getMatchStatus, type DerivedMatchState, type ScoringEngineConfig } from '../domain/scoring/derivedState';
import type { MatchRepository } from './ports/MatchRepository';

// ---- Session Configuration ----

export interface ScoringSessionConfig {
  matchId: string;
  currentInningsIndex: number;
  engineConfig: ScoringEngineConfig;
  repository: MatchRepository;

  /** Initial balls to seed the session (e.g. from local storage or Firestore snapshot) */
  initialBalls?: BallEvent[];

  /** Initial player IDs */
  initialStrikerId?: string | null;
  initialNonStrikerId?: string | null;
  initialBowlerId?: string | null;

  /** First innings total for chasing scenarios */
  firstInningsRuns?: number | null;
}

// ---- Session Snapshot (immutable state for UI) ----

export interface ScoringSessionSnapshot {
  balls: BallEvent[];
  strikerId: string | null;
  nonStrikerId: string | null;
  bowlerId: string | null;
  pickerMode: PickerMode;
  currentInningsIndex: number;
  firstInningsRuns: number | null;
  stats: DerivedMatchState;
}

// ---- The Session Class ----

export class ScoringSession {
  // ---- Internal mutable state ----
  private balls: BallEvent[];
  private strikerId: string | null;
  private nonStrikerId: string | null;
  private bowlerId: string | null;
  private pickerMode: PickerMode;
  private currentInningsIndex: number;
  private firstInningsRuns: number | null;
  private matchId: string;
  private engineConfig: ScoringEngineConfig;
  private repository: MatchRepository;

  // Over-change / wicket detection tracking
  private prevOver: number = 0;
  private prevWickets: number = 0;
  private prevBallsLen: number = 0;

  // Change listener for React integration
  private listeners: Set<() => void> = new Set();

  // Cached snapshot for useSyncExternalStore stability
  private snapshotCache: ScoringSessionSnapshot | null = null;

  constructor(config: ScoringSessionConfig) {
    this.matchId = config.matchId;
    this.currentInningsIndex = config.currentInningsIndex;
    this.engineConfig = config.engineConfig;
    this.repository = config.repository;
    this.balls = config.initialBalls ? [...config.initialBalls] : [];
    this.strikerId = config.initialStrikerId ?? null;
    this.nonStrikerId = config.initialNonStrikerId ?? null;
    this.bowlerId = config.initialBowlerId ?? null;
    this.pickerMode = null;
    this.firstInningsRuns = config.firstInningsRuns ?? null;

    // Initialize tracking to current state
    const stats = this.computeStats();
    this.prevOver = stats.currentOver;
    this.prevWickets = stats.totalWickets;
    this.prevBallsLen = this.balls.length;
  }

  // ---- React useSyncExternalStore integration ----

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private emitChange(): void {
    this.snapshotCache = null;
    this.listeners.forEach((l) => l());
  }

  // ---- Computed State ----

  private computeStats(): DerivedMatchState {
    const targetScore = this.currentInningsIndex === 1 && this.firstInningsRuns !== null
      ? this.firstInningsRuns + 1
      : undefined;
    return getMatchStatus(this.balls, this.engineConfig, targetScore);
  }

  getSnapshot(): ScoringSessionSnapshot {
    if (this.snapshotCache) {
      return this.snapshotCache;
    }

    this.snapshotCache = {
      balls: this.balls,
      strikerId: this.strikerId,
      nonStrikerId: this.nonStrikerId,
      bowlerId: this.bowlerId,
      pickerMode: this.pickerMode,
      currentInningsIndex: this.currentInningsIndex,
      firstInningsRuns: this.firstInningsRuns,
      stats: this.computeStats(),
    };

    return this.snapshotCache;
  }

  // ---- State Setters (for external sync, e.g. Firestore snapshot) ----

  setBalls(balls: BallEvent[]): void {
    if (this.balls === balls) {
      return;
    }

    if (
      this.balls.length === balls.length &&
      this.balls.every((ball, index) => ball === balls[index])
    ) {
      return;
    }

    this.balls = [...balls];
    const stats = this.computeStats();
    this.prevOver = stats.currentOver;
    this.prevWickets = stats.totalWickets;
    this.prevBallsLen = this.balls.length;
    this.emitChange();
  }

  setPlayers(strikerId: string | null, nonStrikerId: string | null, bowlerId: string | null): void {
    if (
      this.strikerId === strikerId &&
      this.nonStrikerId === nonStrikerId &&
      this.bowlerId === bowlerId
    ) {
      return;
    }

    this.strikerId = strikerId;
    this.nonStrikerId = nonStrikerId;
    this.bowlerId = bowlerId;
    this.emitChange();

    void this.repository.updateMatchState(this.matchId, {
      strikerId: this.strikerId,
      nonStrikerId: this.nonStrikerId,
      bowlerId: this.bowlerId,
    });
  }

  setPickerMode(mode: PickerMode): void {
    if (this.pickerMode === mode) {
      return;
    }

    this.pickerMode = mode;
    this.emitChange();
  }

  setMatchId(matchId: string): void {
    this.matchId = matchId;
  }

  setCurrentInningsIndex(index: number): void {
    if (this.currentInningsIndex === index) {
      return;
    }

    this.currentInningsIndex = index;
    this.emitChange();

    void this.repository.updateMatchState(this.matchId, {
      currentInningsIndex: this.currentInningsIndex,
    });
  }

  setFirstInningsRuns(runs: number | null): void {
    if (this.firstInningsRuns === runs) {
      return;
    }

    this.firstInningsRuns = runs;
    this.emitChange();

    void this.repository.updateMatchState(this.matchId, {
      firstInningsRuns: this.firstInningsRuns,
    });
  }

  // ---- Core Scoring Operations ----

  private createBallParams() {
    return {
      matchId: this.matchId,
      inningsId: String(this.currentInningsIndex),
      bowlerId: this.bowlerId!,
      strikerId: this.strikerId!,
      nonStrikerId: this.nonStrikerId || 'unknown',
    };
  }

  /**
   * Add a ball to the local event stream and persist via MatchRepository.
   */
  addBall(ball: BallEvent): BallEvent {
    this.balls = [...this.balls, ball];
    this.detectTransitions();
    this.emitChange();

    void this.repository.addBall(ball);
    return ball;
  }

  /**
   * Remove the last ball and persist undo via MatchRepository.
   * Also restores striker/nonStriker to who they were at the start of the undone ball.
   */
  undoBall(): BallEvent | null {
    if (this.balls.length === 0) return null;
    const removed = this.balls[this.balls.length - 1]!;
    this.balls = this.balls.slice(0, -1);

    // Restore player state from the undone ball
    this.strikerId = removed.strikerId;
    this.nonStrikerId = removed.nonStrikerId;

    // Reset detection tracking
    const stats = this.computeStats();
    this.prevOver = stats.currentOver;
    this.prevWickets = stats.totalWickets;
    this.prevBallsLen = this.balls.length;

    this.emitChange();
    void this.repository.undoLastBall();
    return removed;
  }

  // ---- High-Level Handlers ----

  /** Handle a scoring event (0, 1, 2, 3, 4, 6 runs). Returns the created ball. */
  handleScore(runs: number): BallEvent | null {
    if (!this.strikerId || !this.bowlerId) return null;
    const ball = createScoreEvent(this.createBallParams(), runs);
    this.addBall(ball);

    // Rotate strike for odd runs
    if (runs % 2 === 1) {
      const prev = this.strikerId;
      this.strikerId = this.nonStrikerId;
      this.nonStrikerId = prev;
    }

    return ball;
  }

  /** Handle an extra (Wide, No Ball, Bye, Leg Bye). Returns the created ball. */
  handleExtra(type: ExtraTypeCode): BallEvent | null {
    if (!this.strikerId || !this.bowlerId) return null;
    const ball = createExtraEvent(this.createBallParams(), type);
    this.addBall(ball);
    return ball;
  }

  /** Handle a wicket. Returns the created ball. */
  handleWicket(
    dismissedId?: string,
    wicketType?: WicketTypeEvent,
    fielderId?: string
  ): BallEvent | null {
    if (!this.strikerId || !this.bowlerId) return null;
    const ball = createWicketEvent(
      this.createBallParams(),
      dismissedId || this.strikerId,
      wicketType || 'caught',
      fielderId
    );
    this.addBall(ball);
    return ball;
  }

  /** Handle penalty runs. Returns the created ball. */
  handlePenalty(runs: number = 5): BallEvent | null {
    if (!this.strikerId || !this.bowlerId) return null;
    const ball = createPenaltyEvent(this.createBallParams(), runs);
    this.addBall(ball);
    return ball;
  }

  // ---- Player Picker State Machine ----

  /**
   * Pick a player for the current picker role, then cascade to next needed role.
   */
  pickPlayer(playerId: string): void {
    if (this.pickerMode === 'striker') {
      this.strikerId = playerId;
      if (!this.nonStrikerId) {
        this.pickerMode = 'nonStriker';
      } else if (!this.bowlerId) {
        this.pickerMode = 'bowler';
      } else {
        this.pickerMode = null;
      }
    } else if (this.pickerMode === 'nonStriker') {
      this.nonStrikerId = playerId;
      if (!this.bowlerId) {
        this.pickerMode = 'bowler';
      } else {
        this.pickerMode = null;
      }
    } else if (this.pickerMode === 'bowler') {
      this.bowlerId = playerId;
      this.pickerMode = null;
    }
    this.emitChange();
  }

  /** Swap striker and non-striker */
  swapStrike(): void {
    const prev = this.strikerId;
    this.strikerId = this.nonStrikerId;
    this.nonStrikerId = prev;
    this.emitChange();
  }

  // ---- Innings Transition ----

  /**
   * Start the next innings. Saves first innings runs, resets balls and player state.
   */
  startNextInnings(firstInningsRuns: number): void {
    this.firstInningsRuns = firstInningsRuns;
    this.currentInningsIndex = 1;
    this.balls = [];
    this.strikerId = null;
    this.nonStrikerId = null;
    this.bowlerId = null;
    this.pickerMode = 'striker';

    // Reset tracking
    this.prevOver = 0;
    this.prevWickets = 0;
    this.prevBallsLen = 0;

    this.emitChange();

    void this.repository.endCurrentInnings();
    void this.repository.updateMatchState(this.matchId, {
      firstInningsRuns: this.firstInningsRuns,
      currentInningsIndex: this.currentInningsIndex,
      strikerId: this.strikerId,
      nonStrikerId: this.nonStrikerId,
      bowlerId: this.bowlerId,
    });
  }

  // ---- Over-Change / Wicket Detection (synchronous state machine) ----

  private detectTransitions(): void {
    const stats = this.computeStats();
    const ballsLen = this.balls.length;

    // Handle undo (balls decreased)
    if (ballsLen < this.prevBallsLen) {
      this.prevBallsLen = ballsLen;
      this.prevOver = stats.currentOver;
      this.prevWickets = stats.totalWickets;
      return;
    }

    // No new ball
    if (ballsLen === this.prevBallsLen) return;

    const overChanged = stats.currentOver > this.prevOver;
    const wicketFell = stats.totalWickets > this.prevWickets;

    // Update tracking
    this.prevBallsLen = ballsLen;
    this.prevOver = stats.currentOver;
    this.prevWickets = stats.totalWickets;

    // Determine state transition
    if (wicketFell && overChanged) {
      // Wicket on last ball of over — need new striker AND new bowler
      this.strikerId = null;
      this.bowlerId = null;
      this.pickerMode = 'striker';
    } else if (wicketFell) {
      // Wicket mid-over — need new striker
      this.strikerId = null;
      this.pickerMode = 'striker';
    } else if (overChanged) {
      // Over completed — rotate strike and need new bowler
      const tempStriker = this.strikerId;
      this.strikerId = this.nonStrikerId;
      this.nonStrikerId = tempStriker;
      this.bowlerId = null;
      this.pickerMode = 'bowler';
    }
  }
}
