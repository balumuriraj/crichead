/**
 * Firebase Initialization Module
 *
 * This module provides Firebase initialization for both client-side and server-side use.
 *
 * For client-side (Web/Mobile apps):
 * - Use functions from './client'
 *
 * For server-side (Next.js API routes, backend):
 * - Use functions from './admin'
 *
 * @example Client-side usage:
 * ```typescript
 * import { initializeFirebase } from '@crichead/core/firebase';
 * const { auth, db } = initializeFirebase();
 * ```
 *
 * @example Server-side usage:
 * ```typescript
 * import { initializeFirebaseAdmin } from '@crichead/core/firebase/admin';
 * const { auth, db } = initializeFirebaseAdmin();
 * ```
 */

// Export client-side Firebase
export * from './client';

// Note: Admin SDK exports are separate and should be imported directly
// from '@crichead/core/firebase/admin' to avoid bundling admin SDK in client code
