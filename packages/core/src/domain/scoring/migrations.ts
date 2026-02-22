import { BallEvent, DeliveryType, WicketEvent } from '../schema/ballEvent';
import { Ball } from '../types';

export function migrateBallToEvent(ball: Ball, matchId: string, inningsId: string): BallEvent {
  let deliveryType: DeliveryType = 'legal';
  let extraRuns = 0;
  
  if (ball.extras) {
    if (ball.extras.type === 'wd') {
      deliveryType = 'wide';
      extraRuns = ball.extras.runs ?? 1;
    } else if (ball.extras.type === 'nb') {
      deliveryType = 'no-ball';
      extraRuns = ball.extras.runs ?? 1;
    } else if (ball.extras.type === 'b') {
      deliveryType = 'bye';
      extraRuns = ball.extras.runs ?? 1;
    } else if (ball.extras.type === 'lb') {
      deliveryType = 'leg-bye';
      extraRuns = ball.extras.runs ?? 1;
    }
  }

  let wicket: WicketEvent | undefined = undefined;
  if (ball.wicket) {
    wicket = {
      type: ball.wicket.type as WicketEvent['type'],
      dismissedId: ball.strikerId, // Legacy format didn't specify dismissed ID properly for run outs, assume striker
      fielderId: ball.wicket.fielderId,
    };
  }

  // Handle potential hidden fields from older DB schemas
  const ballId = (ball as any).id || Date.now().toString() + Math.random();
  const ts = (ball as any).timestamp?.toMillis?.() || Date.now();

  return {
    v: 1,
    id: ballId,
    timestamp: ts,
    matchId,
    inningsId,
    bowlerId: ball.bowlerId,
    strikerId: ball.strikerId,
    nonStrikerId: 'unknown', // Legacy Balls did not track non-striker
    deliveryType,
    runs: {
      bat: ball.runs,
      extra: extraRuns,
      penalty: 0,
    },
    wicket,
    isStrikeRotated: false, // Legacy did not explicitly track this
  };
}
