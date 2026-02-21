import { z } from 'zod';

export const DeliveryTypeSchema = z.enum(['legal', 'wide', 'no-ball', 'bye', 'leg-bye']);

export const WicketTypeSchema = z.enum([
  'bowled',
  'caught',
  'lbw',
  'run out',
  'stumped',
  'hit wicket',
  'retired hurt',
  'obstructing the field',
  'timed out',
]);

export const WicketSchema = z.object({
  type: WicketTypeSchema,
  dismissedId: z.string().describe('The ID of the player who was dismissed (crucial for Run Outs)'),
  fielderId: z.string().optional(),
});

export const BallEventSchema = z.object({
  v: z.literal(1).describe('Schema version for future-proofing migrations'),
  id: z.string().describe('Unique ID for the event, useful for undo/redo and tracking'),
  timestamp: z.number().describe('Unix timestamp of when the event occurred'),
  
  matchId: z.string(),
  inningsId: z.string(),
  
  bowlerId: z.string(),
  strikerId: z.string(),
  nonStrikerId: z.string(),
  
  deliveryType: DeliveryTypeSchema,
  
  runs: z.object({
    bat: z.number().int().min(0).describe('Runs scored off the bat'),
    extra: z.number().int().min(0).describe('Runs attributed as extras (wides, no-balls, byes)'),
    penalty: z.number().int().default(0).describe('Penalty runs rewarded to the batting team'),
  }),
  
  wicket: WicketSchema.nullable().optional(),
  
  isStrikeRotated: z.boolean().describe('Whether the strike changes at the end of this ball (includes odd runs or mid-over unusual changes)'),
  
  metadata: z.record(z.string(), z.unknown()).optional().describe('Extensible payload for wagon wheel, pitch map, speed, etc.'),
});

export type DeliveryType = z.infer<typeof DeliveryTypeSchema>;
export type WicketTypeEvent = z.infer<typeof WicketTypeSchema>;
export type WicketEvent = z.infer<typeof WicketSchema>;
export type BallEvent = z.infer<typeof BallEventSchema>;
