/**
 * Shared types for scoring session orchestration.
 * Moved from mobile's types/scoring.ts to core for cross-platform reuse.
 */

export type PickerMode = 'striker' | 'nonStriker' | 'bowler' | null;

export interface PlayerInfo {
  id: string;
  name: string;
  role: string;
}

/** Extra type codes used by the scoring UI */
export type ExtraTypeCode = 'WD' | 'NB' | 'B' | 'LB';
