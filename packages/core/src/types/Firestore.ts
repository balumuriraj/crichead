import { Toss, MatchStatus } from './Match';
import { Ball } from './Ball';

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
  toss: Toss | null;
  status: MatchStatus;
  currentInningsIndex: number;
  innings: FirestoreInningsSummary[];
}

export interface FirestoreBallDoc extends Ball {
  sequence: number;
}
