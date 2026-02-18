'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import {
  useMatchSync,
  parseOvers,
  calculateRunRate,
  formatOvers,
  formatBallDisplay,
  splitBallsIntoOvers,
  type Ball,
  type FirestoreInningsSummary,
} from '@crichead/core';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getBallColor(ball: Ball): string {
  if (ball.wicket) return 'bg-red-500 text-white';
  if (ball.runs === 4 && !ball.extras) return 'bg-[#00FF41] text-[#0F172A]';
  if (ball.runs === 6 && !ball.extras) return 'bg-yellow-400 text-[#0F172A]';
  if (ball.extras) return 'bg-amber-600 text-white';
  if (ball.runs === 0) return 'bg-[#334155] text-gray-400';
  return 'bg-[#334155] text-white';
}

function getStatsFromSummary(summary: FirestoreInningsSummary) {
  const { currentOver, currentBall } = parseOvers(summary.overs);
  const runRate = calculateRunRate(summary.totalRuns, currentOver, currentBall);
  const oversFormatted = formatOvers(currentOver, currentBall);
  return { ...summary, currentOver, currentBall, runRate, oversFormatted };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MatchPage() {
  const params = useParams();
  const matchId = typeof params.id === 'string' ? params.id : null;

  const {
    match,
    currentInningsBalls: balls,
    loading,
    error,
  } = useMatchSync(matchId, { subscribeToBalls: true });

  const currentInnings = match?.innings[match.currentInningsIndex] ?? null;

  const stats = useMemo(() => {
    if (!currentInnings) return null;
    return getStatsFromSummary(currentInnings);
  }, [currentInnings]);

  const overs = useMemo(() => splitBallsIntoOvers(balls), [balls]);

  const fours = balls.filter(b => b.runs === 4 && !b.extras).length;
  const sixes = balls.filter(b => b.runs === 6 && !b.extras).length;
  const dots = balls.filter(b => b.runs === 0 && !b.extras && !b.wicket).length;
  const extras = balls.filter(b => b.extras).reduce((sum, b) => sum + (b.extras?.runs ?? 0), 0);

  // ---- Loading ----
  if (loading) {
    return (
      <main className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#00FF41] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Connecting to match...</p>
        </div>
      </main>
    );
  }

  // ---- Error / Not Found ----
  if (error || !match || !stats) {
    return (
      <main className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">🏏</div>
          <h1 className="text-xl font-bold text-white mb-2">
            {error ? 'Connection Error' : 'Match Not Found'}
          </h1>
          <p className="text-gray-400 text-sm mb-6">
            {error?.message ?? `No match found with ID "${matchId}"`}
          </p>
          <a
            href="/"
            className="inline-block px-6 py-2 rounded-lg bg-[#00FF41]/10 text-[#00FF41] border border-[#00FF41]/30 text-sm font-semibold hover:bg-[#00FF41]/20 transition-colors"
          >
            Back to Home
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0F172A]">
      {/* Header */}
      <header className="border-b border-[#334155] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="w-3 h-3 rounded-full bg-[#00FF41] animate-pulse-green" />
              <h1 className="text-xl font-bold text-white tracking-tight">
                cric<span className="text-[#00FF41]">head</span>
              </h1>
            </a>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${
              match.status === 'live'
                ? 'bg-[#00FF41]/10 text-[#00FF41] border-[#00FF41]/30'
                : match.status === 'finished'
                  ? 'bg-gray-500/10 text-gray-400 border-gray-500/30'
                  : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
            }`}>
              {match.status.toUpperCase()}
            </span>
            <span className="text-xs text-gray-500 font-mono">{matchId}</span>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Scorecard */}
        <div className="bg-[#1E293B] rounded-2xl p-6 border-l-4 border-[#00FF41]">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-bold text-[#00FF41] tracking-widest">
              {match.teamA.toUpperCase()}
            </p>
            <p className="text-[10px] text-gray-500">
              vs {match.teamB}
            </p>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="text-7xl font-extrabold text-white tabular-nums">
              {stats.totalRuns}
            </span>
            <span className="text-4xl font-bold text-gray-500">/{stats.totalWickets}</span>
            <span className="text-lg text-gray-400 ml-2">({stats.oversFormatted} ov)</span>
          </div>

          <div className="mt-4 flex gap-8 flex-wrap">
            <div>
              <p className="text-[10px] font-semibold text-gray-500 tracking-widest">RUN RATE</p>
              <p className="text-lg font-bold text-[#00FF41]">{stats.runRate.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-500 tracking-widest">BOUNDARIES</p>
              <p className="text-lg font-bold text-white">
                {fours}<span className="text-gray-500">x4</span>{' '}
                {sixes}<span className="text-gray-500">x6</span>
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-500 tracking-widest">DOT BALLS</p>
              <p className="text-lg font-bold text-white">{dots}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-500 tracking-widest">EXTRAS</p>
              <p className="text-lg font-bold text-amber-400">{extras}</p>
            </div>
          </div>
        </div>

        {/* All Innings Summaries (if multiple) */}
        {match.innings.length > 1 && (
          <div className="grid grid-cols-2 gap-4">
            {match.innings.map((inn, idx) => {
              const innStats = getStatsFromSummary(inn);
              const isActive = idx === match.currentInningsIndex;
              return (
                <div
                  key={idx}
                  className={`bg-[#1E293B] rounded-xl p-4 ${
                    isActive ? 'border border-[#00FF41]/40' : 'opacity-60'
                  }`}
                >
                  <p className="text-xs font-bold text-gray-400 tracking-wider mb-1">
                    {idx === 0 ? match.teamA : match.teamB}
                    {isActive && <span className="text-[#00FF41] ml-2">BATTING</span>}
                  </p>
                  <p className="text-2xl font-extrabold text-white">
                    {inn.totalRuns}<span className="text-gray-500">/{inn.totalWickets}</span>
                    <span className="text-sm text-gray-400 ml-2">({innStats.oversFormatted} ov)</span>
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Over by Over */}
        <div className="bg-[#1E293B] rounded-2xl p-6">
          <h2 className="text-xs font-bold text-gray-500 tracking-widest mb-4">OVER BY OVER</h2>
          {overs.length === 0 ? (
            <p className="text-sm text-gray-500 italic">Waiting for first delivery...</p>
          ) : (
            <div className="space-y-3">
              {overs.map((over, overIdx) => {
                const overRuns = over.reduce(
                  (sum, b) => sum + b.runs + (b.extras?.runs ?? 0),
                  0
                );
                return (
                  <div key={overIdx} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-600 w-10 shrink-0">
                      Ov {overIdx + 1}
                    </span>
                    <div className="flex gap-1.5 flex-1 flex-wrap">
                      {over.map((ball, ballIdx) => (
                        <div
                          key={ballIdx}
                          className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold transition-transform hover:scale-110 cursor-default ${getBallColor(ball)}`}
                          title={ball.commentary ?? ''}
                        >
                          {formatBallDisplay(ball)}
                        </div>
                      ))}
                    </div>
                    <span className="text-sm font-bold text-white w-8 text-right shrink-0">
                      {overRuns}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Live Commentary */}
        <div className="bg-[#1E293B] rounded-2xl p-6">
          <h2 className="text-xs font-bold text-gray-500 tracking-widest mb-4">LIVE COMMENTARY</h2>
          {balls.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No deliveries yet...</p>
          ) : (
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {[...balls]
                .reverse()
                .slice(0, 20)
                .map((ball, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 py-2.5 border-b border-[#334155]/50 last:border-0"
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${getBallColor(ball)}`}
                    >
                      {formatBallDisplay(ball)}
                    </div>
                    <p className="text-sm text-gray-300">{ball.commentary}</p>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-xs text-gray-600">
            Live scorecard powered by <span className="text-[#00FF41]">crichead</span> &middot; Updates in real-time via Firebase
          </p>
        </div>
      </div>
    </main>
  );
}
