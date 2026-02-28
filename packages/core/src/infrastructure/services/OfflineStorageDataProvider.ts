/**
 * OfflineStorageDataProvider — DataProvider adapter backed by browser localStorage.
 *
 * Uses the same storage keys as the previous hardcoded implementation.
 * Falls back to generated players via makePlayers() when none are stored.
 */

import type {
  DataProvider,
  TeamRecord,
  PlayerRecord,
  TournamentRecord,
} from '../../application/ports/DataProvider';
import type { MatchDocument } from '../../domain/types/MatchDocument';
import { makePlayers } from '../../shared/utils/make-players';

const TEAMS_KEY = 'crichead:teams';
const PLAYERS_KEY = 'crichead:players';
const TOURNAMENTS_KEY = 'crichead:tournaments';
const TOURNAMENT_MATCHES_KEY = 'crichead:tournamentMatches';

function readJson<T>(key: string, fallback: T): T {
  if (typeof globalThis === 'undefined') return fallback;
  const storage = (globalThis as {
    localStorage?: { getItem: (storageKey: string) => string | null };
  }).localStorage;
  if (!storage) return fallback;
  try {
    const value = storage.getItem(key);
    if (!value) return fallback;
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function createOfflineStorageDataProvider(): DataProvider {
  return {
    async getTeams(): Promise<TeamRecord[]> {
      return readJson<TeamRecord[]>(TEAMS_KEY, []);
    },

    async getPlayers(teamId: string): Promise<PlayerRecord[]> {
      const byTeam = readJson<Record<string, PlayerRecord[]>>(PLAYERS_KEY, {});
      if (byTeam[teamId]?.length) return byTeam[teamId];
      return makePlayers(teamId, 11).map((p) => ({
        id: p.id,
        name: p.name,
        role: p.role,
      }));
    },

    async getTournaments(): Promise<TournamentRecord[]> {
      return readJson<TournamentRecord[]>(TOURNAMENTS_KEY, []);
    },

    async getTournament(tournamentId: string): Promise<TournamentRecord | null> {
      const tournaments = readJson<TournamentRecord[]>(TOURNAMENTS_KEY, []);
      return tournaments.find((t) => t.id === tournamentId) ?? null;
    },

    async getTournamentMatches(tournamentId: string): Promise<MatchDocument[]> {
      const byTournament = readJson<Record<string, MatchDocument[]>>(
        TOURNAMENT_MATCHES_KEY,
        {},
      );
      return byTournament[tournamentId] ?? [];
    },
  };
}
