import { useEffect, useState, type MutableRefObject } from 'react';
import { migrateBallToEvent, type EventSchema } from '@crichead/core';
import type { QuickMatchConfig } from '../../types/QuickMatchConfig';
import { loadOfflineMatch } from '../../utils/offlineMatchStore';

interface SessionPersistenceApi {
  setMatchId: (matchId: string) => void;
  setCurrentInningsIndex: (index: number) => void;
  setFirstInningsRuns: (runs: number | null) => void;
  setBalls: (balls: EventSchema.BallEvent[]) => void;
  setPlayers: (strikerId: string | null, nonStrikerId: string | null, bowlerId: string | null) => void;
}

interface UseOfflineMatchPersistenceInput {
  initialOfflineMatchId?: string;
  offlineMatchId: string;
  session: SessionPersistenceApi;
  setResolvedConfig: (config: QuickMatchConfig | undefined) => void;
  resolvedConfig?: QuickMatchConfig;
  isMatchEndedRef: MutableRefObject<boolean>;
}

export function useOfflineMatchPersistence({
  initialOfflineMatchId,
  offlineMatchId,
  session,
  setResolvedConfig,
}: UseOfflineMatchPersistenceInput) {
  const [offlineLoading, setOfflineLoading] = useState(!!initialOfflineMatchId);

  useEffect(() => {
    if (!initialOfflineMatchId) return;

    let mounted = true;

    loadOfflineMatch(initialOfflineMatchId).then((record) => {
      if (!mounted || !record) {
        if (mounted) setOfflineLoading(false);
        return;
      }

      setResolvedConfig(record.config as QuickMatchConfig);
      const currentInningsId = String(record.currentInningsIndex ?? 0);
      const loadedBalls = (record.balls as any[])
        .map((ball) =>
          ball.deliveryType ? ball : migrateBallToEvent(ball, record.id, currentInningsId)
        )
        .filter((ball) => ball.inningsId === currentInningsId);

      session.setMatchId(record.id ?? offlineMatchId);
      session.setCurrentInningsIndex(record.currentInningsIndex ?? 0);
      session.setFirstInningsRuns(record.firstInningsRuns ?? null);
      session.setBalls(loadedBalls);
      session.setPlayers(
        record.strikerId ?? null,
        record.nonStrikerId ?? null,
        record.bowlerId ?? null
      );
      setOfflineLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [initialOfflineMatchId, offlineMatchId, session, setResolvedConfig]);

  return { offlineLoading };
}
