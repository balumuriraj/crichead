'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  getFirestore,
  doc,
  collection,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import type { PointsSystem } from '@crichead/core';
import PointsTable from './PointsTable';
import Schedule, { type MatchDoc } from './Schedule';
import CreateTournamentModal from './CreateTournamentModal';

interface TournamentDoc {
  name: string;
  type: 'league' | 'knockout';
  status: 'upcoming' | 'ongoing' | 'completed';
  teamIds: string[];
  pointsSystem: PointsSystem;
}

export default function LeagueDashboardPage() {
  const params = useParams();
  const tournamentId = typeof params.id === 'string' ? params.id : '';

  const [tournament, setTournament] = useState<TournamentDoc | null>(null);
  const [matches, setMatches] = useState<MatchDoc[]>([]);
  const [teamNames, setTeamNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Subscribe to tournament doc
  useEffect(() => {
    if (!tournamentId) return;
    const db = getFirestore();
    const unsub = onSnapshot(doc(db, 'tournaments', tournamentId), (snap) => {
      if (!snap.exists()) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setTournament(snap.data() as TournamentDoc);
      setLoading(false);
    });
    return unsub;
  }, [tournamentId]);

  // Subscribe to tournament matches
  useEffect(() => {
    if (!tournamentId) return;
    const db = getFirestore();
    const q = query(
      collection(db, 'matches'),
      where('tournamentId', '==', tournamentId)
    );
    const unsub = onSnapshot(q, (snap) => {
      setMatches(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            teamA: data.teamA as string,
            teamB: data.teamB as string,
            status: data.status as MatchDoc['status'],
            innings: (data.innings ?? []) as MatchDoc['innings'],
          };
        })
      );
    });
    return unsub;
  }, [tournamentId]);

  // Subscribe to all teams (for name resolution)
  useEffect(() => {
    const db = getFirestore();
    const unsub = onSnapshot(collection(db, 'teams'), (snap) => {
      const names: Record<string, string> = {};
      snap.docs.forEach((d) => {
        names[d.id] = d.data().name as string;
      });
      setTeamNames(names);
    });
    return unsub;
  }, []);

  // Loading
  if (loading) {
    return (
      <main className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#00FF41] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Loading tournament...</p>
        </div>
      </main>
    );
  }

  // Not found — offer to create
  if (notFound || !tournament) {
    return (
      <main className="min-h-screen bg-[#0F172A]">
        <Header />
        <div className="max-w-4xl mx-auto p-6">
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🏆</div>
            <h2 className="text-xl font-bold text-white mb-2">No Tournament Found</h2>
            <p className="text-gray-400 text-sm mb-6">
              Create a new tournament for this league.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-block px-6 py-3 rounded-lg bg-[#00FF41] text-[#0F172A] font-bold text-sm hover:bg-[#00FF41]/90 transition-colors"
            >
              + Create Tournament
            </button>
          </div>
        </div>

        {showCreateModal && (
          <CreateTournamentModal
            leagueId={tournamentId}
            onCreated={() => {
              setShowCreateModal(false);
              setNotFound(false);
              setLoading(true);
            }}
            onClose={() => setShowCreateModal(false)}
          />
        )}
      </main>
    );
  }

  const statusBadge = {
    upcoming: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    ongoing: 'bg-[#00FF41]/10 text-[#00FF41] border-[#00FF41]/30',
    completed: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
  }[tournament.status];

  const participatingTeamNames = tournament.teamIds
    .map((id) => teamNames[id] ?? id)
    .join(', ');

  return (
    <main className="min-h-screen bg-[#0F172A]">
      <Header />

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Tournament Info */}
        <div className="bg-[#1E293B] rounded-2xl p-6 border-l-4 border-[#00FF41]">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-extrabold text-white">{tournament.name}</h2>
            <span className={`text-[10px] font-bold px-3 py-1 rounded-full border ${statusBadge}`}>
              {tournament.status.toUpperCase()}
            </span>
          </div>
          <div className="flex gap-6 flex-wrap mt-3">
            <div>
              <p className="text-[10px] font-semibold text-gray-500 tracking-widest">TYPE</p>
              <p className="text-sm font-bold text-white capitalize">{tournament.type}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-500 tracking-widest">TEAMS</p>
              <p className="text-sm font-bold text-white">{tournament.teamIds.length}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-500 tracking-widest">MATCHES</p>
              <p className="text-sm font-bold text-white">{matches.length}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-500 tracking-widest">POINTS (W/L/T/D)</p>
              <p className="text-sm font-bold text-[#00FF41]">
                {tournament.pointsSystem.win}/{tournament.pointsSystem.loss}/{tournament.pointsSystem.tie}/{tournament.pointsSystem.draw}
              </p>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-[10px] font-semibold text-gray-500 tracking-widest">PARTICIPATING</p>
            <p className="text-sm text-gray-300 mt-0.5">{participatingTeamNames}</p>
          </div>
        </div>

        {/* Points Table */}
        <PointsTable
          matches={matches.map((m) => ({
            ...m,
            innings: m.innings.map((inn) => ({ ...inn, balls: [] as never[] })),
          }))}
          pointsSystem={tournament.pointsSystem}
          teamNames={teamNames}
        />

        {/* Schedule */}
        <Schedule matches={matches} teamNames={teamNames} />

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-xs text-gray-600">
            Tournament dashboard powered by <span className="text-[#00FF41]">crichead</span>
          </p>
        </div>
      </div>
    </main>
  );
}

function Header() {
  return (
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
          Teams
        </Link>
      </div>
    </header>
  );
}
