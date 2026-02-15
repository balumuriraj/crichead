/**
 * Seed script: creates a test match document in Firestore
 *
 * Usage:  node scripts/seed-match.mjs
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyC4EKVna2ChIW0L-RXnFHt0LBkUX7NvIAI',
  authDomain: 'crichead-app.firebaseapp.com',
  projectId: 'crichead-app',
  storageBucket: 'crichead-app.firebasestorage.app',
  messagingSenderId: '345345271554',
  appId: '1:345345271554:web:f2dc213b6cbf909639441b',
};

const MATCH_ID = 'test-match-001';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const matchDoc = {
  teamA: 'India',
  teamB: 'Australia',
  toss: { winner: 'India', decision: 'bat' },
  status: 'live',
  currentInningsIndex: 0,
  innings: [
    {
      teamId: 'India',
      totalRuns: 0,
      totalWickets: 0,
      overs: 0.0,
      ballCount: 0,
    },
  ],
};

async function seed() {
  console.log(`Seeding match document: matches/${MATCH_ID}`);
  await setDoc(doc(db, 'matches', MATCH_ID), matchDoc);
  console.log('Done! Match created with status "live" and empty innings.');
  console.log(`\nMobile app:  ScoringScreen matchId="${MATCH_ID}"`);
  console.log(`Web viewer:  http://localhost:3000/match/${MATCH_ID}`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
