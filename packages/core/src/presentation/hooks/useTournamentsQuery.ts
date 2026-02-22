import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { getFirebaseDb } from '../../infrastructure/firebase/client';

export interface TournamentDoc {
  id: string;
  name: string;
  type: 'league' | 'knockout';
  status: 'upcoming' | 'ongoing' | 'completed';
  teamIds: string[];
}

export function useTournamentsQuery() {
  const [tournaments, setTournaments] = useState<TournamentDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const db = getFirebaseDb();
    const q = query(collection(db, 'tournaments'), orderBy('name'));
    const unsub = onSnapshot(q, (snap) => {
      setTournaments(snap.docs.map((d) => ({ id: d.id, ...d.data() } as TournamentDoc)));
      setLoading(false);
    });
    return unsub;
  }, []);

  return { tournaments, loading };
}
