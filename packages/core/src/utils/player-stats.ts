import { Ball } from '../types';

export interface BatsmanStats {
  runs: number;
  balls: number;
}

export interface BowlerStats {
  runs: number;
  wickets: number;
  validBalls: number;
}

/**
 * Compute per-batsman stats from an array of balls.
 * Wides are excluded from a batsman's ball count (batsman doesn't face them).
 */
export function computeBatsmenStats(balls: Ball[]): Map<string, BatsmanStats> {
  const map = new Map<string, BatsmanStats>();
  for (const b of balls) {
    const id = b.strikerId;
    if (!map.has(id)) map.set(id, { runs: 0, balls: 0 });
    const entry = map.get(id)!;
    const isValidDelivery = !b.extras || (b.extras.type !== 'wd');
    if (isValidDelivery) {
      entry.balls += 1;
      entry.runs += b.runs;
    }
  }
  return map;
}

/**
 * Compute per-bowler stats from an array of balls.
 * Wides and no-balls do not count as valid deliveries for a bowler.
 */
export function computeBowlerStats(balls: Ball[]): Map<string, BowlerStats> {
  const map = new Map<string, BowlerStats>();
  for (const b of balls) {
    const id = b.bowlerId;
    if (!map.has(id)) map.set(id, { runs: 0, wickets: 0, validBalls: 0 });
    const entry = map.get(id)!;
    entry.runs += b.runs + (b.extras?.runs ?? 0);
    if (b.wicket) entry.wickets += 1;
    const isValidDelivery = !b.extras || (b.extras.type !== 'wd' && b.extras.type !== 'nb');
    if (isValidDelivery) entry.validBalls += 1;
  }
  return map;
}
