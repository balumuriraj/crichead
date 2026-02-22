import type { BallEvent, DeliveryType } from '../../domain/schema/ballEvent';

type CreateBallEventParams = {
  matchId: string;
  inningsId: string;
  bowlerId: string;
  strikerId: string;
  nonStrikerId: string;
};

export function createScoreEvent(
  params: CreateBallEventParams,
  runs: number,
  commentary?: string
): BallEvent {
  return {
    v: 1,
    id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
    timestamp: Date.now(),
    matchId: params.matchId,
    inningsId: params.inningsId,
    bowlerId: params.bowlerId,
    strikerId: params.strikerId,
    nonStrikerId: params.nonStrikerId,
    deliveryType: 'legal',
    runs: { bat: runs, extra: 0, penalty: 0 },
    isStrikeRotated: runs % 2 === 1,
    metadata: {
      commentary: commentary ?? (runs === 0 ? 'Dot ball' : runs === 4 ? 'FOUR!' : runs === 6 ? 'SIX!' : `${runs} ${runs === 1 ? 'run' : 'runs'}`),
    },
  };
}

export function createExtraEvent(
  params: CreateBallEventParams,
  type: 'WD' | 'NB' | 'B' | 'LB',
  extraRuns: number = 1
): BallEvent {
  const extraTypeMap: Record<string, DeliveryType> = {
    WD: 'wide',
    NB: 'no-ball',
    B: 'bye',
    LB: 'leg-bye',
  };
  const deliveryType = extraTypeMap[type] as DeliveryType;
  return {
    v: 1,
    id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
    timestamp: Date.now(),
    matchId: params.matchId,
    inningsId: params.inningsId,
    bowlerId: params.bowlerId,
    strikerId: params.strikerId,
    nonStrikerId: params.nonStrikerId,
    deliveryType,
    runs: { bat: 0, extra: extraRuns, penalty: 0 },
    isStrikeRotated: false,
    metadata: { commentary: `${type} - ${extraRuns} run${extraRuns > 1 ? 's' : ''}` },
  };
}

export function createWicketEvent(
  params: CreateBallEventParams,
  dismissedId: string,
  wicketType: any = 'caught',
  fielderId?: string,
  commentary?: string
): BallEvent {
  return {
    v: 1,
    id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
    timestamp: Date.now(),
    matchId: params.matchId,
    inningsId: params.inningsId,
    bowlerId: params.bowlerId,
    strikerId: params.strikerId,
    nonStrikerId: params.nonStrikerId,
    deliveryType: 'legal',
    runs: { bat: 0, extra: 0, penalty: 0 },
    wicket: { type: wicketType, dismissedId, fielderId },
    isStrikeRotated: false,
    metadata: { commentary: commentary ?? 'WICKET!' },
  };
}

export function createPenaltyEvent(
  params: CreateBallEventParams,
  penaltyRuns: number,
  commentary?: string
): BallEvent {
  return {
    v: 1,
    id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
    timestamp: Date.now(),
    matchId: params.matchId,
    inningsId: params.inningsId,
    bowlerId: params.bowlerId,
    strikerId: params.strikerId,
    nonStrikerId: params.nonStrikerId,
    deliveryType: 'legal',
    runs: { bat: 0, extra: 0, penalty: penaltyRuns },
    isStrikeRotated: false,
    metadata: { commentary: commentary ?? `PENALTY — ${penaltyRuns} runs awarded` },
  };
}
