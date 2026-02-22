import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { getFirebaseDb } from '../../infrastructure/firebase/client';
import type { PointsSystem } from '../../domain/types';

export interface TournamentDetail {
  id: string;
  name: string;
  type: 'league' | 'knockout';
  status: 'upcoming' | 'ongoing' | 'completed';
  teamIds: string[];
  pointsSystem: PointsSystem;
}

export function useTournamentQuery(tournamentId: string) {
  const [tournament, setTournament] = useState<TournamentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!tournamentId) {
      setLoading(false);
      return;
    }
    const db = getFirebaseDb();
    const unsub = onSnapshot(doc(db, 'tournaments', tournamentId), (snap) => {
      if (!snap.exists()) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setTournament({ id: snap.id, ...snap.data() } as TournamentDetail);
      setLoading(false);
    });
    return unsub;
  }, [tournamentId]);

  return { tournament, loading, notFound };
}
