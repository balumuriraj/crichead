import { Ball } from '../types';

/**
 * Format a ball into a short display string (e.g. "W", "WD", "4", "0")
 */
export function formatBallDisplay(ball: Ball): string {
  if (ball.wicket) return 'W';
  if (ball.extras?.type === 'wd') return 'WD';
  if (ball.extras?.type === 'nb') return 'NB';
  if (ball.extras?.type === 'b') return `${ball.extras.runs}b`;
  if (ball.extras?.type === 'lb') return `${ball.extras.runs}lb`;
  return ball.runs.toString();
}

/**
 * Split a flat array of balls into over-sized groups.
 * Wides and no-balls do not count towards the 6-ball over limit.
 */
export function splitBallsIntoOvers(balls: Ball[]): Ball[][] {
  const overs: Ball[][] = [];
  let currentOver: Ball[] = [];
  let validBallCount = 0;
  for (const ball of balls) {
    currentOver.push(ball);
    const isExtra = ball.extras?.type === 'wd' || ball.extras?.type === 'nb';
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
export function getCurrentOverBalls(balls: Ball[]): Ball[] {
  const overs = splitBallsIntoOvers(balls);
  if (overs.length === 0) return [];
  const lastOver = overs[overs.length - 1]!;
  // Check if the last over is complete (6 valid deliveries)
  let validCount = 0;
  for (const ball of lastOver) {
    const isExtra = ball.extras?.type === 'wd' || ball.extras?.type === 'nb';
    if (!isExtra) validCount++;
  }
  // If last over is complete, there are no balls in the current over yet
  return validCount === 6 ? [] : lastOver;
}
