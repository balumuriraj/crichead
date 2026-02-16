import { describe, it, expect } from 'vitest';
import { calculatePointsTable } from '../utils/league-logic';
import type { Match } from '../types';
import type { PointsSystem } from '../types/Tournament';

const defaultPoints: PointsSystem = { win: 2, loss: 0, tie: 1, draw: 0 };

/** Helper: create a finished match with summary stats (no ball-by-ball data) */
function makeMatch(
  id: string,
  teamA: string,
  teamB: string,
  innings: { teamId: string; totalRuns: number; totalWickets: number; overs: number }[]
): Match {
  return {
    id,
    teamA,
    teamB,
    toss: null,
    status: 'finished',
    innings: innings.map((inn) => ({ ...inn, balls: [] })),
  };
}

describe('calculatePointsTable', () => {
  it('should return an empty table for no matches', () => {
    const table = calculatePointsTable([], defaultPoints);
    expect(table).toEqual([]);
  });

  it('should ignore non-finished matches', () => {
    const matches: Match[] = [
      { id: '1', teamA: 'A', teamB: 'B', toss: null, status: 'live', innings: [] },
      { id: '2', teamA: 'A', teamB: 'C', toss: null, status: 'upcoming', innings: [] },
    ];
    const table = calculatePointsTable(matches, defaultPoints);
    expect(table).toEqual([]);
  });

  it('should correctly tally a single match win/loss', () => {
    const matches = [
      makeMatch('1', 'A', 'B', [
        { teamId: 'A', totalRuns: 180, totalWickets: 5, overs: 20.0 },
        { teamId: 'B', totalRuns: 150, totalWickets: 8, overs: 20.0 },
      ]),
    ];

    const table = calculatePointsTable(matches, defaultPoints);
    expect(table).toHaveLength(2);

    const teamA = table.find((e) => e.teamId === 'A')!;
    const teamB = table.find((e) => e.teamId === 'B')!;

    expect(teamA.played).toBe(1);
    expect(teamA.won).toBe(1);
    expect(teamA.lost).toBe(0);
    expect(teamA.points).toBe(2);

    expect(teamB.played).toBe(1);
    expect(teamB.won).toBe(0);
    expect(teamB.lost).toBe(1);
    expect(teamB.points).toBe(0);
  });

  it('should handle a tied match', () => {
    const matches = [
      makeMatch('1', 'A', 'B', [
        { teamId: 'A', totalRuns: 160, totalWickets: 6, overs: 20.0 },
        { teamId: 'B', totalRuns: 160, totalWickets: 7, overs: 20.0 },
      ]),
    ];

    const table = calculatePointsTable(matches, defaultPoints);

    const teamA = table.find((e) => e.teamId === 'A')!;
    const teamB = table.find((e) => e.teamId === 'B')!;

    expect(teamA.tied).toBe(1);
    expect(teamA.points).toBe(1);
    expect(teamB.tied).toBe(1);
    expect(teamB.points).toBe(1);
  });

  it('should sort by points descending, then NRR descending', () => {
    const matches = [
      // A beats B by a large margin
      makeMatch('1', 'A', 'B', [
        { teamId: 'A', totalRuns: 200, totalWickets: 3, overs: 20.0 },
        { teamId: 'B', totalRuns: 120, totalWickets: 10, overs: 18.2 },
      ]),
      // C beats B by a small margin
      makeMatch('2', 'C', 'B', [
        { teamId: 'C', totalRuns: 150, totalWickets: 5, overs: 20.0 },
        { teamId: 'B', totalRuns: 145, totalWickets: 6, overs: 20.0 },
      ]),
    ];

    const table = calculatePointsTable(matches, defaultPoints);

    // A and C both have 2 points (1 win each), B has 0 points (2 losses)
    expect(table[0]!.teamId).toBe('A'); // higher NRR
    expect(table[1]!.teamId).toBe('C');
    expect(table[2]!.teamId).toBe('B');

    expect(table[0]!.points).toBe(2);
    expect(table[1]!.points).toBe(2);
    expect(table[2]!.points).toBe(0);
  });

  it('should calculate NRR correctly', () => {
    // Team A scores 180 in 20 overs, team B scores 150 in 20 overs
    // A's NRR = (180/20) - (150/20) = 9.0 - 7.5 = 1.5
    // B's NRR = (150/20) - (180/20) = 7.5 - 9.0 = -1.5
    const matches = [
      makeMatch('1', 'A', 'B', [
        { teamId: 'A', totalRuns: 180, totalWickets: 4, overs: 20.0 },
        { teamId: 'B', totalRuns: 150, totalWickets: 8, overs: 20.0 },
      ]),
    ];

    const table = calculatePointsTable(matches, defaultPoints);
    const teamA = table.find((e) => e.teamId === 'A')!;
    const teamB = table.find((e) => e.teamId === 'B')!;

    expect(teamA.nrr).toBe(1.5);
    expect(teamB.nrr).toBe(-1.5);
  });

  it('should use full over quota for NRR when a team is bowled out', () => {
    // Team A: 160 in 20 overs → rate = 8.0
    // Team B: 140 all out in 18.2 overs → uses 20 overs (full quota) → rate = 140/20 = 7.0
    // A's NRR = 8.0 - 7.0 = 1.0
    const matches = [
      makeMatch('1', 'A', 'B', [
        { teamId: 'A', totalRuns: 160, totalWickets: 4, overs: 20.0 },
        { teamId: 'B', totalRuns: 140, totalWickets: 10, overs: 18.2 },
      ]),
    ];

    const table = calculatePointsTable(matches, defaultPoints);
    const teamA = table.find((e) => e.teamId === 'A')!;
    const teamB = table.find((e) => e.teamId === 'B')!;

    // B bowled out → full 20 overs used for NRR
    expect(teamA.nrr).toBe(1.0);
    expect(teamB.nrr).toBe(-1.0);
  });

  it('should use actual overs for NRR when team is NOT bowled out', () => {
    // Team A: 160 in 20 overs → rate = 8.0
    // Team B: 140/8 in 18.2 overs (not all out) → rate = 140/18.333 = 7.636...
    // A's NRR = 8.0 - 7.636... = 0.364
    const matches = [
      makeMatch('1', 'A', 'B', [
        { teamId: 'A', totalRuns: 160, totalWickets: 4, overs: 20.0 },
        { teamId: 'B', totalRuns: 140, totalWickets: 8, overs: 18.2 },
      ]),
    ];

    const table = calculatePointsTable(matches, defaultPoints);
    const teamA = table.find((e) => e.teamId === 'A')!;

    expect(teamA.nrr).toBeCloseTo(0.364, 2);
  });

  it('should accumulate NRR across multiple matches', () => {
    const matches = [
      makeMatch('1', 'A', 'B', [
        { teamId: 'A', totalRuns: 200, totalWickets: 3, overs: 20.0 },
        { teamId: 'B', totalRuns: 180, totalWickets: 6, overs: 20.0 },
      ]),
      makeMatch('2', 'A', 'C', [
        { teamId: 'A', totalRuns: 150, totalWickets: 5, overs: 20.0 },
        { teamId: 'C', totalRuns: 140, totalWickets: 7, overs: 20.0 },
      ]),
    ];

    const table = calculatePointsTable(matches, defaultPoints);
    const teamA = table.find((e) => e.teamId === 'A')!;

    // A scored: 200 + 150 = 350 in 40 overs → 8.75 rpo
    // A conceded: 180 + 140 = 320 in 40 overs → 8.0 rpo
    // NRR = 8.75 - 8.0 = 0.75
    expect(teamA.nrr).toBe(0.75);
    expect(teamA.played).toBe(2);
    expect(teamA.won).toBe(2);
    expect(teamA.points).toBe(4);
  });

  it('should respect custom points system', () => {
    const customPoints: PointsSystem = { win: 3, loss: 0, tie: 1, draw: 0 };
    const matches = [
      makeMatch('1', 'A', 'B', [
        { teamId: 'A', totalRuns: 180, totalWickets: 4, overs: 20.0 },
        { teamId: 'B', totalRuns: 150, totalWickets: 8, overs: 20.0 },
      ]),
    ];

    const table = calculatePointsTable(matches, customPoints);
    expect(table.find((e) => e.teamId === 'A')!.points).toBe(3);
    expect(table.find((e) => e.teamId === 'B')!.points).toBe(0);
  });

  describe('3-team tournament: incremental match completion', () => {
    const ALPHA = 'team-alpha';
    const BRAVO = 'team-bravo';
    const CHARLIE = 'team-charlie';

    it('should update Wins, Points, and NRR after first match is finished', () => {
      // Match 1: Alpha 185/4 in 20 overs beats Bravo 160/8 in 20 overs
      const matches = [
        makeMatch('m1', ALPHA, BRAVO, [
          { teamId: ALPHA, totalRuns: 185, totalWickets: 4, overs: 20.0 },
          { teamId: BRAVO, totalRuns: 160, totalWickets: 8, overs: 20.0 },
        ]),
      ];

      const table = calculatePointsTable(matches, defaultPoints);
      expect(table).toHaveLength(2);

      const alpha = table.find((e) => e.teamId === ALPHA)!;
      const bravo = table.find((e) => e.teamId === BRAVO)!;

      // Alpha won
      expect(alpha.played).toBe(1);
      expect(alpha.won).toBe(1);
      expect(alpha.lost).toBe(0);
      expect(alpha.points).toBe(2);
      // NRR = (185/20) - (160/20) = 9.25 - 8.0 = 1.25
      expect(alpha.nrr).toBe(1.25);

      // Bravo lost
      expect(bravo.played).toBe(1);
      expect(bravo.won).toBe(0);
      expect(bravo.lost).toBe(1);
      expect(bravo.points).toBe(0);
      expect(bravo.nrr).toBe(-1.25);

      // Charlie not in table yet (no finished matches)
      expect(table.find((e) => e.teamId === CHARLIE)).toBeUndefined();
    });

    it('should update all 3 teams after second match is finished', () => {
      const matches = [
        // Match 1: Alpha beats Bravo
        makeMatch('m1', ALPHA, BRAVO, [
          { teamId: ALPHA, totalRuns: 185, totalWickets: 4, overs: 20.0 },
          { teamId: BRAVO, totalRuns: 160, totalWickets: 8, overs: 20.0 },
        ]),
        // Match 2: Charlie beats Bravo (chased 140 in 17.3 overs)
        makeMatch('m2', BRAVO, CHARLIE, [
          { teamId: BRAVO, totalRuns: 140, totalWickets: 6, overs: 20.0 },
          { teamId: CHARLIE, totalRuns: 141, totalWickets: 3, overs: 17.3 },
        ]),
      ];

      const table = calculatePointsTable(matches, defaultPoints);
      expect(table).toHaveLength(3);

      const alpha = table.find((e) => e.teamId === ALPHA)!;
      const bravo = table.find((e) => e.teamId === BRAVO)!;
      const charlie = table.find((e) => e.teamId === CHARLIE)!;

      // Alpha: 1 win, 2 pts
      expect(alpha.won).toBe(1);
      expect(alpha.lost).toBe(0);
      expect(alpha.points).toBe(2);

      // Charlie: 1 win, 2 pts
      expect(charlie.won).toBe(1);
      expect(charlie.lost).toBe(0);
      expect(charlie.points).toBe(2);
      // Charlie NRR = (141 / 17.5) - (140 / 20) = 8.057 - 7.0 = 1.057
      expect(charlie.nrr).toBeCloseTo(1.057, 2);

      // Bravo: 0 wins, 2 losses, 0 pts
      expect(bravo.won).toBe(0);
      expect(bravo.lost).toBe(2);
      expect(bravo.points).toBe(0);

      // Ranking: Alpha (2 pts, NRR 1.25) > Charlie (2 pts, NRR ~1.057) > Bravo (0 pts)
      expect(table[0]!.teamId).toBe(ALPHA);
      expect(table[1]!.teamId).toBe(CHARLIE);
      expect(table[2]!.teamId).toBe(BRAVO);
    });

    it('should produce correct final standings after all 3 matches', () => {
      const matches = [
        // Match 1: Alpha 185/4 (20) beats Bravo 160/8 (20)
        makeMatch('m1', ALPHA, BRAVO, [
          { teamId: ALPHA, totalRuns: 185, totalWickets: 4, overs: 20.0 },
          { teamId: BRAVO, totalRuns: 160, totalWickets: 8, overs: 20.0 },
        ]),
        // Match 2: Charlie 141/3 (17.3) beats Bravo 140/6 (20)
        makeMatch('m2', BRAVO, CHARLIE, [
          { teamId: BRAVO, totalRuns: 140, totalWickets: 6, overs: 20.0 },
          { teamId: CHARLIE, totalRuns: 141, totalWickets: 3, overs: 17.3 },
        ]),
        // Match 3: Charlie 175/5 (20) beats Alpha 170/7 (20)
        makeMatch('m3', ALPHA, CHARLIE, [
          { teamId: ALPHA, totalRuns: 170, totalWickets: 7, overs: 20.0 },
          { teamId: CHARLIE, totalRuns: 175, totalWickets: 5, overs: 20.0 },
        ]),
      ];

      const table = calculatePointsTable(matches, defaultPoints);

      const alpha = table.find((e) => e.teamId === ALPHA)!;
      const bravo = table.find((e) => e.teamId === BRAVO)!;
      const charlie = table.find((e) => e.teamId === CHARLIE)!;

      // Charlie: 2 wins, 0 losses → 4 pts
      expect(charlie.played).toBe(2);
      expect(charlie.won).toBe(2);
      expect(charlie.lost).toBe(0);
      expect(charlie.points).toBe(4);

      // Alpha: 1 win, 1 loss → 2 pts
      expect(alpha.played).toBe(2);
      expect(alpha.won).toBe(1);
      expect(alpha.lost).toBe(1);
      expect(alpha.points).toBe(2);

      // Bravo: 0 wins, 2 losses → 0 pts
      expect(bravo.played).toBe(2);
      expect(bravo.won).toBe(0);
      expect(bravo.lost).toBe(2);
      expect(bravo.points).toBe(0);

      // Final ranking: Charlie (4 pts) > Alpha (2 pts) > Bravo (0 pts)
      expect(table[0]!.teamId).toBe(CHARLIE);
      expect(table[1]!.teamId).toBe(ALPHA);
      expect(table[2]!.teamId).toBe(BRAVO);

      // Verify NRR for Charlie (accumulated across 2 matches):
      // Scored: 141 + 175 = 316 in 17.5 + 20 = 37.5 overs → 8.427 rpo
      // Conceded: 140 + 170 = 310 in 20 + 20 = 40 overs → 7.75 rpo
      // NRR = 8.427 - 7.75 = 0.677
      expect(charlie.nrr).toBeCloseTo(0.677, 2);

      // Verify NRR for Alpha (accumulated across 2 matches):
      // Scored: 185 + 170 = 355 in 20 + 20 = 40 overs → 8.875 rpo
      // Conceded: 160 + 175 = 335 in 20 + 20 = 40 overs → 8.375 rpo
      // NRR = 8.875 - 8.375 = 0.5
      expect(alpha.nrr).toBe(0.5);

      // Verify NRR for Bravo (accumulated across 2 matches):
      // Scored: 160 + 140 = 300 in 20 + 20 = 40 overs → 7.5 rpo
      // Conceded: 185 + 141 = 326 in 20 + 17.5 = 37.5 overs → 8.693 rpo
      // NRR = 7.5 - 8.693 = -1.193
      expect(bravo.nrr).toBeCloseTo(-1.193, 2);
    });

    it('should not include live/upcoming matches in points table', () => {
      const matches: Match[] = [
        // Finished match
        makeMatch('m1', ALPHA, BRAVO, [
          { teamId: ALPHA, totalRuns: 185, totalWickets: 4, overs: 20.0 },
          { teamId: BRAVO, totalRuns: 160, totalWickets: 8, overs: 20.0 },
        ]),
        // Live match (should be ignored)
        { id: 'm2', teamA: BRAVO, teamB: CHARLIE, toss: null, status: 'live', innings: [] },
        // Upcoming match (should be ignored)
        { id: 'm3', teamA: ALPHA, teamB: CHARLIE, toss: null, status: 'upcoming', innings: [] },
      ];

      const table = calculatePointsTable(matches, defaultPoints);

      // Only Alpha and Bravo should appear (from the finished match)
      expect(table).toHaveLength(2);
      expect(table.find((e) => e.teamId === CHARLIE)).toBeUndefined();
      expect(table.find((e) => e.teamId === ALPHA)!.points).toBe(2);
      expect(table.find((e) => e.teamId === BRAVO)!.points).toBe(0);
    });
  });
});
