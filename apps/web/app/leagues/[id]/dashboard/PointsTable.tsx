'use client';

import { useMemo } from 'react';
import {
  calculatePointsTable,
  type PointsSystem,
  type PointsTableEntry,
} from '@crichead/core';

interface MatchForTable {
  id: string;
  teamA: string;
  teamB: string;
  status: 'upcoming' | 'live' | 'finished';
  innings: {
    teamId: string;
    totalRuns: number;
    totalWickets: number;
    overs: number;
    balls: never[];
  }[];
}

interface Props {
  matches: MatchForTable[];
  pointsSystem: PointsSystem;
  teamNames: Record<string, string>;
}

export default function PointsTable({ matches, pointsSystem, teamNames }: Props) {
  const table: PointsTableEntry[] = useMemo(
    () =>
      calculatePointsTable(
        matches.map((m) => ({
          ...m,
          toss: null,
          innings: m.innings.map((inn) => ({ ...inn, balls: [] })),
        })),
        pointsSystem
      ),
    [matches, pointsSystem]
  );

  if (table.length === 0) {
    return (
      <div className="bg-[#1E293B] rounded-2xl p-6">
        <h3 className="text-xs font-bold text-gray-500 tracking-widest mb-4">POINTS TABLE</h3>
        <p className="text-sm text-gray-500 italic">No finished matches yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#1E293B] rounded-2xl p-6">
      <h3 className="text-xs font-bold text-gray-500 tracking-widest mb-4">POINTS TABLE</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] font-bold text-gray-500 tracking-widest border-b border-[#334155]">
              <th className="text-left py-2 pr-2">#</th>
              <th className="text-left py-2">TEAM</th>
              <th className="text-center py-2 px-2">P</th>
              <th className="text-center py-2 px-2">W</th>
              <th className="text-center py-2 px-2">L</th>
              <th className="text-center py-2 px-2">T</th>
              <th className="text-center py-2 px-2">NRR</th>
              <th className="text-center py-2 pl-2">PTS</th>
            </tr>
          </thead>
          <tbody>
            {table.map((entry, idx) => (
              <tr
                key={entry.teamId}
                className="border-b border-[#334155]/50 last:border-0"
              >
                <td className="py-3 pr-2 text-gray-500 font-bold">{idx + 1}</td>
                <td className="py-3 font-semibold text-white">
                  {teamNames[entry.teamId] ?? entry.teamId}
                </td>
                <td className="py-3 px-2 text-center text-gray-300">{entry.played}</td>
                <td className="py-3 px-2 text-center text-[#00FF41] font-semibold">{entry.won}</td>
                <td className="py-3 px-2 text-center text-red-400">{entry.lost}</td>
                <td className="py-3 px-2 text-center text-gray-400">{entry.tied}</td>
                <td className={`py-3 px-2 text-center font-mono text-xs ${entry.nrr >= 0 ? 'text-[#00FF41]' : 'text-red-400'}`}>
                  {entry.nrr >= 0 ? '+' : ''}{entry.nrr.toFixed(3)}
                </td>
                <td className="py-3 pl-2 text-center text-white font-extrabold text-base">
                  {entry.points}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
