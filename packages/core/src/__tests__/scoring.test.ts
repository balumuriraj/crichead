import { describe, it, expect } from 'vitest';
import { calculateInningsStats, formatOvers, calculateRunRate } from '../shared/utils/scoring';
import { Ball } from '../domain/types';

describe('calculateInningsStats', () => {
  it('should correctly calculate stats for a complete over with a wide and a wicket', () => {
    // Create a mock over (6 valid balls + 1 wide = 7 total deliveries)
    const balls: Ball[] = [
      // Ball 1: Single run
      {
        bowlerId: 'bowler1',
        strikerId: 'batsman1',
        runs: 1,
        extras: null,
        wicket: null,
      },
      // Ball 2: Wide (doesn't count towards over count)
      {
        bowlerId: 'bowler1',
        strikerId: 'batsman1',
        runs: 0,
        extras: {
          type: 'wd',
          runs: 1,
        },
        wicket: null,
        commentary: 'Wide down the leg side',
      },
      // Ball 3: Boundary
      {
        bowlerId: 'bowler1',
        strikerId: 'batsman1',
        runs: 4,
        extras: null,
        wicket: null,
        commentary: 'Beautiful cover drive for four!',
      },
      // Ball 4: Wicket (caught)
      {
        bowlerId: 'bowler1',
        strikerId: 'batsman1',
        runs: 0,
        extras: null,
        wicket: {
          type: 'caught',
          fielderId: 'fielder1',
        },
        commentary: 'Caught at mid-off!',
      },
      // Ball 5: Dot ball
      {
        bowlerId: 'bowler1',
        strikerId: 'batsman2',
        runs: 0,
        extras: null,
        wicket: null,
      },
      // Ball 6: Single run
      {
        bowlerId: 'bowler1',
        strikerId: 'batsman2',
        runs: 1,
        extras: null,
        wicket: null,
      },
      // Ball 7: Single run (completes the over)
      {
        bowlerId: 'bowler1',
        strikerId: 'batsman1',
        runs: 1,
        extras: null,
        wicket: null,
      },
    ];

    const stats = calculateInningsStats(balls);

    // Total runs: 1 + 1(wide) + 4 + 0 + 0 + 1 + 1 = 8 runs
    expect(stats.totalRuns).toBe(8);

    // Total wickets: 1
    expect(stats.totalWickets).toBe(1);

    // Current over: 1 (6 valid balls = 1 complete over)
    expect(stats.currentOver).toBe(1);

    // Current ball: 0 (over is complete)
    expect(stats.currentBall).toBe(0);

    // Balls per over: 6
    expect(stats.ballsInOver).toBe(6);
  });

  it('should correctly handle an incomplete over', () => {
    const balls: Ball[] = [
      {
        bowlerId: 'bowler1',
        strikerId: 'batsman1',
        runs: 4,
        extras: null,
        wicket: null,
      },
      {
        bowlerId: 'bowler1',
        strikerId: 'batsman1',
        runs: 2,
        extras: null,
        wicket: null,
      },
      {
        bowlerId: 'bowler1',
        strikerId: 'batsman1',
        runs: 0,
        extras: null,
        wicket: null,
      },
    ];

    const stats = calculateInningsStats(balls);

    expect(stats.totalRuns).toBe(6);
    expect(stats.totalWickets).toBe(0);
    expect(stats.currentOver).toBe(0); // 3 balls = 0 complete overs
    expect(stats.currentBall).toBe(3); // 3 balls in current over
  });

  it('should not count no-balls towards over count', () => {
    const balls: Ball[] = [
      {
        bowlerId: 'bowler1',
        strikerId: 'batsman1',
        runs: 1,
        extras: null,
        wicket: null,
      },
      {
        bowlerId: 'bowler1',
        strikerId: 'batsman1',
        runs: 0,
        extras: {
          type: 'nb',
          runs: 1,
        },
        wicket: null,
      },
      {
        bowlerId: 'bowler1',
        strikerId: 'batsman1',
        runs: 2,
        extras: null,
        wicket: null,
      },
    ];

    const stats = calculateInningsStats(balls);

    expect(stats.totalRuns).toBe(4); // 1 + 1(no-ball) + 2
    expect(stats.currentOver).toBe(0); // Only 2 valid balls
    expect(stats.currentBall).toBe(2);
  });

  it('should correctly count byes and leg byes towards over count', () => {
    const balls: Ball[] = [
      {
        bowlerId: 'bowler1',
        strikerId: 'batsman1',
        runs: 0,
        extras: {
          type: 'b',
          runs: 2,
        },
        wicket: null,
      },
      {
        bowlerId: 'bowler1',
        strikerId: 'batsman1',
        runs: 0,
        extras: {
          type: 'lb',
          runs: 1,
        },
        wicket: null,
      },
    ];

    const stats = calculateInningsStats(balls);

    expect(stats.totalRuns).toBe(3); // 2(byes) + 1(leg bye)
    expect(stats.currentOver).toBe(0);
    expect(stats.currentBall).toBe(2); // Both count as valid balls
  });

  it('should handle empty balls array', () => {
    const balls: Ball[] = [];
    const stats = calculateInningsStats(balls);

    expect(stats.totalRuns).toBe(0);
    expect(stats.totalWickets).toBe(0);
    expect(stats.currentOver).toBe(0);
    expect(stats.currentBall).toBe(0);
  });
});

describe('formatOvers', () => {
  it('should format overs correctly', () => {
    expect(formatOvers(12, 3)).toBe('12.3');
    expect(formatOvers(0, 0)).toBe('0.0');
    expect(formatOvers(20, 5)).toBe('20.5');
  });
});

describe('calculateRunRate', () => {
  it('should calculate run rate correctly', () => {
    // 50 runs in 10 overs = 5.0 run rate
    expect(calculateRunRate(50, 10, 0)).toBe(5.0);

    // 30 runs in 5.3 overs (5 + 3/6 = 5.5 overs) = 5.454... run rate
    expect(calculateRunRate(30, 5, 3)).toBeCloseTo(5.4545, 2);

    // 0 runs in 0 overs = 0 run rate
    expect(calculateRunRate(0, 0, 0)).toBe(0);

    // 100 runs in 15.4 overs (15 + 4/6 = 15.6667 overs) = 6.382... run rate
    expect(calculateRunRate(100, 15, 4)).toBeCloseTo(6.3829, 2);
  });
});
