import { z } from 'zod';

export const MatchFormatSchema = z.enum(['t20', 'odi', 'test', 'custom']);
export const TossDecisionSchema = z.enum(['bat', 'bowl']);

export const TossSchema = z.object({
  winner: z.string().describe('Team ID that won the toss'),
  decision: TossDecisionSchema,
});

export const MatchConfigSchema = z.object({
  v: z.literal(1).describe('Schema version'),
  format: MatchFormatSchema,
  oversPerInnings: z.number().int().min(1),
  wicketsPerInnings: z.number().int().min(1).default(10),
  playersPerSide: z.number().int().min(2).default(11),
  venue: z.string(),
  scheduledDate: z.string().datetime().or(z.string()), // Accept ISO string or basic date string
  tournamentId: z.string().optional(),
  
  // Future proofing for custom formats
  allowMaxOversPerBowler: z.number().int().optional(),
});

export type MatchFormat = z.infer<typeof MatchFormatSchema>;
export type TossDecision = z.infer<typeof TossDecisionSchema>;
export type Toss = z.infer<typeof TossSchema>;
export type MatchConfig = z.infer<typeof MatchConfigSchema>;
