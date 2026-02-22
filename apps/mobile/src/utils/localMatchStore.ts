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

export function generateLocalId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export async function saveLocalMatch(record: LocalMatchRecord): Promise<void> {
  const key = `${STORAGE_PREFIX}${record.id}`;
  record.updatedAt = Date.now();
  await AsyncStorage.setItem(key, JSON.stringify(record));
}

export async function loadLocalMatch(id: string): Promise<LocalMatchRecord | null> {
  const key = `${STORAGE_PREFIX}${id}`;
  const data = await AsyncStorage.getItem(key);
  return data ? JSON.parse(data) as LocalMatchRecord : null;
}

export async function listLocalMatches(): Promise<LocalMatchRecord[]> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const matchKeys = keys.filter(k => k.startsWith(STORAGE_PREFIX));
    if (matchKeys.length === 0) return [];
    
    const stores = await AsyncStorage.multiGet(matchKeys);
    const matches: LocalMatchRecord[] = [];
    
    stores.forEach(([, value]) => {
      if (value) {
        try {
          matches.push(JSON.parse(value) as LocalMatchRecord);
        } catch (e) {
          console.error('Failed to parse a local match', e);
        }
      }
    });

    return matches.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (error) {
    console.error('Failed to list local matches:', error);
    return [];
  }
}
