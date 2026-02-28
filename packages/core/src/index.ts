// ============================================================================
// @crichead/core — Domain-Only Entry Point
//
// This main entry exports ONLY framework-free code: types, schema, scoring
// engine, actions, session, and utilities. No React. No cloud dependency.
//
// For React hooks:     import { useScoringSession } from '@crichead/core/hooks'
// ============================================================================

// Domain — Types
export * from './domain/types';

// Domain — Schema (Zod-validated event types)
export * as EventSchema from './domain/schema';

// Domain — Scoring Engine
export * as EventScoring from './domain/scoring';
export * from './domain/scoring/migrations';

// Domain — Constants
export * from './domain/constants/navigation';

// Application — Event Actions (createScoreEvent, etc.)
export * from './application/actions/actions';

// Application — ScoringSession (orchestration class)
export { ScoringSession, type ScoringSessionConfig, type ScoringSessionSnapshot } from './application/ScoringSession';

// Application — Shared Types (PickerMode, ExtraTypeCode, etc.)
export { type PickerMode, type PlayerInfo, type ExtraTypeCode } from './application/types';

// Application — Ports (MatchRepository interface)
export * from './application/ports';

// Application — State Store (zustand — framework-agnostic)
export * as EventStore from './application/store';

// Infrastructure — Default Adapters
export { createOfflineStorageDataProvider } from './infrastructure/services/OfflineStorageDataProvider';

// Shared — Utilities (formatBallDisplay, splitBallsIntoOvers, etc.)
export * from './shared/utils';

// Shared — Design Tokens (Colors, etc.)
export * from './shared/tokens';
