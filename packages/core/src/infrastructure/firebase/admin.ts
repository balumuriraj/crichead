import * as admin from 'firebase-admin';
import { cert, ServiceAccount } from 'firebase-admin/app';

/**
 * Firebase Admin SDK Configuration
 *
 * This file initializes Firebase Admin SDK for server-side operations.
 * The Admin SDK has elevated permissions and should only be used in secure server environments.
 *
 * IMPORTANT: Never use Firebase Admin SDK in client-side code (web/mobile apps).
 * It's designed for:
 * - Next.js API routes
 * - Server-side rendering
 * - Backend services
 * - Cloud Functions
 */

let adminApp: admin.app.App;
let adminAuth: admin.auth.Auth;
let adminDb: admin.firestore.Firestore;
let adminStorage: admin.storage.Storage;

export interface FirebaseAdminConfig {
  projectId?: string;
  serviceAccount?: ServiceAccount | string; // Can be an object or path to JSON file
  credential?: admin.credential.Credential;
}

/**
 * Initialize Firebase Admin SDK
 *
 * This function initializes Firebase Admin for server-side use.
 * It's safe to call multiple times - subsequent calls will return the existing instance.
 *
 * @param config - Firebase Admin configuration
 * @returns Object containing initialized Firebase Admin services
 *
 * @example Using service account file path:
 * ```typescript
 * import { initializeFirebaseAdmin } from '@crichead/core/firebase/admin';
 *
 * const { app, auth, db } = initializeFirebaseAdmin({
 *   serviceAccount: './serviceAccountKey.json'
 * });
 * ```
 *
 * @example Using service account object:
 * ```typescript
 * const { app, auth, db } = initializeFirebaseAdmin({
 *   serviceAccount: {
 *     projectId: "your-project-id",
 *     clientEmail: "firebase-adminsdk@your-project.iam.gserviceaccount.com",
 *     privateKey: "-----BEGIN PRIVATE KEY-----\n...",
 *   }
 * });
 * ```
 *
 * @example Using environment variables:
 * ```typescript
 * // Set GOOGLE_APPLICATION_CREDENTIALS env var to path of service account JSON
 * const { app, auth, db } = initializeFirebaseAdmin();
 * ```
 */
export function initializeFirebaseAdmin(config?: FirebaseAdminConfig): {
  app: admin.app.App;
  auth: admin.auth.Auth;
  db: admin.firestore.Firestore;
  storage: admin.storage.Storage;
} {
  // Check if admin is already initialized
  if (!adminApp) {
    try {
      // If no config provided, try to use default credentials from environment
      if (!config) {
        adminApp = admin.initializeApp({
          projectId: process.env.FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID"
        });
      } else if (config.credential) {
        // Use provided credential directly
        adminApp = admin.initializeApp({
          credential: config.credential,
          projectId: config.projectId
        });
      } else if (config.serviceAccount) {
        // Use service account (either object or file path)
        const credential = typeof config.serviceAccount === 'string'
          ? cert(require(config.serviceAccount))
          : cert(config.serviceAccount);

        adminApp = admin.initializeApp({
          credential,
          projectId: config.projectId
        });
      } else {
        // Fallback to default initialization
        adminApp = admin.initializeApp({
          projectId: config.projectId || process.env.FIREBASE_PROJECT_ID
        });
      }

      adminAuth = admin.auth(adminApp);
      adminDb = admin.firestore(adminApp);
      adminStorage = admin.storage(adminApp);
    } catch (error) {
      console.error('Error initializing Firebase Admin:', error);
      throw error;
    }
  }

  return {
    app: adminApp,
    auth: adminAuth,
    db: adminDb,
    storage: adminStorage
  };
}

/**
 * Get the initialized Firebase Admin app instance
 * Call initializeFirebaseAdmin() first before using this
 */
export function getAdminApp(): admin.app.App {
  if (!adminApp) {
    throw new Error('Firebase Admin has not been initialized. Call initializeFirebaseAdmin() first.');
  }
  return adminApp;
}

/**
 * Get the initialized Firebase Admin Auth instance
 * Call initializeFirebaseAdmin() first before using this
 */
export function getAdminAuth(): admin.auth.Auth {
  if (!adminAuth) {
    throw new Error('Firebase Admin has not been initialized. Call initializeFirebaseAdmin() first.');
  }
  return adminAuth;
}

/**
 * Get the initialized Firestore Admin instance
 * Call initializeFirebaseAdmin() first before using this
 */
export function getAdminDb(): admin.firestore.Firestore {
  if (!adminDb) {
    throw new Error('Firebase Admin has not been initialized. Call initializeFirebaseAdmin() first.');
  }
  return adminDb;
}

/**
 * Get the initialized Firebase Admin Storage instance
 * Call initializeFirebaseAdmin() first before using this
 */
export function getAdminStorage(): admin.storage.Storage {
  if (!adminStorage) {
    throw new Error('Firebase Admin has not been initialized. Call initializeFirebaseAdmin() first.');
  }
  return adminStorage;
}
