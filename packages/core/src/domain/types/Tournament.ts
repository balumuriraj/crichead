export type TournamentType = 'league' | 'knockout';
export type TournamentStatus = 'upcoming' | 'ongoing' | 'completed';

export interface PointsSystem {
  win: number;
  loss: number;
  tie: number;
  draw: number;
}

export interface Tournament {
  id: string;
  leagueId: string;
  name: string;
  type: TournamentType;
  status: TournamentStatus;
  pointsSystem: PointsSystem;
}

export interface PointsTableEntry {
  teamId: string;
  played: number;
  won: number;
  lost: number;
  tied: number;
  nrr: number;
  points: number;
}
