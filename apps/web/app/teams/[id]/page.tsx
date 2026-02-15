'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  getFirestore,
  doc,
  collection,
  onSnapshot,
  deleteDoc,
} from 'firebase/firestore';
import type { PlayerRole, PlayerHand } from '@crichead/core';
import PlayerSearch from './PlayerSearch';

interface TeamDoc {
  name: string;
  logoUrl: string;
  homeGround: string;
}

interface PlayerDoc {
  id: string;
  name: string;
  role: PlayerRole;
  hand: PlayerHand;
}

const roleLabels: Record<PlayerRole, string> = {
  bat: 'Batsman',
  bowl: 'Bowler',
  all: 'All-rounder',
};

const roleBadgeColor: Record<PlayerRole, string> = {
  bat: 'bg-blue-500/20 text-blue-400',
  bowl: 'bg-red-500/20 text-red-400',
  all: 'bg-purple-500/20 text-purple-400',
};

export default function TeamDetailPage() {
  const params = useParams();
  const teamId = typeof params.id === 'string' ? params.id : '';

  const [team, setTeam] = useState<TeamDoc | null>(null);
  const [players, setPlayers] = useState<PlayerDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!teamId) return;
    const db = getFirestore();

    const unsubTeam = onSnapshot(doc(db, 'teams', teamId), (snap) => {
      if (!snap.exists()) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setTeam(snap.data() as TeamDoc);
      setLoading(false);
    });

    const unsubPlayers = onSnapshot(collection(db, 'teams', teamId, 'players'), (snap) => {
      setPlayers(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as PlayerDoc))
      );
    });

    return () => {
      unsubTeam();
      unsubPlayers();
    };
  }, [teamId]);

  async function handleRemovePlayer(playerId: string) {
    const db = getFirestore();
    await deleteDoc(doc(db, 'teams', teamId, 'players', playerId));
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00FF41] border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  if (notFound || !team) {
    return (
      <main className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">🏏</div>
          <h1 className="text-xl font-bold text-white mb-2">Team Not Found</h1>
          <p className="text-gray-400 text-sm mb-6">No team found with this ID</p>
          <Link
            href="/teams"
            className="inline-block px-6 py-2 rounded-lg bg-[#00FF41]/10 text-[#00FF41] border border-[#00FF41]/30 text-sm font-semibold hover:bg-[#00FF41]/20 transition-colors"
          >
            Back to Teams
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0F172A]">
      <header className="border-b border-[#334155] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="w-3 h-3 rounded-full bg-[#00FF41] animate-pulse-green" />
              <h1 className="text-xl font-bold text-white tracking-tight">
                cric<span className="text-[#00FF41]">head</span>
              </h1>
            </Link>
          </div>
          <Link
            href="/teams"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Back to Teams
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Team Info */}
        <div className="bg-[#1E293B] rounded-2xl p-6 border-l-4 border-[#00FF41]">
          <div className="flex items-center gap-5">
            {team.logoUrl ? (
              <img
                src={team.logoUrl}
                alt={team.name}
                className="w-16 h-16 rounded-xl object-cover bg-[#334155]"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-[#334155] flex items-center justify-center text-2xl font-bold text-gray-500">
                {team.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="text-2xl font-extrabold text-white">{team.name}</h2>
              {team.homeGround && (
                <p className="text-sm text-gray-400 mt-1">{team.homeGround}</p>
              )}
            </div>
          </div>
        </div>

        {/* Roster */}
        <div className="bg-[#1E293B] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-gray-500 tracking-widest">
              ROSTER ({players.length})
            </h3>
          </div>

          {players.length === 0 ? (
            <p className="text-sm text-gray-500 italic py-4">
              No players yet. Add players below.
            </p>
          ) : (
            <div className="space-y-2">
              {players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center gap-3 py-3 px-4 rounded-lg bg-[#0F172A] border border-[#334155]"
                >
                  <div className="w-8 h-8 rounded-full bg-[#334155] flex items-center justify-center text-xs font-bold text-gray-400">
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{player.name}</p>
                    <p className="text-xs text-gray-500">{player.hand === 'left' ? 'Left' : 'Right'}-handed</p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${roleBadgeColor[player.role]}`}>
                    {roleLabels[player.role]}
                  </span>
                  <button
                    onClick={() => handleRemovePlayer(player.id)}
                    className="text-gray-600 hover:text-red-400 transition-colors p-1"
                    title="Remove player"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Player */}
        <PlayerSearch teamId={teamId} />
      </div>
    </main>
  );
}
