/**
 * DataProvider — Port interface for reading application data.
 *
 * This defines the abstract boundary for data queries (teams, players,
 * tournaments). Apps provide concrete adapters (localStorage, AsyncStorage,
 * Firebase, REST API, etc.).
 *
 * All methods are async to support both sync (localStorage) and async
 * (AsyncStorage, network) backends.
 */

import type { FirestoreMatchDoc } from '../../domain/types/Firestore';
import type { PlayerRole } from '../../domain/types/Player';

export interface TeamRecord {
  id: string;
  name: string;
  logoUrl?: string;
  homeGround?: string;
}

export interface PlayerRecord {
  id: string;
  name: string;
  role: PlayerRole;
}

export interface TournamentRecord {
  id: string;
  leagueId: string;
  name: string;
  type: 'league' | 'knockout';
  status: 'upcoming' | 'ongoing' | 'completed';
  pointsSystem: { win: number; loss: number; tie: number; draw: number };
  teamIds: string[];
}

export interface DataProvider {
  /** Fetch all teams */
  getTeams(): Promise<TeamRecord[]>;

  /** Fetch players for a team */
  getPlayers(teamId: string): Promise<PlayerRecord[]>;

  /** Fetch all tournaments */
  getTournaments(): Promise<TournamentRecord[]>;

  /** Fetch a single tournament by ID */
  getTournament(tournamentId: string): Promise<TournamentRecord | null>;

  /** Fetch matches for a tournament */
  getTournamentMatches(tournamentId: string): Promise<FirestoreMatchDoc[]>;
}
