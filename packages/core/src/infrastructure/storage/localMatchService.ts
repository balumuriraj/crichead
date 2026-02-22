import { getStorageProvider } from './StorageProvider';
import type { BallEvent } from '../../domain/schema/ballEvent';

// We inline QuickMatchConfig or import it if needed. Assuming it exists in domain/types.
// Wait, QuickMatchConfig was localized in matchService or mobile app. Let's just use `any` or redefine it.
// I will use `any` for config since we just stringify/parse it anyway.

export interface LocalMatchRecord {
  id: string;
  config: any;
  balls: BallEvent[];
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

export async function saveLocalMatchCore(record: LocalMatchRecord): Promise<void> {
  const storage = getStorageProvider();
  await storage.setItem(matchKey(record.id), JSON.stringify(record));
  const raw = await storage.getItem(INDEX_KEY);
  const ids: string[] = raw ? JSON.parse(raw) : [];
  if (!ids.includes(record.id)) {
    ids.push(record.id);
    await storage.setItem(INDEX_KEY, JSON.stringify(ids));
  }
}

export async function loadLocalMatchCore(id: string): Promise<LocalMatchRecord | null> {
  const storage = getStorageProvider();
  const raw = await storage.getItem(matchKey(id));
  return raw ? JSON.parse(raw) : null;
}

export async function listLocalMatchesCore(): Promise<LocalMatchRecord[]> {
  const storage = getStorageProvider();
  const raw = await storage.getItem(INDEX_KEY);
  if (!raw) return [];
  const ids: string[] = JSON.parse(raw);
  const records = await Promise.all(ids.map(loadLocalMatchCore));
  return (records.filter(Boolean) as LocalMatchRecord[]).sort(
    (a, b) => b.updatedAt - a.updatedAt,
  );
}
