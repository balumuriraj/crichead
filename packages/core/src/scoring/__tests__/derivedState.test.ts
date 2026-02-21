import { describe, it, expect } from 'vitest';
import { getMatchStatus } from '../derivedState';
import { BallEvent, MatchConfig, BallEventSchema } from '../../schema';

const baseConfig: MatchConfig = {
  v: 1,
  format: 't20',
  oversPerInnings: 20,
  wicketsPerInnings: 10,
  playersPerSide: 11,
  venue: 'Test Ground',
  scheduledDate: '2026-01-01T00:00:00.000Z',
};

const createEvent = (overrides: Partial<BallEvent>): BallEvent => ({
  v: 1,
  id: Date.now().toString() + Math.random(),
  timestamp: Date.now(),
  matchId: 'm1',
  inningsId: 'i1',
  bowlerId: 'b1',
  strikerId: 's1',
  nonStrikerId: 'ns1',
  deliveryType: 'legal',
  runs: { bat: 0, extra: 0, penalty: 0 },
  isStrikeRotated: false,
  ...overrides,
});

describe('getMatchStatus', () => {
  it('correctly calculates basic runs and overs', () => {
    const events: BallEvent[] = [
      createEvent({ runs: { bat: 1, extra: 0, penalty: 0 }, isStrikeRotated: true }),
      createEvent({ runs: { bat: 4, extra: 0, penalty: 0 }, strikerId: 'ns1', nonStrikerId: 's1' }),
      createEvent({ deliveryType: 'wide', runs: { bat: 0, extra: 1, penalty: 0 } }),
    ];

    const state = getMatchStatus(events, baseConfig);

    expect(state.totalRuns).toBe(6); // 1 + 4 + 1 wide
    expect(state.validBalls).toBe(2);
    expect(state.currentOver).toBe(0);
    expect(state.currentBall).toBe(2);
  });

  it('handles "Run out on a Wide/No Ball" edge case correctly', () => {
    const events: BallEvent[] = [
      createEvent({
        deliveryType: 'wide',
        runs: { bat: 0, extra: 2, penalty: 0 }, // 1 for wide + 1 run physically run
        wicket: { type: 'run out', dismissedId: 's1' },
      }),
    ];

    const state = getMatchStatus(events, baseConfig);

    // Score increments logic: 1 run for wide, 1 run physically run before run out -> total 2 runs
    expect(state.totalRuns).toBe(2);
    expect(state.totalWickets).toBe(1);
    expect(state.validBalls).toBe(0); // wide does not count as valid ball
    
    // The striker who got run out should be removed from strike
    expect(state.currentStrikerId).toBeNull();
  });

  it('rotates strike on wicket on last ball of over according to standard laws', () => {
    // Standard cricket law: Strike ALWAYS rotates at end of over.
    const events: BallEvent[] = [
      createEvent({}), createEvent({}), createEvent({}), createEvent({}), createEvent({}),
      // 6th ball: Bowled (wicket on last ball)
      createEvent({ wicket: { type: 'bowled', dismissedId: 's1' } }),
    ];

    const state = getMatchStatus(events, baseConfig);
    
    expect(state.validBalls).toBe(6);
    expect(state.currentOver).toBe(1);
    expect(state.currentBall).toBe(0);
    expect(state.totalWickets).toBe(1);
    
    // Since s1 was dismissed, non-striker (ns1) moves to striker end for the new over
    expect(state.currentStrikerId).toBe('ns1');
    expect(state.currentNonStrikerId).toBeNull(); // Requires new batter
  });

  it('detects Target Reached correctly', () => {
    const targetScore = 15;
    const events: BallEvent[] = [
      createEvent({ runs: { bat: 6, extra: 0, penalty: 0 } }),
      createEvent({ runs: { bat: 6, extra: 0, penalty: 0 } }),
      createEvent({ runs: { bat: 4, extra: 0, penalty: 0 } }), // Reaches 16
    ];

    const state = getMatchStatus(events, baseConfig, targetScore);

    expect(state.totalRuns).toBe(16);
    expect(state.isTargetReached).toBe(true);
    expect(state.runsNeeded).toBe(-1);
    expect(state.isInningsComplete).toBe(true);
  });

  it('schema parses correctly including new penalty field', () => {
    const validEvent = {
      v: 1,
      id: 'uuid',
      timestamp: 1234567,
      matchId: 'm1',
      inningsId: 'i1',
      bowlerId: 'b1',
      strikerId: 's1',
      nonStrikerId: 'ns1',
      deliveryType: 'legal',
      runs: { bat: 0, extra: 0, penalty: 5 }, // Penalty logic!
      isStrikeRotated: false,
    };
    
    const result = BallEventSchema.safeParse(validEvent);
    expect(result.success).toBe(true);
  });

  it('schema rejects invalid inputs gracefully', () => {
    const invalidEvent = {
      v: 1,
      // Missing id
      timestamp: 'not-a-number', // Invalid type
      matchId: 'm1',
      inningsId: 'i1',
      bowlerId: 'b1',
      strikerId: 's1',
      nonStrikerId: 'ns1',
      deliveryType: 'unknown-type', // Invalid enum
      runs: { bat: 'four', extra: 0, penalty: 0 }, // Invalid type
      isStrikeRotated: false,
    };

    const result = BallEventSchema.safeParse(invalidEvent);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(i => i.path.includes('timestamp'))).toBe(true);
      expect(result.error.issues.some(i => i.path.includes('deliveryType'))).toBe(true);
      expect(result.error.issues.some(i => i.path.includes('runs'))).toBe(true);
    }
  });
});
