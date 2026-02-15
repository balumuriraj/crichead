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

  it('should handle partial overs in NRR (e.g. 18.2 overs)', () => {
    // Team A: 160 in 20 overs → rate = 8.0
    // Team B: 140 in 18.2 overs (= 18 + 2/6 = 18.333...) → rate = 140/18.333 = 7.636...
    // A's NRR = 8.0 - 7.636... = 0.363...
    const matches = [
      makeMatch('1', 'A', 'B', [
        { teamId: 'A', totalRuns: 160, totalWickets: 4, overs: 20.0 },
        { teamId: 'B', totalRuns: 140, totalWickets: 10, overs: 18.2 },
      ]),
    ];

    const table = calculatePointsTable(matches, defaultPoints);
    const teamA = table.find((e) => e.teamId === 'A')!;

    // A scored at 8.0 rpo, bowled at 140/18.333 = 7.636 rpo → NRR ≈ 0.364
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
});
