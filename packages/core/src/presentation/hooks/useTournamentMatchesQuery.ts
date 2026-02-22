import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { getFirebaseDb } from '../../infrastructure/firebase/client';

export interface TournamentMatchDoc {
  id: string;
  teamA: string;
  teamB: string;
  status: string;
  innings: { teamId: string; totalRuns: number; totalWickets: number; overs: number; ballCount: number }[];
}

export function useTournamentMatchesQuery(tournamentId: string) {
  const [matches, setMatches] = useState<TournamentMatchDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tournamentId) {
      setMatches([]);
      setLoading(false);
      return;
    }
    const db = getFirebaseDb();
    const q = query(
      collection(db, 'matches'),
      where('tournamentId', '==', tournamentId)
    );
    const unsub = onSnapshot(q, (snap) => {
      setMatches(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            teamA: data.teamA as string,
            teamB: data.teamB as string,
            status: data.status as TournamentMatchDoc['status'],
            innings: (data.innings ?? []) as TournamentMatchDoc['innings'],
          };
        })
      );
      setLoading(false);
    });
    return unsub;
  }, [tournamentId]);

  return { matches, loading };
}
