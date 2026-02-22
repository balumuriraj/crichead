'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { type TossDecision, makePlayers } from '@crichead/core';
import { createMatch } from '@crichead/core/firebase';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const HOME_TEAM = { id: '_home', name: 'Home', initial: 'H' };
const AWAY_TEAM = { id: '_away', name: 'Away', initial: 'A' };

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function QuickMatchPage() {
  const router = useRouter();
  const [overs, setOvers] = useState(20);
  const [playersPerSide, setPlayersPerSide] = useState(11);
  const [tossWinner, setTossWinner] = useState<string | null>(null);
  const [tossDecision, setTossDecision] = useState<TossDecision | null>(null);
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    if (!tossWinner || !tossDecision) return;
    setCreating(true);
    try {
      const battingFirst =
        tossDecision === 'bat'
          ? tossWinner
          : tossWinner === HOME_TEAM.id
            ? AWAY_TEAM.id
            : HOME_TEAM.id;

      const homePlayers = makePlayers('Home', playersPerSide);
      const awayPlayers = makePlayers('Away', playersPerSide);
      const matchDoc = {
        teamA: HOME_TEAM.id,
        teamB: AWAY_TEAM.id,
        toss: { winner: tossWinner, decision: tossDecision },
        status: 'live',
        currentInningsIndex: 0,
        innings: [{
          teamId: battingFirst,
          totalRuns: 0,
          totalWickets: 0,
          overs: 0,
          ballCount: 0,
        }],
        playingXI: {
          [HOME_TEAM.id]: homePlayers.map((p) => ({ id: p.id, name: p.name, role: p.role })),
          [AWAY_TEAM.id]: awayPlayers.map((p) => ({ id: p.id, name: p.name, role: p.role })),
        },
        oversPerInnings: overs,
        playersPerSide,
        quickMatch: true,
      };

      const matchId = await createMatch(matchDoc);
      router.push(`/matches/${matchId}/score`);
    } catch (err) {
      console.error('Failed to create quick match:', err);
      setCreating(false);
    }
  }

  const canCreate = tossWinner !== null && tossDecision !== null;

  return (
    <main className="min-h-screen bg-[#0F172A]">
      <header className="border-b border-[#334155] px-6 py-4">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-3 h-3 rounded-full bg-[#00FF41]" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              cric<span className="text-[#00FF41]">head</span>
            </h1>
          </a>
          <a href="/" className="text-sm text-gray-400 hover:text-white transition-colors">
            Cancel
          </a>
        </div>
      </header>

      <div className="max-w-xl mx-auto p-6">
        <h2 className="text-2xl font-extrabold text-white mb-2">Quick Match</h2>
        <p className="text-sm text-gray-400 mb-6">
          Start a match instantly with auto-generated teams.
        </p>

        <div className="space-y-6">
          {/* Match Settings */}
          <div className="bg-[#1E293B] rounded-2xl p-6 space-y-5">
            <h3 className="text-xs font-bold text-gray-500 tracking-widest">MATCH SETTINGS</h3>

            <div>
              <label className="text-sm text-gray-400 mb-2 block">Overs per innings</label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setOvers(Math.max(1, overs - 1))}
                  className="w-10 h-10 rounded-lg bg-[#334155] text-white font-bold hover:bg-[#334155]/80"
                >
                  -
                </button>
                <span className="text-3xl font-extrabold text-white w-16 text-center">{overs}</span>
                <button
                  onClick={() => setOvers(Math.min(50, overs + 1))}
                  className="w-10 h-10 rounded-lg bg-[#334155] text-white font-bold hover:bg-[#334155]/80"
                >
                  +
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-2 block">Players per side</label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setPlayersPerSide(Math.max(2, playersPerSide - 1))}
                  className="w-10 h-10 rounded-lg bg-[#334155] text-white font-bold hover:bg-[#334155]/80"
                >
                  -
                </button>
                <span className="text-3xl font-extrabold text-white w-16 text-center">{playersPerSide}</span>
                <button
                  onClick={() => setPlayersPerSide(Math.min(11, playersPerSide + 1))}
                  className="w-10 h-10 rounded-lg bg-[#334155] text-white font-bold hover:bg-[#334155]/80"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Toss */}
          <div className="bg-[#1E293B] rounded-2xl p-6 space-y-5">
            <h3 className="text-xs font-bold text-gray-500 tracking-widest">TOSS</h3>

            <div>
              <label className="text-sm text-gray-400 mb-2 block">Who won the toss?</label>
              <div className="grid grid-cols-2 gap-3">
                {[HOME_TEAM, AWAY_TEAM].map((team) => (
                  <button
                    key={team.id}
                    onClick={() => setTossWinner(team.id)}
                    className={`p-4 rounded-xl text-center transition-all ${
                      tossWinner === team.id
                        ? 'bg-[#00FF41]/10 border-2 border-[#00FF41] text-[#00FF41] font-bold'
                        : 'bg-[#334155] border-2 border-transparent text-gray-300 hover:border-gray-600 font-medium'
                    }`}
                  >
                    <div className={`w-10 h-10 mx-auto mb-2 rounded-full flex items-center justify-center text-lg font-bold ${
                      tossWinner === team.id ? 'bg-[#00FF41] text-[#0F172A]' : 'bg-[#475569] text-white'
                    }`}>
                      {team.initial}
                    </div>
                    {team.name}
                  </button>
                ))}
              </div>
            </div>

            {tossWinner && (
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Elected to</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['bat', 'bowl'] as TossDecision[]).map((d) => (
                    <button
                      key={d}
                      onClick={() => setTossDecision(d)}
                      className={`p-3 rounded-xl text-center font-bold transition-all ${
                        tossDecision === d
                          ? 'bg-[#00FF41]/10 border-2 border-[#00FF41] text-[#00FF41]'
                          : 'bg-[#334155] border-2 border-transparent text-gray-300 hover:border-gray-600'
                      }`}
                    >
                      {d === 'bat' ? 'Bat First' : 'Bowl First'}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Create Button */}
          <button
            onClick={handleCreate}
            disabled={!canCreate || creating}
            className="w-full py-4 rounded-xl bg-[#00FF41] text-[#0F172A] font-bold text-lg hover:brightness-110 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {creating ? 'Creating Match...' : 'Start Match'}
          </button>
        </div>
      </div>
    </main>
  );
}
