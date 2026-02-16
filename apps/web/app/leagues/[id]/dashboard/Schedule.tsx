'use client';

import Link from 'next/link';

interface InningsSummary {
  teamId: string;
  totalRuns: number;
  totalWickets: number;
  overs: number;
}

export interface MatchDoc {
  id: string;
  teamA: string;
  teamB: string;
  status: 'upcoming' | 'live' | 'finished';
  innings: InningsSummary[];
}

interface Props {
  matches: MatchDoc[];
  teamNames: Record<string, string>;
}

const statusConfig = {
  live: {
    label: 'LIVE',
    classes: 'bg-[#00FF41]/10 text-[#00FF41] border-[#00FF41]/30',
    dot: true,
  },
  upcoming: {
    label: 'UPCOMING',
    classes: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    dot: false,
  },
  finished: {
    label: 'FINAL',
    classes: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
    dot: false,
  },
};

function formatScore(innings: InningsSummary): string {
  const whole = Math.floor(innings.overs);
  const balls = Math.round((innings.overs - whole) * 10);
  return `${innings.totalRuns}/${innings.totalWickets} (${whole}.${balls})`;
}

export default function Schedule({ matches, teamNames }: Props) {
  // Sort: live first, then upcoming, then finished
  const sorted = [...matches].sort((a, b) => {
    const order = { live: 0, upcoming: 1, finished: 2 };
    return order[a.status] - order[b.status];
  });

  return (
    <div className="bg-[#1E293B] rounded-2xl p-6">
      <h3 className="text-xs font-bold text-gray-500 tracking-widest mb-4">SCHEDULE</h3>

      {sorted.length === 0 ? (
        <p className="text-sm text-gray-500 italic">No matches scheduled yet.</p>
      ) : (
        <div className="space-y-3">
          {sorted.map((match) => {
            const cfg = statusConfig[match.status];
            const teamAName = teamNames[match.teamA] ?? match.teamA;
            const teamBName = teamNames[match.teamB] ?? match.teamB;
            const innA = match.innings.find((i) => i.teamId === match.teamA);
            const innB = match.innings.find((i) => i.teamId === match.teamB);

            const content = (
              <div className="flex items-center gap-4 bg-[#0F172A] rounded-xl p-4 border border-[#334155] hover:border-[#334155]/80 transition-colors">
                {/* Teams & Scores */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-white truncate">
                      {teamAName}
                    </span>
                    {innA && match.status !== 'upcoming' && (
                      <span className="text-xs font-mono text-gray-300 ml-2 shrink-0">
                        {formatScore(innA)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-white truncate">
                      {teamBName}
                    </span>
                    {innB && match.status !== 'upcoming' && (
                      <span className="text-xs font-mono text-gray-300 ml-2 shrink-0">
                        {formatScore(innB)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status Badge */}
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border shrink-0 flex items-center gap-1.5 ${cfg.classes}`}>
                  {cfg.dot && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00FF41] animate-pulse" />
                  )}
                  {cfg.label}
                </span>
              </div>
            );

            if (match.status === 'upcoming') {
              return <div key={match.id}>{content}</div>;
            }

            return (
              <Link key={match.id} href={`/match/${match.id}`}>
                {content}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
