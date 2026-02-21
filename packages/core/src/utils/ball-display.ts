import type { BallEvent } from '../schema';

/**
 * Format a ball into a short display string (e.g. "W", "WD", "4", "0")
 */
export function formatBallDisplay(ball: BallEvent): string {
  if (ball.wicket) return 'W';
  if (ball.deliveryType === 'wide') return 'WD';
  if (ball.deliveryType === 'no-ball') return 'NB';
  if (ball.deliveryType === 'bye') return `${ball.runs.extra}b`;
  if (ball.deliveryType === 'leg-bye') return `${ball.runs.extra}lb`;
  return ball.runs.bat.toString();
}

/**
 * Split a flat array of balls into over-sized groups.
 * Wides and no-balls do not count towards the 6-ball over limit.
 */
export function splitBallsIntoOvers(balls: BallEvent[]): BallEvent[][] {
  const overs: BallEvent[][] = [];
  let currentOver: BallEvent[] = [];
  let validBallCount = 0;
  for (const ball of balls) {
    currentOver.push(ball);
    const isExtra = ball.deliveryType === 'wide' || ball.deliveryType === 'no-ball';
    if (!isExtra) validBallCount++;
    if (validBallCount === 6) {
      overs.push(currentOver);
      currentOver = [];
      validBallCount = 0;
    }
  }
  if (currentOver.length > 0) overs.push(currentOver);
  return overs;
}

/**
 * Get only the balls in the current (incomplete) over.
 */
export function getCurrentOverBalls(balls: BallEvent[]): BallEvent[] {
  const overs = splitBallsIntoOvers(balls);
  if (overs.length === 0) return [];
  const lastOver = overs[overs.length - 1]!;
  // Check if the last over is complete (6 valid deliveries)
  let validCount = 0;
  for (const ball of lastOver) {
    const isExtra = ball.deliveryType === 'wide' || ball.deliveryType === 'no-ball';
    if (!isExtra) validCount++;
  }
  // If last over is complete, there are no balls in the current over yet
  return validCount === 6 ? [] : lastOver;
}
