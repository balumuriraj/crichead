import { Toss, MatchStatus } from './Match';
import { Ball } from './Ball';
import { PlayerRole } from './Player';

export interface PlayingXIEntry {
  id: string;
  name: string;
  role: PlayerRole;
}

export interface InningsSummary {
  teamId: string;
  totalRuns: number;
  totalWickets: number;
  overs: number;
  ballCount: number;
}

export interface MatchDocument {
  id: string;
  teamA: string;
  teamB: string;
  teamAName?: string;
  teamBName?: string;
  toss: Toss | null;
  status: MatchStatus;
  currentInningsIndex: number;
  innings: InningsSummary[];
  playingXI?: Record<string, PlayingXIEntry[]>;
  oversPerInnings?: number;
  playersPerSide?: number;
  wicketsPerInnings?: number;
  currentStrikerId?: string | null;
  currentNonStrikerId?: string | null;
  currentBowlerId?: string | null;
}

export interface BallDocument extends Ball {
  sequence: number;
}
