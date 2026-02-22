import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { getFirebaseDb } from '../../infrastructure/firebase/client';

export interface TeamInfo {
  id: string;
  name: string;
  logoUrl: string;
  homeGround: string;
}

export function useTeamsQuery() {
  const [teams, setTeams] = useState<TeamInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const db = getFirebaseDb();
    const q = query(collection(db, 'teams'), orderBy('name'));
    const unsub = onSnapshot(q, (snap) => {
      setTeams(snap.docs.map((d) => ({ id: d.id, ...d.data() } as TeamInfo)));
      setLoading(false);
    });
    return unsub;
  }, []);

  return { teams, loading };
}
