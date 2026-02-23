import { useEffect, useState } from 'react';
import type { FirestoreMatchDoc } from '../../domain/types';
import type { TeamRecord, PlayerRecord, TournamentRecord } from '../../application/ports/DataProvider';
import { useDataProvider } from '../DataProviderContext';

// Re-export port record types as the hook-level API types.
// Consumers already import these names from @crichead/core/hooks.
export type TeamInfo = TeamRecord;
export type PlayerInfo = PlayerRecord;

export interface TournamentInfo extends TournamentRecord {}
export type TournamentDoc = TournamentInfo;

export function useTeamsQuery(): { teams: TeamInfo[]; loading: boolean; error: string | null } {
  const provider = useDataProvider();
  const [teams, setTeams] = useState<TeamInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    provider
      .getTeams()
      .then((result) => {
        if (mounted) {
          setTeams(result);
          setError(null);
        }
      })
      .catch(() => {
        if (mounted) setError('Failed to load teams');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, [provider]);

  return { teams, loading, error };
}

export function usePlayersQuery(teamId: string): { players: PlayerInfo[]; loading: boolean; error: string | null } {
  const provider = useDataProvider();
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!teamId) {
      setPlayers([]);
      setLoading(false);
      return;
    }

    let mounted = true;
    provider
      .getPlayers(teamId)
      .then((result) => {
        if (mounted) {
          setPlayers(result);
          setError(null);
        }
      })
      .catch(() => {
        if (mounted) setError('Failed to load players');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, [provider, teamId]);

  return { players, loading, error };
}

export function useTournamentQuery(tournamentId: string): {
  tournament: TournamentInfo | null;
  loading: boolean;
  notFound: boolean;
  error: string | null;
} {
  const provider = useDataProvider();
  const [tournament, setTournament] = useState<TournamentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    provider
      .getTournament(tournamentId)
      .then((result) => {
        if (mounted) {
          setTournament(result);
          setError(null);
        }
      })
      .catch(() => {
        if (mounted) {
          setError('Failed to load tournament');
          setTournament(null);
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, [provider, tournamentId]);

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
  const provider = useDataProvider();
  const [matches, setMatches] = useState<FirestoreMatchDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    provider
      .getTournamentMatches(tournamentId)
      .then((result) => {
        if (mounted) {
          setMatches(result);
          setError(null);
        }
      })
      .catch(() => {
        if (mounted) {
          setError('Failed to load matches');
          setMatches([]);
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, [provider, tournamentId]);

  return { matches, loading, error };
}

export function useTournamentsQuery(): {
  tournaments: TournamentDoc[];
  loading: boolean;
  error: string | null;
} {
  const provider = useDataProvider();
  const [tournaments, setTournaments] = useState<TournamentDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    provider
      .getTournaments()
      .then((result) => {
        if (mounted) {
          setTournaments(result);
          setError(null);
        }
      })
      .catch(() => {
        if (mounted) {
          setError('Failed to load tournaments');
          setTournaments([]);
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, [provider]);

  return { tournaments, loading, error };
}
