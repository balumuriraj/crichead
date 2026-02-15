import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, getDocs, orderBy, query } from 'firebase/firestore';

const app = initializeApp({
  apiKey: 'AIzaSyC4EKVna2ChIW0L-RXnFHt0LBkUX7NvIAI',
  authDomain: 'crichead-app.firebaseapp.com',
  projectId: 'crichead-app',
  storageBucket: 'crichead-app.firebasestorage.app',
  messagingSenderId: '345345271554',
  appId: '1:345345271554:web:f2dc213b6cbf909639441b',
});
const db = getFirestore(app);

const matchSnap = await getDoc(doc(db, 'matches', 'test-match-001'));
console.log('Match:', JSON.stringify(matchSnap.data(), null, 2));

const ballsSnap = await getDocs(query(collection(db, 'matches', 'test-match-001', 'innings', '0', 'balls'), orderBy('sequence')));
console.log(`\nBalls (${ballsSnap.size}):`);
ballsSnap.forEach(d => console.log(`  #${d.data().sequence}: ${d.data().runs} runs - ${d.data().commentary}`));

process.exit(0);
