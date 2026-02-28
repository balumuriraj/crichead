import type { EventSchema, MatchRepository } from '@crichead/core';
import type { QuickMatchConfig } from '../types/QuickMatchConfig';
import {
  loadOfflineMatch,
  normalizeOfflineMatchId,
  saveOfflineMatch,
  type OfflineMatchRecord,
} from '../utils/offlineMatchStore';

interface OfflineMatchRepositoryOptions {
  matchId: string;
  getConfig: () => QuickMatchConfig | undefined;
}

export function createOfflineMatchRepository({
  matchId,
  getConfig,
}: OfflineMatchRepositoryOptions): MatchRepository {
  const storageMatchId = normalizeOfflineMatchId(matchId);
  let operationQueue: Promise<void> = Promise.resolve();

  function runSerial(task: () => Promise<void>): Promise<void> {
    const next = operationQueue.then(task);
    operationQueue = next.catch(() => undefined);
    return next;
  }

  async function ensureRecord(): Promise<OfflineMatchRecord | null> {
    const existing = await loadOfflineMatch(storageMatchId);
    if (existing) return existing;

    const config = getConfig();
    if (!config) return null;

    const now = Date.now();
    const created: OfflineMatchRecord = {
      id: storageMatchId,
      config,
      balls: [],
      strikerId: null,
      nonStrikerId: null,
      bowlerId: null,
      status: 'upcoming',
      currentInningsIndex: 0,
      firstInningsRuns: null,
      createdAt: now,
      updatedAt: now,
    };

    await saveOfflineMatch(created);
    return created;
  }

  return {
    async addBall(ball: EventSchema.BallEvent): Promise<void> {
      return runSerial(async () => {
        const record = await ensureRecord();
        if (!record) return;

        await saveOfflineMatch({
          ...record,
          balls: [...record.balls, ball],
          status: 'live',
        });
      });
    },

    async undoLastBall(): Promise<void> {
      return runSerial(async () => {
        const record = await ensureRecord();
        if (!record) return;

        const nextBalls = record.balls.slice(0, -1);
        await saveOfflineMatch({
          ...record,
          balls: nextBalls,
          status: nextBalls.length > 0 || (record.currentInningsIndex ?? 0) > 0 ? 'live' : 'upcoming',
        });
      });
    },

    async endCurrentInnings(): Promise<void> {
      return runSerial(async () => {
        const record = await ensureRecord();
        if (!record) return;

        await saveOfflineMatch({
          ...record,
          strikerId: null,
          nonStrikerId: null,
          bowlerId: null,
          status: 'live',
        });
      });
    },

    async updateMatchState(_incomingMatchId: string, state: Record<string, unknown>): Promise<void> {
      return runSerial(async () => {
        const record = await ensureRecord();
        if (!record) return;

        await saveOfflineMatch({
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
      });
    },
  };
}
