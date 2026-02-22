'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTeamsQuery, type TeamInfo } from '@crichead/core';

export default function TeamsPage() {
  const { teams, loading } = useTeamsQuery();

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00FF41] border-t-transparent rounded-full animate-spin" />
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
            href="/teams/new"
            className="px-4 py-2 rounded-lg bg-[#00FF41] text-[#0F172A] text-sm font-bold hover:bg-[#00FF41]/90 transition-colors"
          >
            + New Team
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6">
        <h2 className="text-xs font-bold text-gray-500 tracking-widest mb-6">TEAMS</h2>

        {teams.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🏏</div>
            <p className="text-gray-400 mb-4">No teams yet</p>
            <Link
              href="/teams/new"
              className="inline-block px-6 py-2 rounded-lg bg-[#00FF41]/10 text-[#00FF41] border border-[#00FF41]/30 text-sm font-semibold hover:bg-[#00FF41]/20 transition-colors"
            >
              Create your first team
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {teams.map((team) => (
              <Link
                key={team.id}
                href={`/teams/${team.id}`}
                className="bg-[#1E293B] rounded-xl p-5 border border-[#334155] hover:border-[#00FF41]/40 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  {team.logoUrl ? (
                    <img
                      src={team.logoUrl}
                      alt={team.name}
                      className="w-12 h-12 rounded-lg object-cover bg-[#334155]"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-[#334155] flex items-center justify-center text-xl font-bold text-gray-500">
                      {team.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-bold truncate group-hover:text-[#00FF41] transition-colors">
                      {team.name}
                    </h3>
                    {team.homeGround && (
                      <p className="text-xs text-gray-500 truncate">{team.homeGround}</p>
                    )}
                  </div>
                  <svg
                    className="w-5 h-5 text-gray-600 group-hover:text-[#00FF41] transition-colors shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
