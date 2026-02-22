// Export all types
export * from './domain/types';

// Export all utilities
export * from './shared/utils';

// Export design tokens
export * from './shared/tokens';


// Export Firebase client-side utilities
export * from './infrastructure/firebase';
export * from './infrastructure/storage';

// Export React hooks
export * from './presentation/hooks';

// Export constants
export * from './domain/constants/navigation';

// --- New Event-Stream Architecture --- //
export * as EventSchema from './domain/schema';
export * as EventScoring from './domain/scoring';
export * from './domain/scoring/migrations';
export * as EventStore from './application/store';
export * from './application/actions/actions';
export { ScoringSession, type ScoringSessionConfig, type ScoringSessionSnapshot } from './application/ScoringSession';
export { type PickerMode, type PlayerInfo, type ExtraTypeCode } from './application/types';

/**
 * Firebase Admin SDK Usage:
 *
 * For server-side Firebase Admin SDK, import directly from the admin module:
 * ```typescript
 * import { initializeFirebaseAdmin } from '@crichead/core/firebase/admin';
 * ```
 *
 * This prevents bundling the Admin SDK in client-side code.
 */
