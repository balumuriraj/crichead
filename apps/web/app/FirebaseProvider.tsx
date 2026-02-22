'use client';

import { useRef } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { initializeFirebase } from '@crichead/core/firebase';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export default function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const initialized = useRef(false);

  if (!initialized.current) {
    // Initialize both the web app's own firebase/app (for direct getFirestore() calls)
    // and @crichead/core's copy (for useMatchSync and other hooks)
    if (getApps().length === 0) {
      initializeApp(firebaseConfig);
    }
    initializeFirebase(firebaseConfig);
    initialized.current = true;
  }

  return <>{children}</>;
}
