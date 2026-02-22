import { addDoc, collection } from 'firebase/firestore';
import { getFirebaseDb } from './client';
import type { PlayerRole } from '../../domain/types';

export async function createPlayer(teamId: string, name: string, role: PlayerRole, hand: 'left' | 'right' = 'right') {
  const db = getFirebaseDb();
  return addDoc(collection(db, 'teams', teamId, 'players'), {
    name,
    role,
    hand,
  });
}
