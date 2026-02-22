'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  useMatchSync,
  useScoringEngine,
  formatBallDisplay,
  splitBallsIntoOvers,
  EventSchema,
  type PlayingXIEntry,
  createScoreEvent,
  createExtraEvent,
  createWicketEvent,
  createPenaltyEvent,
} from '@crichead/core';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PickerMode = 'striker' | 'nonStriker' | 'bowler' | null;
type ExtraType = 'wd' | 'nb' | 'b' | 'lb';

// ---------------------------------------------------------------------------
// Ball color helper (Tailwind classes — web only)
// ---------------------------------------------------------------------------

function getBallColor(ball: EventSchema.BallEvent): string {
  if (ball.wicket) return 'bg-red-500 text-white';
  if (ball.runs.bat === 4 && ball.runs.extra === 0) return 'bg-[#00FF41] text-[#0F172A]';
  if (ball.runs.bat === 6 && ball.runs.extra === 0) return 'bg-yellow-400 text-[#0F172A]';
  if (ball.runs.extra > 0) return 'bg-amber-600 text-white';
  if (ball.runs.bat === 0 && ball.runs.extra === 0 && ball.runs.penalty === 0) return 'bg-[#334155] text-gray-400';
  return 'bg-[#334155] text-white';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ScorePage() {
  const params = useParams();
  const matchId = typeof params.id === 'string' ? params.id : null;

  const {
    match,
    currentInningsBalls: firestoreBalls,
    loading,
    error,
    addBallToMatch,
  } = useMatchSync(matchId, { subscribeToBalls: true });

  // ---- Optimistic updates ----
  const [optimisticBalls, setOptimisticBalls] = useState<EventSchema.BallEvent[]>([]);

  // ---- Player state ----
  const [strikerId, setStrikerId] = useState<string | null>(null);
  const [nonStrikerId, setNonStrikerId] = useState<string | null>(null);
  const [bowlerId, setBowlerId] = useState<string | null>(null);
  const [pickerMode, setPickerMode] = useState<PickerMode>('striker');

  // ---- Reconcile optimistic balls ----
  const prevFirestoreLenRef = useRef(firestoreBalls.length);

  const balls = useMemo(() => {
    const newlyConfirmed = Math.max(0, firestoreBalls.length - prevFirestoreLenRef.current);
    const pendingOptimistic = optimisticBalls.slice(newlyConfirmed);
    return [...firestoreBalls, ...pendingOptimistic];
  }, [firestoreBalls, optimisticBalls]);

  const engineState = useScoringEngine({
    balls,
    config: match,
    match,
    isLiveMode: true,
    localCurrentInningsIndex: 0,
    localFirstInningsRuns: null,
    strikerId,
    nonStrikerId,
    bowlerId,
  });

  const {
    stats,
    currentOverFormatted,
    runRate,
    maxOvers,
    maxWickets,
    isInningsComplete,
    playersReady,
    allOut,
    allOversCompleted,
    isMatchFinished,
    allPlayers,
    availableBatsmen,
    availableBowlers,
    getPlayerName,
    currentOverBalls,
  } = engineState;

  const batsmenStatsMap = stats.batterStats;
  const bowlerStatsMap = stats.bowlerStats;
  const inputDisabled = isInningsComplete || !playersReady || pickerMode !== null;

  // ---- Over-change / wicket detection ----
  const prevBallsLenRef = useRef(balls.length);
  const prevOverRef = useRef(stats.currentOver);
  const prevWicketsRef = useRef(stats.totalWickets);
  const strikerIdRef = useRef(strikerId);
  const nonStrikerIdRef = useRef(nonStrikerId);
  strikerIdRef.current = strikerId;
  nonStrikerIdRef.current = nonStrikerId;

  useEffect(() => {
    const prevLen = prevBallsLenRef.current;
    if (balls.length < prevLen) {
      prevBallsLenRef.current = balls.length;
      prevOverRef.current = stats.currentOver;
      prevWicketsRef.current = stats.totalWickets;
      return;
    }
    if (balls.length === prevLen) return;

    const prevOver = prevOverRef.current;
    const prevWickets = prevWicketsRef.current;
    prevBallsLenRef.current = balls.length;
    prevOverRef.current = stats.currentOver;
    prevWicketsRef.current = stats.totalWickets;

    const overChanged = stats.currentOver > prevOver;
    const wicketFell = stats.totalWickets > prevWickets;

    if (wicketFell && overChanged) {
      setStrikerId(null);
      setBowlerId(null);
      setTimeout(() => setPickerMode('striker'), 300);
    } else if (wicketFell) {
      setStrikerId(null);
      setTimeout(() => setPickerMode('striker'), 300);
    } else if (overChanged) {
      setStrikerId(nonStrikerIdRef.current);
      setNonStrikerId(strikerIdRef.current);
      setBowlerId(null);
      setTimeout(() => setPickerMode('bowler'), 300);
    }
  }, [balls.length, stats]);

  // ---- Reconcile optimistic balls ----
  useEffect(() => {
    if (firestoreBalls.length > prevFirestoreLenRef.current) {
      const newBallsCount = firestoreBalls.length - prevFirestoreLenRef.current;
      setOptimisticBalls((prev) => prev.slice(newBallsCount));
    }
    prevFirestoreLenRef.current = firestoreBalls.length;
  }, [firestoreBalls.length]);

  // ---- Handlers ----
  const addBall = useCallback(
    async (ball: EventSchema.BallEvent) => {
      setOptimisticBalls((prev) => [...prev, ball]);
      try {
        await addBallToMatch(ball);
      } catch {
        setOptimisticBalls((prev) => {
          const idx = prev.indexOf(ball);
          if (idx !== -1) {
            const next = [...prev];
            next.splice(idx, 1);
            return next;
          }
          return prev;
        });
        alert('Failed to save ball. Please try again.');
      }
    },
    [addBallToMatch]
  );

  const handleScore = useCallback(
    (runs: number) => {
      if (!strikerId || !bowlerId) return;
      const newBall = createScoreEvent({
        matchId: matchId!,
        inningsId: String(match?.currentInningsIndex ?? 0),
        bowlerId,
        strikerId,
        nonStrikerId: nonStrikerId || 'unknown',
      }, runs);
      addBall(newBall);
      if (runs % 2 === 1) {
        const prev = strikerId;
        setStrikerId(nonStrikerId);
        setNonStrikerId(prev);
      }
    },
    [addBall, strikerId, nonStrikerId, bowlerId]
  );

  const handleExtra = useCallback(
    (type: ExtraType) => {
      if (!strikerId || !bowlerId) return;
      const newBall = createExtraEvent({
        matchId: matchId!,
        inningsId: String(match?.currentInningsIndex ?? 0),
        bowlerId,
        strikerId,
        nonStrikerId: nonStrikerId || 'unknown',
      }, type as any);
      addBall(newBall);
    },
    [addBall, strikerId, bowlerId]
  );

  const handleWicket = useCallback(() => {
    if (!strikerId || !bowlerId) return;
    const newBall = createWicketEvent({
      matchId: matchId!,
      inningsId: String(match?.currentInningsIndex ?? 0),
      bowlerId,
      strikerId,
      nonStrikerId: nonStrikerId || 'unknown',
    }, strikerId);
    addBall(newBall);
  }, [addBall, strikerId, bowlerId, getPlayerName]);

  const handlePenalty = useCallback(() => {
    if (!strikerId || !bowlerId) return;
    if (!confirm('Add 5 penalty runs?')) return;
    const newBall = createPenaltyEvent({
      matchId: matchId!,
      inningsId: String(match?.currentInningsIndex ?? 0),
      bowlerId,
      strikerId,
      nonStrikerId: nonStrikerId || 'unknown',
    }, 5);
    addBall(newBall);
  }, [addBall, strikerId, bowlerId]);

  const handleUndo = useCallback(() => {
    if (optimisticBalls.length > 0) {
      setOptimisticBalls((prev) => prev.slice(0, -1));
    }
  }, [optimisticBalls.length]);

  const handlePickPlayer = useCallback(
    (playerId: string) => {
      if (pickerMode === 'striker') {
        setStrikerId(playerId);
        if (!nonStrikerId) setTimeout(() => setPickerMode('nonStriker'), 100);
        else if (!bowlerId) setTimeout(() => setPickerMode('bowler'), 100);
        else setPickerMode(null);
      } else if (pickerMode === 'nonStriker') {
        setNonStrikerId(playerId);
        if (!bowlerId) setTimeout(() => setPickerMode('bowler'), 100);
        else setPickerMode(null);
      } else if (pickerMode === 'bowler') {
        setBowlerId(playerId);
        setPickerMode(null);
      }
    },
    [pickerMode, nonStrikerId, bowlerId]
  );

  // ---- Overs display ----
  const overs = useMemo(() => splitBallsIntoOvers(balls), [balls]);

  // ---- Loading / Error ----
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

  if (error || !match) {
    return (
      <main className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-xl font-bold text-white mb-2">
            {error ? 'Connection Error' : 'Match Not Found'}
          </h1>
          <p className="text-gray-400 text-sm mb-6">
            {error?.message ?? `No match found with ID "${matchId}"`}
          </p>
          <a href="/" className="inline-block px-6 py-2 rounded-lg bg-[#00FF41]/10 text-[#00FF41] border border-[#00FF41]/30 text-sm font-semibold hover:bg-[#00FF41]/20 transition-colors">
            Back to Home
          </a>
        </div>
      </main>
    );
  }

  // ---- Picker candidates ----
  const pickerCandidates =
    pickerMode === 'bowler'
      ? availableBowlers
      : pickerMode === 'striker' || pickerMode === 'nonStriker'
        ? availableBatsmen
        : [];

  const pickerTitle =
    pickerMode === 'striker'
      ? 'Select Striker'
      : pickerMode === 'nonStriker'
        ? 'Select Non-Striker'
        : pickerMode === 'bowler'
          ? 'Select Bowler'
          : '';

  // ---- Render ----
  return (
    <main className="min-h-screen bg-[#0F172A]">
      {/* Header */}
      <header className="border-b border-[#334155] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-3 h-3 rounded-full bg-[#00FF41] animate-pulse" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              cric<span className="text-[#00FF41]">head</span>
            </h1>
          </a>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#00FF41]/10 text-[#00FF41] border border-[#00FF41]/30">
              LIVE
            </span>
            <a href={`/match/${matchId}`} className="text-xs text-gray-400 hover:text-white transition-colors">
              Viewer
            </a>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column — Score + Overs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Scorecard */}
          <div className="bg-[#1E293B] rounded-2xl p-6 border-l-4 border-[#00FF41]">
            <p className="text-xs font-bold text-[#00FF41] tracking-widest mb-1">
              {match.teamA.toUpperCase()} vs {match.teamB.toUpperCase()}
            </p>
            <div className="flex items-baseline gap-3">
              <span className="text-7xl font-extrabold text-white tabular-nums">{stats.totalRuns}</span>
              <span className="text-4xl font-bold text-gray-500">/{stats.totalWickets}</span>
              <span className="text-lg text-gray-400 ml-2">({currentOverFormatted} ov)</span>
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
            </div>
          </div>

          {/* Players */}
          <div className="bg-[#1E293B] rounded-2xl p-6">
            <h2 className="text-xs font-bold text-gray-500 tracking-widest mb-4">ON FIELD</h2>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setPickerMode('striker')}
                className={`p-3 rounded-xl text-center transition-all ${
                  pickerMode === 'striker'
                    ? 'bg-[#00FF41]/10 border-2 border-[#00FF41]'
                    : 'bg-[#334155] border-2 border-transparent hover:border-gray-600'
                }`}
              >
                <p className="text-[10px] text-gray-500 font-semibold tracking-widest mb-1">STRIKER</p>
                <p className="text-sm font-bold text-white truncate">{getPlayerName(strikerId)}</p>
                {strikerId && batsmenStatsMap[strikerId] && (
                  <p className="text-xs text-gray-400 mt-1">
                    {batsmenStatsMap[strikerId]!.runs} ({batsmenStatsMap[strikerId]!.ballsFaced})
                  </p>
                )}
              </button>
              <button
                onClick={() => setPickerMode('nonStriker')}
                className={`p-3 rounded-xl text-center transition-all ${
                  pickerMode === 'nonStriker'
                    ? 'bg-[#00FF41]/10 border-2 border-[#00FF41]'
                    : 'bg-[#334155] border-2 border-transparent hover:border-gray-600'
                }`}
              >
                <p className="text-[10px] text-gray-500 font-semibold tracking-widest mb-1">NON-STRIKER</p>
                <p className="text-sm font-bold text-white truncate">{getPlayerName(nonStrikerId)}</p>
                {nonStrikerId && batsmenStatsMap[nonStrikerId] && (
                  <p className="text-xs text-gray-400 mt-1">
                    {batsmenStatsMap[nonStrikerId]!.runs} ({batsmenStatsMap[nonStrikerId]!.ballsFaced})
                  </p>
                )}
              </button>
              <button
                onClick={() => setPickerMode('bowler')}
                className={`p-3 rounded-xl text-center transition-all ${
                  pickerMode === 'bowler'
                    ? 'bg-[#00FF41]/10 border-2 border-[#00FF41]'
                    : 'bg-[#334155] border-2 border-transparent hover:border-gray-600'
                }`}
              >
                <p className="text-[10px] text-gray-500 font-semibold tracking-widest mb-1">BOWLER</p>
                <p className="text-sm font-bold text-white truncate">{getPlayerName(bowlerId)}</p>
                {bowlerId && bowlerStatsMap[bowlerId] && (
                  <p className="text-xs text-gray-400 mt-1">
                    {bowlerStatsMap[bowlerId]!.runs}-{bowlerStatsMap[bowlerId]!.wickets}
                  </p>
                )}
              </button>
            </div>
          </div>

          {/* This Over */}
          <div className="bg-[#1E293B] rounded-2xl p-6">
            <h2 className="text-xs font-bold text-gray-500 tracking-widest mb-4">
              THIS OVER ({stats.currentBall}/6)
            </h2>
            <div className="flex gap-1.5 flex-wrap">
              {currentOverBalls.map((ball, i) => (
                <div
                  key={i}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold ${getBallColor(ball)}`}
                >
                  {formatBallDisplay(ball)}
                </div>
              ))}
              {currentOverBalls.length === 0 && (
                <p className="text-sm text-gray-500 italic">New over</p>
              )}
            </div>
          </div>

          {/* Over by Over */}
          <div className="bg-[#1E293B] rounded-2xl p-6">
            <h2 className="text-xs font-bold text-gray-500 tracking-widest mb-4">OVER BY OVER</h2>
            {overs.length === 0 ? (
              <p className="text-sm text-gray-500 italic">Waiting for first delivery...</p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {overs.map((over, overIdx) => {
                  const overRuns = over.reduce((sum, b) => sum + b.runs.bat + b.runs.extra + b.runs.penalty, 0);
                  return (
                    <div key={overIdx} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-gray-600 w-10 shrink-0">Ov {overIdx + 1}</span>
                      <div className="flex gap-1.5 flex-1 flex-wrap">
                        {over.map((ball, ballIdx) => (
                          <div
                            key={ballIdx}
                            className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold ${getBallColor(ball)}`}
                          >
                            {formatBallDisplay(ball)}
                          </div>
                        ))}
                      </div>
                      <span className="text-sm font-bold text-white w-8 text-right shrink-0">{overRuns}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column — Controls */}
        <div className="space-y-4">
          {/* Player Picker */}
          {pickerMode && (
            <div className="bg-[#1E293B] rounded-2xl p-5">
              <h2 className="text-xs font-bold text-[#00FF41] tracking-widest mb-3">{pickerTitle.toUpperCase()}</h2>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {pickerCandidates.map((p: any) => (
                  <button
                    key={p.id}
                    onClick={() => handlePickPlayer(p.id)}
                    className="w-full flex items-center justify-between p-3 rounded-lg bg-[#334155] hover:bg-[#334155]/80 transition-all"
                  >
                    <span className="text-white font-medium">{p.name}</span>
                    <span className="text-xs text-gray-400 uppercase">{p.role}</span>
                  </button>
                ))}
                {pickerCandidates.length === 0 && (
                  <p className="text-sm text-gray-500 italic">No players available</p>
                )}
              </div>
              <button
                onClick={() => setPickerMode(null)}
                className="mt-3 w-full py-2 rounded-lg bg-[#334155] text-gray-400 text-sm hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Score Buttons */}
          <div className="bg-[#1E293B] rounded-2xl p-5">
            <h2 className="text-xs font-bold text-gray-500 tracking-widest mb-3">SCORE RUNS</h2>
            <div className="grid grid-cols-4 gap-2">
              {[0, 1, 2, 3, 4, 5, 6].map((runs) => (
                <button
                  key={runs}
                  onClick={() => handleScore(runs)}
                  disabled={inputDisabled}
                  className={`h-14 rounded-xl font-bold text-lg transition-all duration-150 active:scale-90 hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed ${
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
              {(['wd', 'nb', 'b', 'lb'] as ExtraType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => handleExtra(type)}
                  disabled={inputDisabled}
                  className="h-11 rounded-xl bg-amber-600/15 text-amber-400 border border-amber-600/30 font-bold text-sm hover:bg-amber-600/25 transition-all duration-150 active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {type.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Wicket + Penalty */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleWicket}
              disabled={inputDisabled}
              className="h-14 rounded-xl bg-red-500/15 text-red-400 border border-red-500/30 font-bold text-base hover:bg-red-500/25 transition-all duration-150 active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              WICKET
            </button>
            <button
              onClick={handlePenalty}
              disabled={inputDisabled}
              className="h-14 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30 font-bold text-base hover:bg-purple-500/25 transition-all duration-150 active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              PENALTY
            </button>
          </div>

          {/* Undo */}
          <button
            onClick={handleUndo}
            disabled={optimisticBalls.length === 0}
            className="w-full h-11 rounded-xl bg-[#334155] text-gray-300 font-semibold text-sm hover:bg-[#334155]/80 transition-all duration-150 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Undo
          </button>

          {/* Innings Complete Banner */}
          {isInningsComplete && (
            <div className="bg-[#00FF41]/10 border border-[#00FF41]/30 rounded-xl p-4 text-center">
              <p className="text-[#00FF41] font-bold">Innings Complete</p>
              <p className="text-sm text-gray-400 mt-1">
                {allOut ? 'All out' : allOversCompleted ? 'Overs completed' : 'Match finished'}
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
