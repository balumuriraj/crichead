import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { getFirebaseDb } from '../../infrastructure/firebase/client';
import type { PlayerRole } from '../../domain/types';

export interface PlayerDoc {
  id: string;
  name: string;
  role: PlayerRole;
  hand: 'left' | 'right';
}

export function usePlayersQuery(teamId: string) {
  const [players, setPlayers] = useState<PlayerDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teamId) {
      setPlayers([]);
      setLoading(false);
      return;
    }

    const db = getFirebaseDb();
    const unsub = onSnapshot(
      collection(db, 'teams', teamId, 'players'),
      (snap) => {
        setPlayers(snap.docs.map((d) => ({ id: d.id, ...d.data() } as PlayerDoc)));
        setLoading(false);
      }
    );
    return unsub;
  }, [teamId]);

  return { players, loading };
}
