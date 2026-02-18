'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  type MatchFormat,
  type MatchConfig,
  type TossDecision,
  type Toss,
  type PlayerRole,
} from '@crichead/core';
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TeamInfo {
  id: string;
  name: string;
  logoUrl: string;
  homeGround: string;
}

interface PlayerDoc {
  id: string;
  name: string;
  role: PlayerRole;
}

type Step = 'details' | 'teams' | 'toss' | 'roster';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FORMAT_OPTIONS: {
  key: MatchFormat;
  label: string;
  icon: string;
  defaultOvers: number;
}[] = [
  { key: 't20', label: 'T20', icon: '\u26A1', defaultOvers: 20 },
  { key: 'odi', label: 'ODI', icon: '\u23F0', defaultOvers: 50 },
  { key: 'test', label: 'Test', icon: '\uD83C\uDFDB\uFE0F', defaultOvers: 0 },
  { key: 'custom', label: 'Custom', icon: '\u2699\uFE0F', defaultOvers: 20 },
];

const ROLE_LABELS: Record<PlayerRole, string> = {
  bat: 'BAT',
  bowl: 'BOWL',
  all: 'ALL',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NewMatchPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('details');
  const [creating, setCreating] = useState(false);

  // Step 1: Match Details
  const [format, setFormat] = useState<MatchFormat>('t20');
  const [overs, setOvers] = useState(20);
  const [venue, setVenue] = useState('');

  // Step 2: Teams
  const [teams, setTeams] = useState<TeamInfo[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [selectedA, setSelectedA] = useState<string | null>(null);
  const [selectedB, setSelectedB] = useState<string | null>(null);

  // Step 3: Toss
  const [tossWinner, setTossWinner] = useState<string | null>(null);
  const [tossDecision, setTossDecision] = useState<TossDecision | null>(null);

  // Step 4: Roster
  const [playersA, setPlayersA] = useState<PlayerDoc[]>([]);
  const [playersB, setPlayersB] = useState<PlayerDoc[]>([]);
  const [rosterA, setRosterA] = useState<Set<string>>(new Set());
  const [rosterB, setRosterB] = useState<Set<string>>(new Set());
  const [rosterTab, setRosterTab] = useState<'A' | 'B'>('A');

  // Load teams
  useEffect(() => {
    const db = getFirestore();
    const q = query(collection(db, 'teams'), orderBy('name'));
    const unsub = onSnapshot(q, (snap) => {
      const list: TeamInfo[] = snap.docs.map((d) => ({
        id: d.id,
        name: d.data().name ?? '',
        logoUrl: d.data().logoUrl ?? '',
        homeGround: d.data().homeGround ?? '',
      }));
      setTeams(list);
      setTeamsLoading(false);
    });
    return unsub;
  }, []);

  // Load players when teams are selected and we're on roster step
  useEffect(() => {
    if (step !== 'roster' || !selectedA || !selectedB) return;
    const db = getFirestore();
    const unsubA = onSnapshot(collection(db, `teams/${selectedA}/players`), (snap) => {
      setPlayersA(snap.docs.map((d) => ({ id: d.id, name: d.data().name, role: d.data().role })));
    });
    const unsubB = onSnapshot(collection(db, `teams/${selectedB}/players`), (snap) => {
      setPlayersB(snap.docs.map((d) => ({ id: d.id, name: d.data().name, role: d.data().role })));
    });
    return () => { unsubA(); unsubB(); };
  }, [step, selectedA, selectedB]);

  const teamA = teams.find((t) => t.id === selectedA) ?? null;
  const teamB = teams.find((t) => t.id === selectedB) ?? null;

  function handleFormatSelect(f: MatchFormat) {
    setFormat(f);
    const opt = FORMAT_OPTIONS.find((o) => o.key === f);
    if (opt) setOvers(opt.defaultOvers);
  }

  function handleTeamToggle(teamId: string) {
    if (selectedA === teamId) { setSelectedA(null); return; }
    if (selectedB === teamId) { setSelectedB(null); return; }
    if (!selectedA) { setSelectedA(teamId); return; }
    if (!selectedB) { setSelectedB(teamId); return; }
  }

  function toggleRoster(set: Set<string>, setFn: (s: Set<string>) => void, id: string) {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else if (next.size < 11) next.add(id);
    setFn(next);
  }

  async function handleCreate() {
    if (!teamA || !teamB || !tossWinner || !tossDecision) return;
    setCreating(true);
    try {
      const toss: Toss = { winner: tossWinner, decision: tossDecision };
      const battingFirst = tossDecision === 'bat' ? tossWinner : (tossWinner === teamA.id ? teamB.id : teamA.id);
      const db = getFirestore();

      const matchDoc = {
        teamA: teamA.id,
        teamB: teamB.id,
        toss,
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
          [teamA.id]: playersA.filter((p) => rosterA.has(p.id)).map((p) => ({ id: p.id, name: p.name, role: p.role })),
          [teamB.id]: playersB.filter((p) => rosterB.has(p.id)).map((p) => ({ id: p.id, name: p.name, role: p.role })),
        },
        oversPerInnings: overs,
        playersPerSide: Math.max(rosterA.size, rosterB.size),
      };

      const ref = await addDoc(collection(db, 'matches'), matchDoc);
      router.push(`/matches/${ref.id}/score`);
    } catch (err) {
      console.error('Failed to create match:', err);
      setCreating(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const stepIndex = ['details', 'teams', 'toss', 'roster'].indexOf(step);

  function renderStepIndicator() {
    const steps = ['Details', 'Teams', 'Toss', 'Roster'];
    return (
      <div className="flex items-center gap-2 mb-8">
        {steps.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              i <= stepIndex ? 'bg-[#00FF41] text-[#0F172A]' : 'bg-[#334155] text-gray-400'
            }`}>
              {i + 1}
            </div>
            <span className={`text-sm font-medium ${i <= stepIndex ? 'text-white' : 'text-gray-500'}`}>
              {label}
            </span>
            {i < steps.length - 1 && <div className="w-8 h-px bg-[#334155]" />}
          </div>
        ))}
      </div>
    );
  }

  function renderDetails() {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-xs font-bold text-gray-500 tracking-widest mb-3">FORMAT</h3>
          <div className="grid grid-cols-4 gap-3">
            {FORMAT_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => handleFormatSelect(opt.key)}
                className={`p-4 rounded-xl text-center transition-all ${
                  format === opt.key
                    ? 'bg-[#00FF41]/10 border-2 border-[#00FF41] text-[#00FF41]'
                    : 'bg-[#334155] border-2 border-transparent text-gray-300 hover:border-gray-600'
                }`}
              >
                <div className="text-2xl mb-1">{opt.icon}</div>
                <div className="text-sm font-bold">{opt.label}</div>
              </button>
            ))}
          </div>
        </div>

        {format !== 'test' && (
          <div>
            <h3 className="text-xs font-bold text-gray-500 tracking-widest mb-3">OVERS PER INNINGS</h3>
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
        )}

        <div>
          <h3 className="text-xs font-bold text-gray-500 tracking-widest mb-3">VENUE (OPTIONAL)</h3>
          <input
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            placeholder="Enter venue name..."
            className="w-full px-4 py-3 rounded-xl bg-[#334155] text-white placeholder-gray-500 border border-transparent focus:border-[#00FF41] focus:outline-none"
          />
        </div>

        <button
          onClick={() => setStep('teams')}
          className="w-full py-3 rounded-xl bg-[#00FF41] text-[#0F172A] font-bold text-lg hover:brightness-110 transition-all"
        >
          Next: Select Teams
        </button>
      </div>
    );
  }

  function renderTeams() {
    if (teamsLoading) {
      return <p className="text-gray-400">Loading teams...</p>;
    }
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-xs font-bold text-gray-500 tracking-widest mb-3">SELECT TWO TEAMS</h3>
          {teams.length === 0 ? (
            <p className="text-gray-400 text-sm">No teams found. Create teams in the Teams page first.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {teams.map((team) => {
                const isA = selectedA === team.id;
                const isB = selectedB === team.id;
                const isSelected = isA || isB;
                return (
                  <button
                    key={team.id}
                    onClick={() => handleTeamToggle(team.id)}
                    className={`p-4 rounded-xl text-left transition-all ${
                      isSelected
                        ? 'bg-[#00FF41]/10 border-2 border-[#00FF41]'
                        : 'bg-[#334155] border-2 border-transparent hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                        isSelected ? 'bg-[#00FF41] text-[#0F172A]' : 'bg-[#475569] text-white'
                      }`}>
                        {team.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className={`font-bold ${isSelected ? 'text-[#00FF41]' : 'text-white'}`}>{team.name}</p>
                        {isA && <span className="text-xs text-[#00FF41]">Team A</span>}
                        {isB && <span className="text-xs text-[#00FF41]">Team B</span>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setStep('details')}
            className="flex-1 py-3 rounded-xl bg-[#334155] text-gray-300 font-bold hover:bg-[#334155]/80 transition-all"
          >
            Back
          </button>
          <button
            onClick={() => setStep('toss')}
            disabled={!selectedA || !selectedB}
            className="flex-1 py-3 rounded-xl bg-[#00FF41] text-[#0F172A] font-bold hover:brightness-110 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next: Toss
          </button>
        </div>
      </div>
    );
  }

  function renderToss() {
    if (!teamA || !teamB) return null;
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-xs font-bold text-gray-500 tracking-widest mb-3">WHO WON THE TOSS?</h3>
          <div className="grid grid-cols-2 gap-3">
            {[teamA, teamB].map((team) => (
              <button
                key={team.id}
                onClick={() => setTossWinner(team.id)}
                className={`p-4 rounded-xl text-center font-bold transition-all ${
                  tossWinner === team.id
                    ? 'bg-[#00FF41]/10 border-2 border-[#00FF41] text-[#00FF41]'
                    : 'bg-[#334155] border-2 border-transparent text-gray-300 hover:border-gray-600'
                }`}
              >
                {team.name}
              </button>
            ))}
          </div>
        </div>

        {tossWinner && (
          <div>
            <h3 className="text-xs font-bold text-gray-500 tracking-widest mb-3">ELECTED TO</h3>
            <div className="grid grid-cols-2 gap-3">
              {(['bat', 'bowl'] as TossDecision[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setTossDecision(d)}
                  className={`p-4 rounded-xl text-center font-bold transition-all ${
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

        {tossWinner && tossDecision && (
          <div className="bg-[#1E293B] rounded-xl p-4 border border-[#334155]">
            <p className="text-sm text-gray-400">
              <span className="text-white font-bold">
                {tossWinner === teamA.id ? teamA.name : teamB.name}
              </span>{' '}
              won the toss and elected to{' '}
              <span className="text-[#00FF41] font-bold">{tossDecision}</span> first.
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => setStep('teams')}
            className="flex-1 py-3 rounded-xl bg-[#334155] text-gray-300 font-bold hover:bg-[#334155]/80 transition-all"
          >
            Back
          </button>
          <button
            onClick={() => setStep('roster')}
            disabled={!tossWinner || !tossDecision}
            className="flex-1 py-3 rounded-xl bg-[#00FF41] text-[#0F172A] font-bold hover:brightness-110 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next: Roster
          </button>
        </div>
      </div>
    );
  }

  function renderRoster() {
    if (!teamA || !teamB) return null;
    const currentPlayers = rosterTab === 'A' ? playersA : playersB;
    const currentRoster = rosterTab === 'A' ? rosterA : rosterB;
    const setCurrentRoster = rosterTab === 'A' ? setRosterA : setRosterB;
    const currentTeam = rosterTab === 'A' ? teamA : teamB;

    return (
      <div className="space-y-6">
        <div className="flex gap-2">
          {(['A', 'B'] as const).map((tab) => {
            const team = tab === 'A' ? teamA : teamB;
            const roster = tab === 'A' ? rosterA : rosterB;
            return (
              <button
                key={tab}
                onClick={() => setRosterTab(tab)}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                  rosterTab === tab
                    ? 'bg-[#00FF41] text-[#0F172A]'
                    : 'bg-[#334155] text-gray-400'
                }`}
              >
                {team.name} ({roster.size})
              </button>
            );
          })}
        </div>

        <div>
          <h3 className="text-xs font-bold text-gray-500 tracking-widest mb-3">
            {currentTeam.name} &mdash; SELECT PLAYING XI ({currentRoster.size}/11)
          </h3>
          {currentPlayers.length === 0 ? (
            <p className="text-gray-400 text-sm">No players found for this team.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {currentPlayers.map((p) => {
                const selected = currentRoster.has(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => toggleRoster(currentRoster, setCurrentRoster, p.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${
                      selected
                        ? 'bg-[#00FF41]/10 border border-[#00FF41]/40'
                        : 'bg-[#334155] border border-transparent hover:border-gray-600'
                    }`}
                  >
                    <span className={`font-medium ${selected ? 'text-[#00FF41]' : 'text-white'}`}>{p.name}</span>
                    <span className="text-xs text-gray-400">{ROLE_LABELS[p.role]}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setStep('toss')}
            className="flex-1 py-3 rounded-xl bg-[#334155] text-gray-300 font-bold hover:bg-[#334155]/80 transition-all"
          >
            Back
          </button>
          <button
            onClick={handleCreate}
            disabled={creating || rosterA.size === 0 || rosterB.size === 0}
            className="flex-1 py-3 rounded-xl bg-[#00FF41] text-[#0F172A] font-bold hover:brightness-110 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {creating ? 'Creating...' : 'Create Match'}
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  return (
    <main className="min-h-screen bg-[#0F172A]">
      <header className="border-b border-[#334155] px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="w-3 h-3 rounded-full bg-[#00FF41]" />
              <h1 className="text-xl font-bold text-white tracking-tight">
                cric<span className="text-[#00FF41]">head</span>
              </h1>
            </a>
          </div>
          <a href="/" className="text-sm text-gray-400 hover:text-white transition-colors">
            Cancel
          </a>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-6">
        <h2 className="text-2xl font-extrabold text-white mb-2">New Match</h2>
        <p className="text-sm text-gray-400 mb-6">Configure your match step by step.</p>

        {renderStepIndicator()}

        <div className="bg-[#1E293B] rounded-2xl p-6">
          {step === 'details' && renderDetails()}
          {step === 'teams' && renderTeams()}
          {step === 'toss' && renderToss()}
          {step === 'roster' && renderRoster()}
        </div>
      </div>
    </main>
  );
}
