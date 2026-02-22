import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getFirebaseDb } from './client';

export interface ThemeSettings {
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string;
}

export async function getThemeSettings(): Promise<ThemeSettings | null> {
  const db = getFirebaseDb();
  const snap = await getDoc(doc(db, 'settings', 'theme'));
  if (!snap.exists()) return null;
  return snap.data() as ThemeSettings;
}

export async function saveThemeSettings(settings: ThemeSettings): Promise<void> {
  const db = getFirebaseDb();
  await setDoc(doc(db, 'settings', 'theme'), settings);
}
