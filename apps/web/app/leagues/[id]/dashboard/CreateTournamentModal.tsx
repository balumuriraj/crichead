'use client';

import { useState } from 'react';
import { useTeamsQuery } from '@crichead/core/hooks';
import { createTournament } from '@crichead/core/firebase';

interface Props {
  leagueId: string;
  onCreated: (tournamentId: string) => void;
  onClose: () => void;
}

export default function CreateTournamentModal({ leagueId, onCreated, onClose }: Props) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'league' | 'knockout'>('league');
  const [winPts, setWinPts] = useState(2);
  const [lossPts, setLossPts] = useState(0);
  const [tiePts, setTiePts] = useState(1);
  const [drawPts, setDrawPts] = useState(0);
  const { teams } = useTeamsQuery();
  const [selectedTeams, setSelectedTeams] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleTeam(teamId: string) {
    setSelectedTeams((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) next.delete(teamId);
      else next.add(teamId);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('Tournament name is required'); return; }
    if (selectedTeams.size < 2) { setError('Select at least 2 teams'); return; }

    setSaving(true);
    setError(null);

    try {
      const tournamentId = await createTournament({
        name: name.trim(),
        leagueId,
        type,
        teamIds: Array.from(selectedTeams),
        pointsSystem: { win: winPts, loss: lossPts, tie: tiePts, draw: drawPts },
      });
      onCreated(tournamentId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tournament');
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-[#1E293B] rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto border border-[#334155]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xs font-bold text-gray-500 tracking-widest">CREATE TOURNAMENT</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 tracking-wider mb-2">
              TOURNAMENT NAME *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName((e.target as HTMLInputElement).value)}
              placeholder="e.g. Summer League 2026"
              className="w-full px-4 py-3 rounded-lg bg-[#0F172A] border border-[#334155] text-white placeholder-gray-600 focus:outline-none focus:border-[#00FF41]/50 transition-colors"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 tracking-wider mb-2">TYPE</label>
            <div className="flex gap-3">
              {(['league', 'knockout'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
                    type === t
                      ? 'bg-[#00FF41]/10 text-[#00FF41] border-[#00FF41]/30'
                      : 'bg-[#0F172A] text-gray-400 border-[#334155] hover:border-gray-500'
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Points System */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 tracking-wider mb-2">
              POINTS SYSTEM
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Win', value: winPts, set: setWinPts },
                { label: 'Loss', value: lossPts, set: setLossPts },
                { label: 'Tie', value: tiePts, set: setTiePts },
                { label: 'Draw', value: drawPts, set: setDrawPts },
              ].map(({ label, value, set }) => (
                <div key={label}>
                  <p className="text-[10px] text-gray-500 text-center mb-1">{label}</p>
                  <input
                    type="number"
                    min={0}
                    value={value}
                    onChange={(e) => set(parseInt((e.target as HTMLInputElement).value) || 0)}
                    className="w-full px-2 py-2 rounded-lg bg-[#0F172A] border border-[#334155] text-white text-center text-sm focus:outline-none focus:border-[#00FF41]/50 transition-colors"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Team Selection */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 tracking-wider mb-2">
              PARTICIPATING TEAMS ({selectedTeams.size} selected)
            </label>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {teams.map((team) => {
                const isSelected = selectedTeams.has(team.id);
                return (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => toggleTeam(team.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-colors border ${
                      isSelected
                        ? 'bg-[#00FF41]/10 text-[#00FF41] border-[#00FF41]/30'
                        : 'bg-[#0F172A] text-gray-300 border-[#334155] hover:border-gray-500'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded flex items-center justify-center text-xs border-2 shrink-0 ${
                      isSelected
                        ? 'bg-[#00FF41] border-[#00FF41] text-[#0F172A] font-bold'
                        : 'border-gray-600'
                    }`}>
                      {isSelected && '✓'}
                    </div>
                    {team.name}
                  </button>
                );
              })}
              {teams.length === 0 && (
                <p className="text-sm text-gray-500 italic py-2">Loading teams...</p>
              )}
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-lg bg-[#00FF41] text-[#0F172A] font-bold text-sm hover:bg-[#00FF41]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Creating...' : 'Create Tournament'}
          </button>
        </form>
      </div>
    </div>
  );
}
