/**
 * MatchRepository — Port interface for match data persistence.
 *
 * This defines the abstract boundary between the application/domain layers
 * and the infrastructure layer (local storage, remote APIs, etc.).
 *
 * The ScoringSession currently uses callbacks for remote sync, which
 * naturally map to this interface. Consumers can implement this interface
 * to provide different persistence backends.
 */

import type { BallEvent } from '../../domain/schema/ballEvent';

export interface MatchRepository {
  /** Persist a new ball event */
  addBall(ball: BallEvent): Promise<void>;

  /** Remove the most recent ball event */
  undoLastBall(): Promise<void>;

  /** End the current innings */
  endCurrentInnings(): Promise<void>;

  /** Update arbitrary match state fields (e.g., player IDs, status) */
  updateMatchState(matchId: string, state: Record<string, unknown>): Promise<void>;
}
