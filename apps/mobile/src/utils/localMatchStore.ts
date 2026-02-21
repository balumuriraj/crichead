import AsyncStorage from '@react-native-async-storage/async-storage';
import type { QuickMatchConfig } from '../types/QuickMatchConfig';
import type { Ball } from '@crichead/core';

export interface LocalMatchRecord {
  id: string;
  config: QuickMatchConfig;
  balls: Ball[];
  strikerId: string | null;
  nonStrikerId: string | null;
  bowlerId: string | null;
  status: 'upcoming' | 'live' | 'finished' | 'abandoned';
  currentInningsIndex?: number;
  firstInningsRuns?: number | null;
  createdAt: number;
  updatedAt: number;
}

const INDEX_KEY = 'localMatchIds';
const matchKey = (id: string) => `localMatch:${id}`;

export function generateLocalId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
}

export async function saveLocalMatch(record: LocalMatchRecord): Promise<void> {
  await AsyncStorage.setItem(matchKey(record.id), JSON.stringify(record));
  const raw = await AsyncStorage.getItem(INDEX_KEY);
  const ids: string[] = raw ? JSON.parse(raw) : [];
  if (!ids.includes(record.id)) {
    ids.push(record.id);
    await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(ids));
  }
}

export async function loadLocalMatch(id: string): Promise<LocalMatchRecord | null> {
  const raw = await AsyncStorage.getItem(matchKey(id));
  return raw ? JSON.parse(raw) : null;
}

export async function listLocalMatches(): Promise<LocalMatchRecord[]> {
  const raw = await AsyncStorage.getItem(INDEX_KEY);
  if (!raw) return [];
  const ids: string[] = JSON.parse(raw);
  const records = await Promise.all(ids.map(loadLocalMatch));
  return (records.filter(Boolean) as LocalMatchRecord[]).sort(
    (a, b) => b.updatedAt - a.updatedAt,
  );
}
