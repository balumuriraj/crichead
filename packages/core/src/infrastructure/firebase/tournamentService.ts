import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getFirebaseDb } from './client';
import type { TournamentType, PointsSystem } from '../../domain/types';

export interface CreateTournamentInput {
  name: string;
  leagueId: string;
  type: TournamentType;
  teamIds: string[];
  pointsSystem: PointsSystem;
}

export async function createTournament(input: CreateTournamentInput): Promise<string> {
  const db = getFirebaseDb();
  const ref = await addDoc(collection(db, 'tournaments'), {
    ...input,
    status: 'upcoming',
    createdAt: serverTimestamp(),
  });
  return ref.id;
}
