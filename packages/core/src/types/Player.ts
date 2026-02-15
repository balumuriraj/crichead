export type PlayerRole = 'bat' | 'bowl' | 'all';
export type PlayerHand = 'left' | 'right';

export interface Player {
  id: string;
  name: string;
  role: PlayerRole;
  hand: PlayerHand;
}
