import { Innings } from './Innings';

export type TossDecision = 'bat' | 'bowl';
export type MatchStatus = 'upcoming' | 'live' | 'finished' | 'abandoned';
export type MatchFormat = 't20' | 'odi' | 'test' | 'custom';

export interface MatchConfig {
  format: MatchFormat;
  oversPerInnings: number;
  wicketsPerInnings?: number;
  venue: string;
  scheduledDate: string;
  tournament: string;
}

export interface Toss {
  winner: string; // team id
  decision: TossDecision;
}

export interface Match {
  id: string;
  teamA: string; // team id
  teamB: string; // team id
  toss: Toss | null;
  status: MatchStatus;
  innings: Innings[];
}
