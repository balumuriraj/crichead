'use client';

import { useState } from 'react';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import type { PlayerRole, PlayerHand } from '@crichead/core';

export default function PlayerSearch({ teamId }: { teamId: string }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState<PlayerRole>('bat');
  const [hand, setHand] = useState<PlayerHand>('right');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    setFeedback(null);

    try {
      const db = getFirestore();
      await addDoc(collection(db, 'teams', teamId, 'players'), {
        name: name.trim(),
        role,
        hand,
        addedAt: serverTimestamp(),
      });
      setFeedback({ type: 'success', message: `${name.trim()} added to roster` });
      setName('');
      setRole('bat');
      setHand('right');
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to add player',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-[#1E293B] rounded-2xl p-6">
      <h3 className="text-xs font-bold text-gray-500 tracking-widest mb-4">ADD PLAYER</h3>

      <form onSubmit={handleAdd} className="space-y-4">
        <div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName((e.target as HTMLInputElement).value)}
            placeholder="Player name"
            className="w-full px-4 py-3 rounded-lg bg-[#0F172A] border border-[#334155] text-white placeholder-gray-600 focus:outline-none focus:border-[#00FF41]/50 transition-colors"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 tracking-wider mb-1.5">ROLE</label>
            <select
              value={role}
              onChange={(e) => setRole((e.target as HTMLSelectElement).value as PlayerRole)}
              className="w-full px-3 py-2.5 rounded-lg bg-[#0F172A] border border-[#334155] text-white text-sm focus:outline-none focus:border-[#00FF41]/50 transition-colors"
            >
              <option value="bat">Batsman</option>
              <option value="bowl">Bowler</option>
              <option value="all">All-rounder</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 tracking-wider mb-1.5">HAND</label>
            <select
              value={hand}
              onChange={(e) => setHand((e.target as HTMLSelectElement).value as PlayerHand)}
              className="w-full px-3 py-2.5 rounded-lg bg-[#0F172A] border border-[#334155] text-white text-sm focus:outline-none focus:border-[#00FF41]/50 transition-colors"
            >
              <option value="right">Right-handed</option>
              <option value="left">Left-handed</option>
            </select>
          </div>
        </div>

        {feedback && (
          <p className={`text-sm ${feedback.type === 'success' ? 'text-[#00FF41]' : 'text-red-400'}`}>
            {feedback.message}
          </p>
        )}

        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="w-full py-2.5 rounded-lg bg-[#00FF41]/10 text-[#00FF41] border border-[#00FF41]/30 font-semibold text-sm hover:bg-[#00FF41]/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? 'Adding...' : 'Add Player'}
        </button>
      </form>
    </div>
  );
}
