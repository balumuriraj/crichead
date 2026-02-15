import { StatusBar } from 'expo-status-bar';
import { initializeFirebase } from '@crichead/core';
import ScoringScreen from './src/screens/ScoringScreen';

// Initialize Firebase before any hooks run
initializeFirebase({
  apiKey: 'AIzaSyC4EKVna2ChIW0L-RXnFHt0LBkUX7NvIAI',
  authDomain: 'crichead-app.firebaseapp.com',
  projectId: 'crichead-app',
  storageBucket: 'crichead-app.firebasestorage.app',
  messagingSenderId: '345345271554',
  appId: '1:345345271554:web:f2dc213b6cbf909639441b',
});

// Match ID for live sync — set to null for demo/local mode
const MATCH_ID = 'test-match-001';

export default function App() {
  return (
    <>
      <ScoringScreen matchId={MATCH_ID} />
      <StatusBar style="light" />
    </>
  );
}
