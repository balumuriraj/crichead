import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, orderBy } from 'firebase/firestore';

const app = initializeApp({
  apiKey: 'AIzaSyC4EKVna2ChIW0L-RXnFHt0LBkUX7NvIAI',
  authDomain: 'crichead-app.firebaseapp.com',
  projectId: 'crichead-app',
  storageBucket: 'crichead-app.firebasestorage.app',
  messagingSenderId: '345345271554',
  appId: '1:345345271554:web:f2dc213b6cbf909639441b',
});
const db = getFirestore(app);

const teamsSnap = await getDocs(query(collection(db, 'teams'), orderBy('name')));
console.log(`Teams (${teamsSnap.size}):`);

for (const teamDoc of teamsSnap.docs) {
  const team = teamDoc.data();
  console.log(`\n  ${team.name} [${teamDoc.id}]`);
  console.log(`  Home: ${team.homeGround || '—'}`);

  const playersSnap = await getDocs(collection(db, 'teams', teamDoc.id, 'players'));
  console.log(`  Players (${playersSnap.size}):`);
  playersSnap.forEach((p) => {
    const d = p.data();
    console.log(`    - ${d.name} (${d.role}, ${d.hand}-handed)`);
  });
}

process.exit(0);
