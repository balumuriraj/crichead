import type { Match } from '../types/Match';
import type { Innings } from '../types/Innings';
import type { PointsSystem, PointsTableEntry } from '../types/Tournament';
import { calculateInningsStats } from './scoring';

interface TeamNrrAccumulator {
  runsScored: number;
  oversfaced: number;
  runsConceded: number;
  oversBowled: number;
}

/**
 * Convert an Innings to total overs as a decimal (e.g. 19 overs 3 balls = 19.5)
 * Uses ball-by-ball data if available, otherwise falls back to the overs field.
 */
function inningsToOvers(innings: Innings): number {
  if (innings.balls.length > 0) {
    const stats = calculateInningsStats(innings.balls);
    return stats.currentOver + stats.currentBall / 6;
  }
  // Fallback: parse the overs field (cricket notation: 12.3 = 12 overs + 3 balls)
  const whole = Math.floor(innings.overs);
  const balls = Math.round((innings.overs - whole) * 10);
  return whole + balls / 6;
}

/**
 * Determine the result of a finished match for a given team.
 * Returns 'win' | 'loss' | 'tie' | null (null if match not finished or team not in match).
 */
function getMatchResult(
  match: Match,
  teamId: string
): 'win' | 'loss' | 'tie' | null {
  if (match.status !== 'finished') return null;
  if (match.teamA !== teamId && match.teamB !== teamId) return null;
  if (match.innings.length < 2) return null;

  const firstInnings = match.innings[0]!;
  const secondInnings = match.innings[1]!;

  if (firstInnings.totalRuns === secondInnings.totalRuns) return 'tie';

  const winningTeamId =
    firstInnings.totalRuns > secondInnings.totalRuns
      ? firstInnings.teamId
      : secondInnings.teamId;

  return winningTeamId === teamId ? 'win' : 'loss';
}

/**
 * Calculate the points table from an array of finished matches.
 *
 * Net Run Rate (NRR) is calculated as:
 *   (total runs scored / total overs faced) - (total runs conceded / total overs bowled)
 * across ALL matches played by a team.
 *
 * @param matches - Array of Match objects (only 'finished' matches with 2 innings are counted)
 * @param pointsSystem - Points awarded per win, loss, tie, draw
 * @param maxOvers - Full over quota for the format (e.g. 20 for T20). When a team is
 *   bowled out before completing their overs, maxOvers is used for NRR instead of actual overs.
 * @returns Sorted array of PointsTableEntry (by points desc, then NRR desc)
 */
export function calculatePointsTable(
  matches: Match[],
  pointsSystem: PointsSystem,
  maxOvers: number = 20
): PointsTableEntry[] {
  const teamStats = new Map<
    string,
    {
      played: number;
      won: number;
      lost: number;
      tied: number;
      points: number;
      nrr: TeamNrrAccumulator;
    }
  >();

  function getOrCreate(teamId: string) {
    if (!teamStats.has(teamId)) {
      teamStats.set(teamId, {
        played: 0,
        won: 0,
        lost: 0,
        tied: 0,
        points: 0,
        nrr: { runsScored: 0, oversfaced: 0, runsConceded: 0, oversBowled: 0 },
      });
    }
    return teamStats.get(teamId)!;
  }

  for (const match of matches) {
    if (match.status !== 'finished') continue;
    if (match.innings.length < 2) continue;

    const teamsInMatch = [match.teamA, match.teamB];

    for (const teamId of teamsInMatch) {
      const result = getMatchResult(match, teamId);
      if (!result) continue;

      const entry = getOrCreate(teamId);
      entry.played += 1;

      if (result === 'win') {
        entry.won += 1;
        entry.points += pointsSystem.win;
      } else if (result === 'loss') {
        entry.lost += 1;
        entry.points += pointsSystem.loss;
      } else if (result === 'tie') {
        entry.tied += 1;
        entry.points += pointsSystem.tie;
      }

      // NRR accumulation: find which innings this team batted and bowled
      const battingInnings = match.innings.find((inn) => inn.teamId === teamId);
      const bowlingInnings = match.innings.find((inn) => inn.teamId !== teamId);

      if (battingInnings && bowlingInnings) {
        // ICC rule: if a team is bowled out, use the full over quota for NRR
        const oversFaced =
          battingInnings.totalWickets >= 10 ? maxOvers : inningsToOvers(battingInnings);
        const oversBowled =
          bowlingInnings.totalWickets >= 10 ? maxOvers : inningsToOvers(bowlingInnings);

        entry.nrr.runsScored += battingInnings.totalRuns;
        entry.nrr.oversfaced += oversFaced;
        entry.nrr.runsConceded += bowlingInnings.totalRuns;
        entry.nrr.oversBowled += oversBowled;
      }
    }
  }

  // Build the final entries
  const table: PointsTableEntry[] = [];

  for (const [teamId, stats] of teamStats) {
    const scoringRate =
      stats.nrr.oversfaced > 0 ? stats.nrr.runsScored / stats.nrr.oversfaced : 0;
    const concedingRate =
      stats.nrr.oversBowled > 0 ? stats.nrr.runsConceded / stats.nrr.oversBowled : 0;
    const nrr = scoringRate - concedingRate;

    table.push({
      teamId,
      played: stats.played,
      won: stats.won,
      lost: stats.lost,
      tied: stats.tied,
      nrr: Math.round(nrr * 1000) / 1000, // 3 decimal places
      points: stats.points,
    });
  }

  // Sort: points desc, then NRR desc
  table.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return b.nrr - a.nrr;
  });

  return table;
}
