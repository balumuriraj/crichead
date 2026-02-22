import type { Toss, ScoringConfig } from '@crichead/core';
import type { PlayingXIEntry } from '@crichead/core';

export interface QuickMatchConfig extends ScoringConfig {
  teamA: string;
  teamAName: string;
  teamB: string;
  teamBName: string;
  toss: Toss;
  playingXI: Record<string, PlayingXIEntry[]>;
  oversPerInnings: number;
  playersPerSide: number;
}
