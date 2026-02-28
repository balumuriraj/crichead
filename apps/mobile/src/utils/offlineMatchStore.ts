import AsyncStorage from '@react-native-async-storage/async-storage';

export interface OfflineMatchConfig {
  teamA?: string;
  teamAId?: string;
  teamAName: string;
  teamB?: string;
  teamBId?: string;
  teamBName: string;
  toss?: any;
  oversPerInnings: number;
  wicketsPerInnings?: number;
  playersPerSide?: number;
  playingXI?: any;
  format?: string;
  venue?: string;
  scheduledDate?: string;
  tournament?: string;
  [key: string]: any;
}

export interface OfflineMatchRecord {
  id: string;
  config: OfflineMatchConfig;
  balls: unknown[];
  strikerId: string | null;
  nonStrikerId: string | null;
  bowlerId: string | null;
  status: 'upcoming' | 'live' | 'finished' | 'abandoned';
  currentInningsIndex?: number;
  firstInningsRuns?: number | null;
  createdAt: number;
  updatedAt: number;
}

const STORAGE_PREFIX = '@crichead:offlineMatch:';

const OFFLINE_ROUTE_PREFIX = 'offline-';

function makeStorageKey(id: string): string {
  return `${STORAGE_PREFIX}${id}`;
}

function toLegacyPrefixedId(normalizedId: string): string {
  return `${OFFLINE_ROUTE_PREFIX}${normalizedId}`;
}

export function normalizeOfflineMatchId(id: string): string {
  return id.startsWith(OFFLINE_ROUTE_PREFIX) ? id.slice(OFFLINE_ROUTE_PREFIX.length) : id;
}

export function toOfflineRouteMatchId(id: string): string {
  const normalized = normalizeOfflineMatchId(id);
  return `${OFFLINE_ROUTE_PREFIX}${normalized}`;
}

export function generateOfflineId(): string {
  return `offline_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export async function saveOfflineMatch(record: OfflineMatchRecord): Promise<void> {
  const normalizedId = normalizeOfflineMatchId(record.id);
  const key = makeStorageKey(normalizedId);
  const normalizedRecord: OfflineMatchRecord = {
    ...record,
    id: normalizedId,
    updatedAt: Date.now(),
  };
  await AsyncStorage.setItem(key, JSON.stringify(normalizedRecord));
}

export async function loadOfflineMatch(id: string): Promise<OfflineMatchRecord | null> {
  const normalizedId = normalizeOfflineMatchId(id);
  const key = makeStorageKey(normalizedId);
  const data = await AsyncStorage.getItem(key);

  if (data) {
    const parsed = JSON.parse(data) as OfflineMatchRecord;
    return { ...parsed, id: normalizedId };
  }

  const legacyId = toLegacyPrefixedId(normalizedId);
  const legacyKey = makeStorageKey(legacyId);
  const legacyData = await AsyncStorage.getItem(legacyKey);
  if (!legacyData) {
    return null;
  }

  const parsedLegacy = JSON.parse(legacyData) as OfflineMatchRecord;
  const migratedRecord: OfflineMatchRecord = {
    ...parsedLegacy,
    id: normalizedId,
    updatedAt: Date.now(),
  };

  await AsyncStorage.setItem(key, JSON.stringify(migratedRecord));
  await AsyncStorage.removeItem(legacyKey);

  return migratedRecord;
}

export async function deleteOfflineMatch(id: string): Promise<void> {
  const normalizedId = normalizeOfflineMatchId(id);
  const key = makeStorageKey(normalizedId);
  const legacyKey = makeStorageKey(toLegacyPrefixedId(normalizedId));
  await AsyncStorage.multiRemove([key, legacyKey]);
}

export async function listOfflineMatches(): Promise<OfflineMatchRecord[]> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const matchKeys = keys.filter(k => k.startsWith(STORAGE_PREFIX));
    if (matchKeys.length === 0) return [];
    
    const stores = await AsyncStorage.multiGet(matchKeys);
    const matchesById = new Map<string, OfflineMatchRecord>();
    
    stores.forEach(([, value]) => {
      if (value) {
        try {
          const parsed = JSON.parse(value) as OfflineMatchRecord;
          const normalizedId = normalizeOfflineMatchId(parsed.id);
          const normalizedRecord: OfflineMatchRecord = {
            ...parsed,
            id: normalizedId,
          };

          const existing = matchesById.get(normalizedId);
          if (!existing || normalizedRecord.updatedAt > existing.updatedAt) {
            matchesById.set(normalizedId, normalizedRecord);
          }
        } catch (e) {
          console.error('Failed to parse an offline match', e);
        }
      }
    });

    const matches = Array.from(matchesById.values());
    return matches.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (error) {
    console.error('Failed to list offline matches:', error);
    return [];
  }
}
