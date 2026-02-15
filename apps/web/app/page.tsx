'use client';

import { useState, useMemo } from 'react';
import {
  calculateInningsStats,
  formatOvers,
  calculateRunRate,
  type Ball,
} from '@crichead/core';

const demoData: Ball[] = [
  // Over 1
  { bowlerId: 'bowler1', strikerId: 'batsman1', runs: 0, extras: null, wicket: null, commentary: 'Dot ball to start' },
  { bowlerId: 'bowler1', strikerId: 'batsman1', runs: 1, extras: null, wicket: null, commentary: 'Single to mid-on' },
  { bowlerId: 'bowler1', strikerId: 'batsman2', runs: 4, extras: null, wicket: null, commentary: 'FOUR! Beautiful cover drive' },
  { bowlerId: 'bowler1', strikerId: 'batsman2', runs: 0, extras: null, wicket: null, commentary: 'Beaten outside off' },
  { bowlerId: 'bowler1', strikerId: 'batsman2', runs: 0, extras: { type: 'wd', runs: 1 }, wicket: null, commentary: 'Wide down leg side' },
  { bowlerId: 'bowler1', strikerId: 'batsman2', runs: 2, extras: null, wicket: null, commentary: 'Turned to leg for two' },
  { bowlerId: 'bowler1', strikerId: 'batsman2', runs: 0, extras: null, wicket: { type: 'caught', fielderId: 'fielder1' }, commentary: 'WICKET! Caught at slip!' },
  // Over 2
  { bowlerId: 'bowler2', strikerId: 'batsman3', runs: 1, extras: null, wicket: null, commentary: 'Quick single' },
  { bowlerId: 'bowler2', strikerId: 'batsman1', runs: 6, extras: null, wicket: null, commentary: 'SIX! Massive hit over long-on!' },
  { bowlerId: 'bowler2', strikerId: 'batsman1', runs: 0, extras: null, wicket: null, commentary: 'Dot ball, good length' },
  { bowlerId: 'bowler2', strikerId: 'batsman1', runs: 1, extras: { type: 'nb', runs: 1 }, wicket: null, commentary: 'No ball! Plus a single' },
  { bowlerId: 'bowler2', strikerId: 'batsman3', runs: 0, extras: { type: 'b', runs: 2 }, wicket: null, commentary: '2 byes, keeper fumbles' },
  { bowlerId: 'bowler2', strikerId: 'batsman3', runs: 4, extras: null, wicket: null, commentary: 'FOUR! Glorious through covers' },
  { bowlerId: 'bowler2', strikerId: 'batsman3', runs: 1, extras: null, wicket: null, commentary: 'Single to end the over' },
];

function getBallDisplay(ball: Ball): string {
  if (ball.wicket) return 'W';
  if (ball.extras?.type === 'wd') return 'WD';
  if (ball.extras?.type === 'nb') return 'NB';
  if (ball.extras?.type === 'b') return `${ball.extras.runs}b`;
  if (ball.extras?.type === 'lb') return `${ball.extras.runs}lb`;
  return ball.runs.toString();
}

function getBallColor(ball: Ball): string {
  if (ball.wicket) return 'bg-red-500 text-white';
  if (ball.runs === 4) return 'bg-[#00FF41] text-[#0F172A]';
  if (ball.runs === 6) return 'bg-yellow-400 text-[#0F172A]';
  if (ball.extras) return 'bg-amber-600 text-white';
  if (ball.runs === 0) return 'bg-[#334155] text-gray-400';
  return 'bg-[#334155] text-white';
}

