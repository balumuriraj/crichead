/**
 * Test script: adds a ball to the test match via Firestore transaction
 * Simulates what the mobile app does via addBallToMatch
 *
 * Usage:  node scripts/add-test-ball.mjs [runs]
 * Example: node scripts/add-test-ball.mjs 4    (adds a FOUR)
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  collection,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyC4EKVna2ChIW0L-RXnFHt0LBkUX7NvIAI',
  authDomain: 'crichead-app.firebaseapp.com',
  projectId: 'crichead-app',
  storageBucket: 'crichead-app.firebasestorage.app',
  messagingSenderId: '345345271554',
  appId: '1:345345271554:web:f2dc213b6cbf909639441b',
};

const MATCH_ID = 'test-match-001';
const runs = parseInt(process.argv[2] ?? '1', 10);

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function addBall() {
  const matchDocRef = doc(db, 'matches', MATCH_ID);

  await runTransaction(db, async (transaction) => {
    const matchSnap = await transaction.get(matchDocRef);
    if (!matchSnap.exists()) throw new Error('Match not found');

    const matchData = matchSnap.data();
    const inningsIndex = matchData.currentInningsIndex;
    const currentInnings = matchData.innings[inningsIndex];

    const newTotalRuns = currentInnings.totalRuns + runs;
    const newBallCount = currentInnings.ballCount + 1;

    // Parse overs
    const oversStr = currentInnings.overs.toFixed(1);
    const dotIdx = oversStr.indexOf('.');
    const curOver = parseInt(oversStr.substring(0, dotIdx), 10);
    const curBall = parseInt(oversStr.substring(dotIdx + 1), 10);
    const totalValid = curOver * 6 + curBall + 1;
    const newOvers = parseFloat(`${Math.floor(totalValid / 6)}.${totalValid % 6}`);

    const commentary =
      runs === 0 ? 'Dot ball' :
      runs === 4 ? 'FOUR! Beautiful shot!' :
      runs === 6 ? 'SIX! Into the crowd!' :
      `${runs} run${runs > 1 ? 's' : ''} taken`;

    // Add ball to subcollection
    const ballDocRef = doc(
      collection(db, 'matches', MATCH_ID, 'innings', String(inningsIndex), 'balls')
    );
    transaction.set(ballDocRef, {
      bowlerId: 'bowler1',
      strikerId: 'batsman1',
      runs,
      extras: null,
      wicket: null,
      commentary,
      sequence: currentInnings.ballCount,
      timestamp: serverTimestamp(),
    });

    // Update match doc
    const updatedInnings = [...matchData.innings];
    updatedInnings[inningsIndex] = {
      ...currentInnings,
      totalRuns: newTotalRuns,
      overs: newOvers,
      ballCount: newBallCount,
    };
    transaction.update(matchDocRef, { innings: updatedInnings });
  });

  console.log(`Added ${runs} run${runs !== 1 ? 's' : ''} to match ${MATCH_ID}`);
  console.log('Check http://localhost:3000/match/test-match-001 — it should update instantly!');
  process.exit(0);
}

addBall().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
