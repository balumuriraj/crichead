import type { EventSchema, MatchRepository, ScoringConfig } from '@crichead/core';

export interface WebLocalMatchRecord {
  id: string;
  config: ScoringConfig;
  balls: EventSchema.BallEvent[];
  strikerId: string | null;
  nonStrikerId: string | null;
  bowlerId: string | null;
  currentInningsIndex: number;
  firstInningsRuns: number | null;
  status: 'upcoming' | 'live' | 'finished' | 'abandoned';
  createdAt: number;
  updatedAt: number;
}

const STORAGE_PREFIX = 'crichead:webLocalMatch:';

function getStorage(): Storage | null {
  if (typeof globalThis === 'undefined') return null;
  const maybeStorage = (globalThis as { localStorage?: Storage }).localStorage;
  return maybeStorage ?? null;
}

function keyFor(id: string): string {
  return `${STORAGE_PREFIX}${id}`;
}

export function loadWebLocalMatch(id: string): WebLocalMatchRecord | null {
  const storage = getStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(keyFor(id));
    return raw ? JSON.parse(raw) as WebLocalMatchRecord : null;
  } catch {
    return null;
  }
}

export function saveWebLocalMatch(record: WebLocalMatchRecord): void {
  const storage = getStorage();
  if (!storage) return;

  const nextRecord: WebLocalMatchRecord = {
    ...record,
    updatedAt: Date.now(),
  };

  storage.setItem(keyFor(record.id), JSON.stringify(nextRecord));
}

interface WebLocalMatchRepositoryOptions {
  matchId: string;
  getConfig: () => ScoringConfig;
}

export function createWebLocalMatchRepository({
  matchId,
  getConfig,
}: WebLocalMatchRepositoryOptions): MatchRepository {
  function ensureRecord(): WebLocalMatchRecord {
    const existing = loadWebLocalMatch(matchId);
    if (existing) return existing;

    const now = Date.now();
    const created: WebLocalMatchRecord = {
      id: matchId,
      config: getConfig(),
      balls: [],
      strikerId: null,
      nonStrikerId: null,
      bowlerId: null,
      currentInningsIndex: 0,
      firstInningsRuns: null,
      status: 'upcoming',
      createdAt: now,
      updatedAt: now,
    };

    saveWebLocalMatch(created);
    return created;
  }

  return {
    async addBall(ball: EventSchema.BallEvent): Promise<void> {
      const record = ensureRecord();
      saveWebLocalMatch({
        ...record,
        balls: [...record.balls, ball],
        status: 'live',
      });
    },

    async undoLastBall(): Promise<void> {
      const record = ensureRecord();
      const nextBalls = record.balls.slice(0, -1);
      saveWebLocalMatch({
        ...record,
        balls: nextBalls,
        status: nextBalls.length > 0 || record.currentInningsIndex > 0 ? 'live' : 'upcoming',
      });
    },

    async endCurrentInnings(): Promise<void> {
      const record = ensureRecord();
      saveWebLocalMatch({
        ...record,
        status: 'live',
      });
    },

    async updateMatchState(_incomingMatchId: string, state: Record<string, unknown>): Promise<void> {
      const record = ensureRecord();
      saveWebLocalMatch({
        ...record,
        strikerId: typeof state.strikerId === 'string' || state.strikerId === null
          ? state.strikerId as string | null
          : record.strikerId,
        nonStrikerId: typeof state.nonStrikerId === 'string' || state.nonStrikerId === null
          ? state.nonStrikerId as string | null
          : record.nonStrikerId,
        bowlerId: typeof state.bowlerId === 'string' || state.bowlerId === null
          ? state.bowlerId as string | null
          : record.bowlerId,
        currentInningsIndex: typeof state.currentInningsIndex === 'number'
          ? state.currentInningsIndex
          : record.currentInningsIndex,
        firstInningsRuns: typeof state.firstInningsRuns === 'number' || state.firstInningsRuns === null
          ? state.firstInningsRuns as number | null
          : record.firstInningsRuns,
        status: 'live',
      });
    },
  };
}
