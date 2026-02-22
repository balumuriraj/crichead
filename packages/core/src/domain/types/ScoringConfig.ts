import type { PlayingXIEntry } from './Firestore';
import type { Toss } from './Match';

/**
 * The minimal config shape that the scoring engine needs.
 *
 * Both `QuickMatchConfig` (local/mobile) and `FirestoreMatchDoc` (live)
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
