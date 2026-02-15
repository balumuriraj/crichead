/**
 * Seed script: creates 2 teams with 11 players each
 * Usage: node scripts/seed-two-teams.mjs
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

const teams = [
  {
    name: 'Mumbai Mavericks',
    homeGround: 'Wankhede Stadium',
    players: [
      { name: 'Rohit Menon', role: 'bat', hand: 'right' },
      { name: 'Aditya Iyer', role: 'bat', hand: 'left' },
      { name: 'Karan Deshmukh', role: 'bat', hand: 'right' },
      { name: 'Suresh Nair', role: 'all', hand: 'right' },
      { name: 'Deepak Joshi', role: 'all', hand: 'left' },
      { name: 'Ankit Patil', role: 'all', hand: 'right' },
      { name: 'Rahul Kulkarni', role: 'bowl', hand: 'right' },
      { name: 'Sanjay Ghosh', role: 'bowl', hand: 'left' },
      { name: 'Nikhil Sawant', role: 'bowl', hand: 'right' },
      { name: 'Ajay Thakur', role: 'bowl', hand: 'right' },
      { name: 'Vishal Rane', role: 'bowl', hand: 'left' },
    ],
  },
  {
    name: 'Delhi Dynamos',
    homeGround: 'Feroz Shah Kotla',
    players: [
      { name: 'Virat Malhotra', role: 'bat', hand: 'right' },
      { name: 'Shikhar Bhatia', role: 'bat', hand: 'left' },
      { name: 'Rishabh Tandon', role: 'bat', hand: 'left' },
      { name: 'Shreyas Kapoor', role: 'bat', hand: 'right' },
      { name: 'Hardik Chadha', role: 'all', hand: 'right' },
      { name: 'Ravindra Mehra', role: 'all', hand: 'right' },
      { name: 'Ishant Gill', role: 'bowl', hand: 'right' },
      { name: 'Bhuvnesh Yadav', role: 'bowl', hand: 'right' },
      { name: 'Yuzvendra Saini', role: 'bowl', hand: 'right' },
      { name: 'Mohammed Arif', role: 'bowl', hand: 'left' },
      { name: 'Jasprit Dhawan', role: 'bowl', hand: 'right' },
    ],
  },
];

async function seed() {
  for (const team of teams) {
    console.log(`\nCreating: ${team.name}...`);
    const ref = await addDoc(collection(db, 'teams'), {
      name: team.name,
      logoUrl: '',
      homeGround: team.homeGround,
      createdAt: serverTimestamp(),
    });

    for (const p of team.players) {
      await addDoc(collection(db, 'teams', ref.id, 'players'), {
        ...p,
        addedAt: serverTimestamp(),
      });
    }
    console.log(`  ✓ ${team.players.length} players added [${ref.id}]`);
  }

  console.log('\nDone! 2 teams × 11 players seeded.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
