import type { PlayingXIEntry } from './MatchDocument';
import type { Toss } from './Match';

/**
 * The minimal config shape that the scoring engine needs.
 *
 * Both local quick-match config and persisted match documents
 * satisfy this interface, so the engine can accept either without `any`.
 */
export interface ScoringConfig {
  teamA: string;
  teamAName?: string;
  teamB: string;
  teamBName?: string;
  toss?: Toss | null;
  playingXI?: Record<string, PlayingXIEntry[]>;
  oversPerInnings?: number;
  playersPerSide?: number;
  wicketsPerInnings?: number;
}
