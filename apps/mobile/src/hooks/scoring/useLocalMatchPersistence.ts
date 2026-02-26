import { useEffect, useState, type MutableRefObject } from 'react';
import { migrateBallToEvent, type EventSchema } from '@crichead/core';
import type { QuickMatchConfig } from '../../types/QuickMatchConfig';
import { loadLocalMatch } from '../../utils/localMatchStore';

interface SessionPersistenceApi {
  setMatchId: (matchId: string) => void;
  setCurrentInningsIndex: (index: number) => void;
  setFirstInningsRuns: (runs: number | null) => void;
  setBalls: (balls: EventSchema.BallEvent[]) => void;
  setPlayers: (strikerId: string | null, nonStrikerId: string | null, bowlerId: string | null) => void;
}

interface UseLocalMatchPersistenceInput {
  initialLocalMatchId?: string;
  localMatchId: string;
  session: SessionPersistenceApi;
  setResolvedConfig: (config: QuickMatchConfig | undefined) => void;
  resolvedConfig?: QuickMatchConfig;
  isMatchEndedRef: MutableRefObject<boolean>;
}

export function useLocalMatchPersistence({
  initialLocalMatchId,
  localMatchId,
  session,
  setResolvedConfig,
}: UseLocalMatchPersistenceInput) {
  const [localLoading, setLocalLoading] = useState(!!initialLocalMatchId);

  useEffect(() => {
    if (!initialLocalMatchId) return;

    let mounted = true;

    loadLocalMatch(initialLocalMatchId).then((record) => {
      if (!mounted || !record) {
        if (mounted) setLocalLoading(false);
        return;
      }

      setResolvedConfig(record.config as QuickMatchConfig);
      const currentInningsId = String(record.currentInningsIndex ?? 0);
      const loadedBalls = (record.balls as any[])
        .map((ball) =>
          ball.deliveryType ? ball : migrateBallToEvent(ball, record.id, currentInningsId)
        )
        .filter((ball) => ball.inningsId === currentInningsId);

      session.setMatchId(record.id ?? localMatchId);
      session.setCurrentInningsIndex(record.currentInningsIndex ?? 0);
      session.setFirstInningsRuns(record.firstInningsRuns ?? null);
      session.setBalls(loadedBalls);
      session.setPlayers(
        record.strikerId ?? null,
        record.nonStrikerId ?? null,
        record.bowlerId ?? null
      );
      setLocalLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [initialLocalMatchId, localMatchId, session, setResolvedConfig]);

  return { localLoading };
}
