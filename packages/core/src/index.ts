// Export all types
export * from './types';

// Export all utilities
export * from './utils';

// Export design tokens
export * from './tokens';

// Export Firebase client-side utilities
export * from './firebase';

// Export React hooks
export * from './hooks';

// Export constants
export * from './constants/navigation';

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
