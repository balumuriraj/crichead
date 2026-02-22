import { addDoc, collection } from 'firebase/firestore';
import { getFirebaseDb } from './client';

export async function createTeam(name: string, logoUrl = '', homeGround = '') {
  const db = getFirebaseDb();
  return addDoc(collection(db, 'teams'), {
    name,
    logoUrl,
    homeGround,
  });
}
