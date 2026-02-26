export interface ScorecardExtras {
  wd: number;
  nb: number;
  b: number;
  lb: number;
  total: number;
}

export interface ScorecardBatterRow {
  playerId: string;
  playerName: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: string;
  dismissalText: string;
  isOut: boolean;
}

export interface ScorecardBowlerRow {
  playerId: string;
  playerName: string;
  overs: string;
  maidens: number;
  runs: number;
  wickets: number;
  economy: string;
}

export interface ScorecardFallOfWicket {
  wicketNumber: number;
  score: string;
  playerName: string;
  over: string;
}

export interface ScorecardInnings {
  inningsIndex: number;
  teamId: string;
  teamName: string;
  score: string;
  overs: string;
  batting: ScorecardBatterRow[];
  bowling: ScorecardBowlerRow[];
  extras: ScorecardExtras;
  fallOfWickets: ScorecardFallOfWicket[];
}
