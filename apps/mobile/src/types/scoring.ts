export type TabKey = 'comm' | 'players' | 'cards';
export type PickerMode = 'striker' | 'nonStriker' | 'bowler' | null;

export interface PlayerInfo {
  id: string;
  name: string;
  role: 'bat' | 'bowl' | 'all';
}
