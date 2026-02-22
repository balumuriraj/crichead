export type ExtraType = 'wd' | 'nb' | 'b' | 'lb';

export type WicketType =
  | 'bowled'
  | 'caught'
  | 'lbw'
  | 'run out'
  | 'stumped'
  | 'hit wicket';

export interface Wicket {
  type: WicketType;
  fielderId?: string;
}

export interface Ball {
  bowlerId: string;
  strikerId: string;
  runs: number;
  extras: {
    type: ExtraType | null;
    runs?: number;
  } | null;
  wicket: Wicket | null;
  commentary?: string;
}
