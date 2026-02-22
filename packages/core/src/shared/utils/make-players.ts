import type { PlayerRole } from '../../domain/types';

export interface GeneratedPlayer {
  id: string;
  name: string;
  role: PlayerRole;
}

export function makePlayers(prefix: string, count: number): GeneratedPlayer[] {
  const roles: PlayerRole[] = [];
  for (let i = 0; i < count; i++) {
    if (i < Math.ceil(count * 0.4)) roles.push('bat');
    else if (i < Math.ceil(count * 0.6)) roles.push('all');
    else roles.push('bowl');
  }
  return roles.map((role, i) => ({
    id: `${prefix}_${i + 1}`,
    name: `${prefix} Player ${i + 1}`,
    role,
  }));
}
