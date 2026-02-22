'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Home() {
  const loading = false;
  const matches: any[] = [];
  
  const liveMatches = matches.filter((m) => m.status === 'live');
  const finishedMatches = matches.filter((m) => m.status === 'finished');

  return (
    <main className="min-h-screen bg-[#0F172A]">
      {/* Header */}
      <header className="border-b border-[#334155] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-[#00FF41]" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              cric<span className="text-[#00FF41]">head</span>
            </h1>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/teams" className="text-sm text-gray-400 hover:text-white transition-colors">
              Teams
            </Link>
            <Link href="/admin" className="text-sm text-gray-400 hover:text-white transition-colors">
              Admin
            </Link>
          </nav>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <Link
            href="/matches/new"
            className="bg-[#1E293B] rounded-2xl p-6 border-2 border-transparent hover:border-[#00FF41]/40 transition-all group"
          >
            <div className="text-3xl mb-2">+</div>
            <h2 className="text-lg font-bold text-white group-hover:text-[#00FF41] transition-colors">New Match</h2>
            <p className="text-sm text-gray-400 mt-1">Full match setup with teams, roster, and toss</p>
          </Link>
          <Link
            href="/matches/quick"
            className="bg-[#1E293B] rounded-2xl p-6 border-2 border-transparent hover:border-[#00FF41]/40 transition-all group"
          >
            <div className="text-3xl mb-2">{'\u26A1'}</div>
            <h2 className="text-lg font-bold text-white group-hover:text-[#00FF41] transition-colors">Quick Match</h2>
            <p className="text-sm text-gray-400 mt-1">Start instantly with auto-generated teams</p>
          </Link>
        </div>

        {/* Live Matches */}
        {liveMatches.length > 0 && (
          <section>
            <h2 className="text-xs font-bold text-[#00FF41] tracking-widest mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#00FF41] animate-pulse" />
              LIVE MATCHES
            </h2>
            <div className="space-y-3">
              {liveMatches.map((m) => {
                const innings = m.innings[m.currentInningsIndex];
                return (
                  <Link
                    key={m.id}
                    href={`/matches/${m.id}/score`}
                    className="block bg-[#1E293B] rounded-xl p-5 hover:bg-[#1E293B]/80 transition-all border border-transparent hover:border-[#00FF41]/20"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-400">
                          {m.teamA} vs {m.teamB}
                        </p>
                        {innings && (
                          <p className="text-2xl font-extrabold text-white mt-1">
                            {innings.totalRuns}
                            <span className="text-gray-500">/{innings.totalWickets}</span>
                            <span className="text-sm text-gray-400 ml-2 font-normal">
                              ({innings.overs} ov)
                            </span>
                          </p>
                        )}
                      </div>
                      <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#00FF41]/10 text-[#00FF41] border border-[#00FF41]/30">
                        LIVE
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Finished Matches */}
        {finishedMatches.length > 0 && (
          <section>
            <h2 className="text-xs font-bold text-gray-500 tracking-widest mb-4">RECENT MATCHES</h2>
            <div className="space-y-3">
              {finishedMatches.map((m) => {
                const innings = m.innings[m.currentInningsIndex];
                return (
                  <Link
                    key={m.id}
                    href={`/match/${m.id}`}
                    className="block bg-[#1E293B] rounded-xl p-5 hover:bg-[#1E293B]/80 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-400">
                          {m.teamA} vs {m.teamB}
                        </p>
                        {innings && (
                          <p className="text-xl font-bold text-white mt-1">
                            {innings.totalRuns}
                            <span className="text-gray-500">/{innings.totalWickets}</span>
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">Finished</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Empty state */}
        {!loading && matches.length === 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">{'\uD83C\uDFCF'}</div>
            <h2 className="text-xl font-bold text-white mb-2">No matches yet</h2>
            <p className="text-gray-400 text-sm mb-6">Create your first match to get started.</p>
          </div>
        )}

        {loading && (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-2 border-[#00FF41] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400 text-sm">Loading matches...</p>
          </div>
        )}
      </div>
    </main>
  );
}
