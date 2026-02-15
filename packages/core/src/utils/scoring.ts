import { Ball } from '../types';

export interface InningsStats {
  totalRuns: number;
  totalWickets: number;
  currentOver: number;
  currentBall: number;
  ballsInOver: number;
}

/**
 * Calculate innings statistics from an array of balls
 * @param balls - Array of Ball objects
 * @returns InningsStats with total runs, wickets, and over/ball count
 */
export function calculateInningsStats(balls: Ball[]): InningsStats {
  let totalRuns = 0;
  let totalWickets = 0;
  let validBalls = 0; // Balls that count towards overs (excludes wides and no-balls)

  for (const ball of balls) {
    // Count runs scored by batsman
    totalRuns += ball.runs;

    // Add extra runs if present
    if (ball.extras && ball.extras.runs) {
      totalRuns += ball.extras.runs;
    }

    // Count wickets
    if (ball.wicket) {
      totalWickets += 1;
    }

    // Only count valid deliveries (not wides or no-balls)
    if (!ball.extras || (ball.extras.type !== 'wd' && ball.extras.type !== 'nb')) {
      validBalls += 1;
    }
  }

  const currentOver = Math.floor(validBalls / 6);
  const currentBall = validBalls % 6;

  return {
    totalRuns,
    totalWickets,
    currentOver,
    currentBall,
    ballsInOver: 6,
  };
}

/**
 * Format overs and balls into cricket notation (e.g., "12.3" for 12 overs and 3 balls)
 * @param overs - Number of complete overs
 * @param balls - Number of balls in current over
 * @returns Formatted string like "12.3"
 */
export function formatOvers(overs: number, balls: number): string {
  return `${overs}.${balls}`;
}

/**
 * Calculate the current run rate
 * @param runs - Total runs scored
 * @param overs - Number of complete overs
 * @param balls - Number of balls in current over
 * @returns Current run rate (runs per over)
 */
export function calculateRunRate(runs: number, overs: number, balls: number): number {
  const totalOvers = overs + balls / 6;
  if (totalOvers === 0) return 0;
  return runs / totalOvers;
}

/**
 * Parse cricket overs notation back into over and ball components
 * Inverse of formatOvers — e.g., 12.3 -> { currentOver: 12, currentBall: 3 }
 * @param overs - Overs in cricket notation (e.g., 12.3)
 * @returns Object with currentOver and currentBall
 */
export function parseOvers(overs: number): { currentOver: number; currentBall: number } {
  const oversStr = overs.toFixed(1);
  const dotIndex = oversStr.indexOf('.');
  const currentOver = parseInt(oversStr.substring(0, dotIndex), 10);
  const currentBall = parseInt(oversStr.substring(dotIndex + 1), 10);
  return { currentOver, currentBall };
}
