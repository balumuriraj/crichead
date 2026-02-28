import type { StorageProvider } from './StorageProvider';
import type { BallEvent } from '../../domain/schema/ballEvent';
import type { ScoringConfig } from '../../domain/types/ScoringConfig';

export interface OfflineMatchRecord {
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

const INDEX_KEY = 'offlineMatchIds';
const matchKey = (id: string) => `offlineMatch:${id}`;

export interface OfflineMatchService {
  save(record: OfflineMatchRecord): Promise<void>;
  load(id: string): Promise<OfflineMatchRecord | null>;
  list(): Promise<OfflineMatchRecord[]>;
}

export function createOfflineMatchService(storage: StorageProvider): OfflineMatchService {
  return {
    async save(record: OfflineMatchRecord): Promise<void> {
      await storage.setItem(matchKey(record.id), JSON.stringify(record));
      const raw = await storage.getItem(INDEX_KEY);
      const ids: string[] = raw ? JSON.parse(raw) : [];
      if (!ids.includes(record.id)) {
        ids.push(record.id);
        await storage.setItem(INDEX_KEY, JSON.stringify(ids));
      }
    },
    async load(id: string): Promise<OfflineMatchRecord | null> {
      const raw = await storage.getItem(matchKey(id));
      return raw ? JSON.parse(raw) : null;
    },
    async list(): Promise<OfflineMatchRecord[]> {
      const raw = await storage.getItem(INDEX_KEY);
      if (!raw) return [];
      const ids: string[] = JSON.parse(raw);
      const records = await Promise.all(ids.map(async (id) => {
        const value = await storage.getItem(matchKey(id));
        return value ? JSON.parse(value) as OfflineMatchRecord : null;
      }));
      return (records.filter(Boolean) as OfflineMatchRecord[]).sort(
        (a, b) => b.updatedAt - a.updatedAt,
      );
    },
  };
}

export function generateOfflineId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
}
