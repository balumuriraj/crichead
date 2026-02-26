import AsyncStorage from '@react-native-async-storage/async-storage';

export interface LocalMatchConfig {
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

export interface LocalMatchRecord {
  id: string;
  config: LocalMatchConfig;
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

const STORAGE_PREFIX = '@crichead:localMatch:';

const LOCAL_ROUTE_PREFIX = 'local-';

function makeStorageKey(id: string): string {
  return `${STORAGE_PREFIX}${id}`;
}

function toLegacyPrefixedId(normalizedId: string): string {
  return `${LOCAL_ROUTE_PREFIX}${normalizedId}`;
}

export function normalizeLocalMatchId(id: string): string {
  return id.startsWith(LOCAL_ROUTE_PREFIX) ? id.slice(LOCAL_ROUTE_PREFIX.length) : id;
}

export function toLocalRouteMatchId(id: string): string {
  const normalized = normalizeLocalMatchId(id);
  return `${LOCAL_ROUTE_PREFIX}${normalized}`;
}

export function generateLocalId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export async function saveLocalMatch(record: LocalMatchRecord): Promise<void> {
  const normalizedId = normalizeLocalMatchId(record.id);
  const key = makeStorageKey(normalizedId);
  const normalizedRecord: LocalMatchRecord = {
    ...record,
    id: normalizedId,
    updatedAt: Date.now(),
  };
  await AsyncStorage.setItem(key, JSON.stringify(normalizedRecord));
}

export async function loadLocalMatch(id: string): Promise<LocalMatchRecord | null> {
  const normalizedId = normalizeLocalMatchId(id);
  const key = makeStorageKey(normalizedId);
  const data = await AsyncStorage.getItem(key);

  if (data) {
    const parsed = JSON.parse(data) as LocalMatchRecord;
    return { ...parsed, id: normalizedId };
  }

  const legacyId = toLegacyPrefixedId(normalizedId);
  const legacyKey = makeStorageKey(legacyId);
  const legacyData = await AsyncStorage.getItem(legacyKey);
  if (!legacyData) {
    return null;
  }

  const parsedLegacy = JSON.parse(legacyData) as LocalMatchRecord;
  const migratedRecord: LocalMatchRecord = {
    ...parsedLegacy,
    id: normalizedId,
    updatedAt: Date.now(),
  };

  await AsyncStorage.setItem(key, JSON.stringify(migratedRecord));
  await AsyncStorage.removeItem(legacyKey);

  return migratedRecord;
}

export async function deleteLocalMatch(id: string): Promise<void> {
  const normalizedId = normalizeLocalMatchId(id);
  const key = makeStorageKey(normalizedId);
  const legacyKey = makeStorageKey(toLegacyPrefixedId(normalizedId));
  await AsyncStorage.multiRemove([key, legacyKey]);
}

export async function listLocalMatches(): Promise<LocalMatchRecord[]> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const matchKeys = keys.filter(k => k.startsWith(STORAGE_PREFIX));
    if (matchKeys.length === 0) return [];
    
    const stores = await AsyncStorage.multiGet(matchKeys);
    const matchesById = new Map<string, LocalMatchRecord>();
    
    stores.forEach(([, value]) => {
      if (value) {
        try {
          const parsed = JSON.parse(value) as LocalMatchRecord;
          const normalizedId = normalizeLocalMatchId(parsed.id);
          const normalizedRecord: LocalMatchRecord = {
            ...parsed,
            id: normalizedId,
          };

          const existing = matchesById.get(normalizedId);
          if (!existing || normalizedRecord.updatedAt > existing.updatedAt) {
            matchesById.set(normalizedId, normalizedRecord);
          }
        } catch (e) {
          console.error('Failed to parse a local match', e);
        }
      }
    });

    const matches = Array.from(matchesById.values());
    return matches.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (error) {
    console.error('Failed to list local matches:', error);
    return [];
  }
}
