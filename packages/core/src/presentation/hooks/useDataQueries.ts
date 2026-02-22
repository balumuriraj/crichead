import { useEffect, useMemo, useState } from 'react';
import type { FirestoreMatchDoc, PlayerRole, Tournament } from '../../domain/types';
import { makePlayers } from '../../shared/utils';

export interface TeamInfo {
  id: string;
  name: string;
  logoUrl?: string;
  homeGround?: string;
}

export interface PlayerInfo {
  id: string;
  name: string;
  role: PlayerRole;
}

export interface TournamentInfo extends Tournament {
  teamIds: string[];
}

export type TournamentDoc = TournamentInfo;

type StoredPlayers = Record<string, PlayerInfo[]>;

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

export function useTeamsQuery(): { teams: TeamInfo[]; loading: boolean; error: string | null } {
  const [teams, setTeams] = useState<TeamInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      setTeams(readJson<TeamInfo[]>(TEAMS_KEY, []));
      setError(null);
    } catch {
      setError('Failed to load teams');
    } finally {
      setLoading(false);
    }
  }, []);

  return { teams, loading, error };
}

export function usePlayersQuery(teamId: string): { players: PlayerInfo[]; loading: boolean; error: string | null } {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const players = useMemo(() => {
    if (!teamId) return [];
    try {
      const byTeam = readJson<StoredPlayers>(PLAYERS_KEY, {});
      if (byTeam[teamId]?.length) return byTeam[teamId];
      return makePlayers(teamId, 11).map((player) => ({
        id: player.id,
        name: player.name,
        role: player.role,
      }));
    } catch {
      return [];
    }
  }, [teamId]);

  useEffect(() => {
    try {
      setError(null);
    } catch {
      setError('Failed to load players');
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  return { players, loading, error };
}

export function useTournamentQuery(tournamentId: string): {
  tournament: TournamentInfo | null;
  loading: boolean;
  notFound: boolean;
  error: string | null;
} {
  const [tournament, setTournament] = useState<TournamentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const tournaments = readJson<TournamentInfo[]>(TOURNAMENTS_KEY, []);
      const found = tournaments.find((item) => item.id === tournamentId) ?? null;
      setTournament(found);
      setError(null);
    } catch {
      setError('Failed to load tournament');
      setTournament(null);
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  return {
    tournament,
    loading,
    notFound: !loading && !tournament,
    error,
  };
}

export function useTournamentMatchesQuery(tournamentId: string): {
  matches: FirestoreMatchDoc[];
  loading: boolean;
  error: string | null;
} {
  const [matches, setMatches] = useState<FirestoreMatchDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const byTournament = readJson<Record<string, FirestoreMatchDoc[]>>(TOURNAMENT_MATCHES_KEY, {});
      setMatches(byTournament[tournamentId] ?? []);
      setError(null);
    } catch {
      setError('Failed to load matches');
      setMatches([]);
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  return { matches, loading, error };
}

export function useTournamentsQuery(): {
  tournaments: TournamentDoc[];
  loading: boolean;
  error: string | null;
} {
  const [tournaments, setTournaments] = useState<TournamentDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      setTournaments(readJson<TournamentDoc[]>(TOURNAMENTS_KEY, []));
      setError(null);
    } catch {
      setError('Failed to load tournaments');
      setTournaments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { tournaments, loading, error };
}