export default function Home() {
  const [balls, setBalls] = useState<Ball[]>(demoData);

  const stats = useMemo(() => calculateInningsStats(balls), [balls]);
  const oversFormatted = formatOvers(stats.currentOver, stats.currentBall);
  const runRate = calculateRunRate(stats.totalRuns, stats.currentOver, stats.currentBall);

  const handleScore = (runs: number) => {
    const newBall: Ball = {
      bowlerId: 'bowler1',
      strikerId: 'batsman1',
      runs,
      extras: null,
      wicket: null,
      commentary: runs === 0 ? 'Dot ball' : runs === 4 ? 'FOUR!' : runs === 6 ? 'SIX!' : `${runs} run${runs > 1 ? 's' : ''}`,
    };
    setBalls(prev => [...prev, newBall]);
  };

  const handleExtra = (type: 'wd' | 'nb' | 'b' | 'lb') => {
    const labels = { wd: 'Wide', nb: 'No ball', b: 'Byes', lb: 'Leg byes' };
    const newBall: Ball = {
      bowlerId: 'bowler1',
      strikerId: 'batsman1',
      runs: 0,
      extras: { type, runs: 1 },
      wicket: null,
      commentary: labels[type],
    };
    setBalls(prev => [...prev, newBall]);
  };

  const handleWicket = () => {
    const newBall: Ball = {
      bowlerId: 'bowler1',
      strikerId: 'batsman1',
      runs: 0,
      extras: null,
      wicket: { type: 'bowled' },
      commentary: 'WICKET! Bowled!',
    };
    setBalls(prev => [...prev, newBall]);
  };

  const handleUndo = () => {
    setBalls(prev => prev.length > 0 ? prev.slice(0, -1) : prev);
  };

  const handleReset = () => setBalls(demoData);

  // Split balls into overs for display
  const overs: Ball[][] = [];
  let currentOver: Ball[] = [];
  let validBallCount = 0;
  for (const ball of balls) {
    currentOver.push(ball);
    const isExtra = ball.extras?.type === 'wd' || ball.extras?.type === 'nb';
    if (!isExtra) validBallCount++;
    if (validBallCount === 6) {
      overs.push(currentOver);
      currentOver = [];
      validBallCount = 0;
    }
  }
  if (currentOver.length > 0) overs.push(currentOver);

  const fours = balls.filter(b => b.runs === 4 && !b.extras).length;
  const sixes = balls.filter(b => b.runs === 6 && !b.extras).length;

  return (
    <main className="min-h-screen bg-[#0F172A]">
      {/* Header */}
      <header className="border-b border-[#334155] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-[#00FF41] animate-pulse-green" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              cric<span className="text-[#00FF41]">head</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#00FF41]/10 text-[#00FF41] border border-[#00FF41]/30">
              LIVE
            </span>
            <span className="text-xs text-gray-500">T20 Match</span>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Scorecard */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Score Card */}
          <div className="bg-[#1E293B] rounded-2xl p-6 border-l-4 border-[#00FF41]">
            <p className="text-xs font-bold text-[#00FF41] tracking-widest mb-1">INDIA</p>
            <div className="flex items-baseline gap-3">
              <span className="text-7xl font-extrabold text-white tabular-nums">
                {stats.totalRuns}
              </span>
              <span className="text-4xl font-bold text-gray-500">/{stats.totalWickets}</span>
              <span className="text-lg text-gray-400 ml-2">({oversFormatted} ov)</span>
            </div>
            <div className="mt-4 flex gap-8">
              <div>
                <p className="text-[10px] font-semibold text-gray-500 tracking-widest">RUN RATE</p>
                <p className="text-lg font-bold text-[#00FF41]">{runRate.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-500 tracking-widest">BALLS</p>
                <p className="text-lg font-bold text-white">{balls.length}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-500 tracking-widest">BOUNDARIES</p>
                <p className="text-lg font-bold text-white">
                  {fours}<span className="text-gray-500">x4</span>{' '}
                  {sixes}<span className="text-gray-500">x6</span>
                </p>
              </div>
            </div>
          </div>

          {/* Over-by-Over */}
          <div className="bg-[#1E293B] rounded-2xl p-6">
            <h2 className="text-xs font-bold text-gray-500 tracking-widest mb-4">OVER BY OVER</h2>
            <div className="space-y-3">
              {overs.map((over, overIdx) => {
                const overRuns = over.reduce((sum, b) => sum + b.runs + (b.extras?.runs || 0), 0);
                return (
                  <div key={overIdx} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-600 w-10 shrink-0">Ov {overIdx + 1}</span>
                    <div className="flex gap-1.5 flex-1 flex-wrap">
                      {over.map((ball, ballIdx) => (
                        <div
                          key={ballIdx}
                          className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold transition-transform hover:scale-110 cursor-default ${getBallColor(ball)}`}
                          title={ball.commentary || ''}
                        >
                          {getBallDisplay(ball)}
                        </div>
                      ))}
                    </div>
                    <span className="text-sm font-bold text-white w-8 text-right shrink-0">{overRuns}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Commentary */}
          <div className="bg-[#1E293B] rounded-2xl p-6">
            <h2 className="text-xs font-bold text-gray-500 tracking-widest mb-4">LIVE COMMENTARY</h2>
            <div className="space-y-1 max-h-72 overflow-y-auto">
              {[...balls].reverse().slice(0, 12).map((ball, idx) => (
                <div key={idx} className="flex items-center gap-3 py-2.5 border-b border-[#334155]/50 last:border-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${getBallColor(ball)}`}>
                    {getBallDisplay(ball)}
                  </div>
                  <p className="text-sm text-gray-300">{ball.commentary}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Scoring Controls */}
        <div className="space-y-4">
          {/* Quick Score Buttons */}
          <div className="bg-[#1E293B] rounded-2xl p-5">
            <h2 className="text-xs font-bold text-gray-500 tracking-widest mb-3">SCORE RUNS</h2>
            <div className="grid grid-cols-4 gap-2">
              {[0, 1, 2, 3, 4, 5, 6].map(runs => (
                <button
                  key={runs}
                  onClick={() => handleScore(runs)}
                  className={`h-14 rounded-xl font-bold text-lg transition-all duration-150 active:scale-90 hover:brightness-110 ${
                    runs === 4 || runs === 6
                      ? 'bg-[#00FF41] text-[#0F172A]'
                      : runs === 0
                        ? 'bg-[#334155] text-gray-400 hover:text-white'
                        : 'bg-[#334155] text-white'
                  }`}
                >
                  {runs}
                </button>
              ))}
            </div>
          </div>

          {/* Extras */}
          <div className="bg-[#1E293B] rounded-2xl p-5">
            <h2 className="text-xs font-bold text-gray-500 tracking-widest mb-3">EXTRAS</h2>
            <div className="grid grid-cols-4 gap-2">
              {(['wd', 'nb', 'b', 'lb'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => handleExtra(type)}
                  className="h-11 rounded-xl bg-amber-600/15 text-amber-400 border border-amber-600/30 font-bold text-sm hover:bg-amber-600/25 transition-all duration-150 active:scale-90"
                >
                  {type.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Wicket */}
          <button
            onClick={handleWicket}
            className="w-full h-14 rounded-xl bg-red-500/15 text-red-400 border border-red-500/30 font-bold text-base hover:bg-red-500/25 transition-all duration-150 active:scale-90"
          >
            WICKET
          </button>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleUndo}
              disabled={balls.length === 0}
              className="flex-1 h-11 rounded-xl bg-[#334155] text-gray-300 font-semibold text-sm hover:bg-[#334155]/80 transition-all duration-150 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Undo
            </button>
            <button
              onClick={handleReset}
              className="flex-1 h-11 rounded-xl bg-[#334155] text-gray-300 font-semibold text-sm hover:bg-[#334155]/80 transition-all duration-150 active:scale-95"
            >
              Reset Demo
            </button>
          </div>

          {/* Match Info Card */}
          <div className="bg-[#1E293B] rounded-2xl p-5 mt-2">
            <h2 className="text-xs font-bold text-gray-500 tracking-widest mb-3">MATCH INFO</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Format</span>
                <span className="text-white font-medium">T20</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Extras</span>
                <span className="text-amber-400 font-medium">
                  {balls.filter(b => b.extras).reduce((sum, b) => sum + (b.extras?.runs || 0), 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Dot Balls</span>
                <span className="text-white font-medium">
                  {balls.filter(b => b.runs === 0 && !b.extras && !b.wicket).length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
