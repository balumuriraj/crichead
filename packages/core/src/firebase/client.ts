import { initializeApp, getApps, FirebaseApp, FirebaseOptions } from 'firebase/app';
import { getAuth, Auth, initializeAuth, type Persistence } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

/**
 * Firebase Client Configuration
 *
 * Default placeholder values. Override these by passing a config object
 * to initializeFirebase() or by setting environment variables.
 */
export const defaultFirebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "YOUR_MESSAGING_SENDER_ID",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "YOUR_APP_ID",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || undefined
};

let firebaseApp: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

/**
 * Initialize Firebase Client SDK
 *
 * This function initializes Firebase for client-side use (web and mobile).
 * It's safe to call multiple times - subsequent calls will return the existing instance.
 *
 * @param config - Optional Firebase configuration object. If not provided, uses defaultFirebaseConfig
 * @param persistence - Optional auth persistence strategy (e.g. for React Native)
 * @returns Object containing initialized Firebase services
 *
 * @example
 * ```typescript
 * import { initializeFirebase } from '@crichead/core';
 * import { getReactNativePersistence } from 'firebase/auth';
 * import AsyncStorage from '@react-native-async-storage/async-storage';
 *
 * const { app, auth, db, storage } = initializeFirebase(
 *   { apiKey: "your-api-key", projectId: "your-project-id" },
 *   getReactNativePersistence(AsyncStorage)
 * );
 * ```
 */
export function initializeFirebase(
  config: FirebaseOptions = defaultFirebaseConfig,
  persistence?: Persistence
) {
  // Check if Firebase is already initialized
  if (!firebaseApp) {
    const existingApps = getApps();

    if (existingApps.length === 0) {
      // No apps exist, create a new one
      firebaseApp = initializeApp(config);
    } else {
      // Use the first existing app (we know it exists because length > 0)
      firebaseApp = existingApps[0]!;
    }

    // Initialize services
    // Check if auth is already initialized on this app to prevent errors
    // but the SDK handles this for getAuth. Since we need to provide persistence,
    // we use initializeAuth if not already initialized.
    try {
      if (persistence) {
        auth = initializeAuth(firebaseApp, { persistence });
      } else {
        auth = getAuth(firebaseApp);
      }
    } catch (e: any) {
      // If auth is already initialized (e.g., during hot reload), fallback to getAuth
      if (e.code === 'auth/already-initialized') {
        auth = getAuth(firebaseApp);
      } else {
        throw e;
      }
    }

    db = getFirestore(firebaseApp);
    storage = getStorage(firebaseApp);
  }

  return {
    app: firebaseApp,
    auth,
    db,
    storage
  };
}

/**
 * Get the initialized Firebase app instance
 * Call initializeFirebase() first before using this
 */
export function getFirebaseApp(): FirebaseApp {
  if (!firebaseApp) {
    throw new Error('Firebase has not been initialized. Call initializeFirebase() first.');
  }
  return firebaseApp;
}

/**
 * Get the initialized Firebase Auth instance
 * Call initializeFirebase() first before using this
 */
export function getFirebaseAuth(): Auth {
  if (!auth) {
    throw new Error('Firebase has not been initialized. Call initializeFirebase() first.');
  }
  return auth;
}

/**
 * Get the initialized Firestore instance
 * Call initializeFirebase() first before using this
 */
export function getFirebaseDb(): Firestore {
  if (!db) {
    throw new Error('Firebase has not been initialized. Call initializeFirebase() first.');
  }
  return db;
}

/**
 * Get the initialized Firebase Storage instance
 * Call initializeFirebase() first before using this
 */
export function getFirebaseStorage(): FirebaseStorage {
  if (!storage) {
    throw new Error('Firebase has not been initialized. Call initializeFirebase() first.');
  }
  return storage;
}
