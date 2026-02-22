import { Ball } from './Ball';

export interface Innings {
  teamId: string;
  totalRuns: number;
  totalWickets: number;
  overs: number;
  balls: Ball[];
}
