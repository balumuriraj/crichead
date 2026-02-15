// Export all types
export * from './types';

// Export all utilities
export * from './utils';

// Export Firebase client-side utilities
export * from './firebase';

// Additional Team interface for backward compatibility
export interface Team {
  id: string;
  name: string;
  playerIds: string[];
}

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
