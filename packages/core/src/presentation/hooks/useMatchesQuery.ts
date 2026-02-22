import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, limit, orderBy } from 'firebase/firestore';
import { getFirebaseDb } from '../../infrastructure/firebase/client';
import type { FirestoreMatchDoc } from '../../domain/types';

export function useMatchesQuery() {
  const [matches, setMatches] = useState<FirestoreMatchDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const db = getFirebaseDb();
    const q = query(
      collection(db, 'matches'),
      where('status', 'in', ['upcoming', 'live']),
      limit(20)
    );
    const unsub = onSnapshot(q, (snap) => {
      setMatches(snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreMatchDoc)));
      setLoading(false);
    });
    return unsub;
  }, []);

  return { matches, loading };
}
