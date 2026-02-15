/**
 * Seed script: creates a team with players in Firestore
 * Usage: node scripts/seed-team.mjs
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';

const app = initializeApp({
  apiKey: 'AIzaSyC4EKVna2ChIW0L-RXnFHt0LBkUX7NvIAI',
  authDomain: 'crichead-app.firebaseapp.com',
  projectId: 'crichead-app',
  storageBucket: 'crichead-app.firebasestorage.app',
  messagingSenderId: '345345271554',
  appId: '1:345345271554:web:f2dc213b6cbf909639441b',
});
const db = getFirestore(app);

async function seed() {
  // Create team
  console.log('Creating team: Crichead CC...');
  const teamRef = await addDoc(collection(db, 'teams'), {
    name: 'Crichead CC',
    logoUrl: '',
    homeGround: 'Silicon Valley Ground',
    createdAt: serverTimestamp(),
  });
  console.log(`Team created: ${teamRef.id}`);

  // Add 5 players
  const players = [
    { name: 'Arjun Sharma', role: 'bat', hand: 'right' },
    { name: 'Priya Patel', role: 'all', hand: 'right' },
    { name: 'Ravi Kumar', role: 'bowl', hand: 'left' },
    { name: 'Sneha Reddy', role: 'bat', hand: 'left' },
    { name: 'Vikram Singh', role: 'bowl', hand: 'right' },
  ];

  for (const p of players) {
    const ref = await addDoc(collection(db, 'teams', teamRef.id, 'players'), {
      ...p,
      addedAt: serverTimestamp(),
    });
    console.log(`  Added: ${p.name} (${p.role}) → ${ref.id}`);
  }

  console.log('\nDone! Team "Crichead CC" with 5 players created.');
  console.log(`Team ID: ${teamRef.id}`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
