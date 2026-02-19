import { Toss, MatchStatus } from './Match';
import { Ball } from './Ball';
import { PlayerRole } from './Player';

export interface PlayingXIEntry {
  id: string;
  name: string;
  role: PlayerRole;
}

export interface FirestoreInningsSummary {
  teamId: string;
  totalRuns: number;
  totalWickets: number;
  overs: number;
  ballCount: number;
}

export interface FirestoreMatchDoc {
  id: string;
  teamA: string;
  teamB: string;
  teamAName?: string;
  teamBName?: string;
  toss: Toss | null;
  status: MatchStatus;
  currentInningsIndex: number;
  innings: FirestoreInningsSummary[];
  playingXI?: Record<string, PlayingXIEntry[]>;
  oversPerInnings?: number;
  playersPerSide?: number;
}

export interface FirestoreBallDoc extends Ball {
  sequence: number;
}
