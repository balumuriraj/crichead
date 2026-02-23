import type { StorageProvider } from './StorageProvider';
import type { BallEvent } from '../../domain/schema/ballEvent';
import type { ScoringConfig } from '../../domain/types/ScoringConfig';

export interface LocalMatchRecord {
  id: string;
  config: ScoringConfig;
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

export interface LocalMatchService {
  save(record: LocalMatchRecord): Promise<void>;
  load(id: string): Promise<LocalMatchRecord | null>;
  list(): Promise<LocalMatchRecord[]>;
}

export function createLocalMatchService(storage: StorageProvider): LocalMatchService {
  return {
    async save(record: LocalMatchRecord): Promise<void> {
      await storage.setItem(matchKey(record.id), JSON.stringify(record));
      const raw = await storage.getItem(INDEX_KEY);
      const ids: string[] = raw ? JSON.parse(raw) : [];
      if (!ids.includes(record.id)) {
        ids.push(record.id);
        await storage.setItem(INDEX_KEY, JSON.stringify(ids));
      }
    },
    async load(id: string): Promise<LocalMatchRecord | null> {
      const raw = await storage.getItem(matchKey(id));
      return raw ? JSON.parse(raw) : null;
    },
    async list(): Promise<LocalMatchRecord[]> {
      const raw = await storage.getItem(INDEX_KEY);
      if (!raw) return [];
      const ids: string[] = JSON.parse(raw);
      const records = await Promise.all(ids.map(async (id) => {
        const value = await storage.getItem(matchKey(id));
        return value ? JSON.parse(value) as LocalMatchRecord : null;
      }));
      return (records.filter(Boolean) as LocalMatchRecord[]).sort(
        (a, b) => b.updatedAt - a.updatedAt,
      );
    },
  };
}

export function generateLocalId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
}
