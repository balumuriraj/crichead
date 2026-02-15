import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { initializeFirebase } from '@crichead/core';
import SelectTeamsScreen, { type TeamInfo } from './src/screens/SelectTeamsScreen';
import SelectRosterScreen from './src/screens/SelectRosterScreen';
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

type AppScreen =
  | { name: 'selectTeams' }
  | { name: 'selectRoster'; teamA: TeamInfo; teamB: TeamInfo }
  | { name: 'scoring'; matchId: string };

export default function App() {
  const [screen, setScreen] = useState<AppScreen>({ name: 'selectTeams' });

  return (
    <>
      {screen.name === 'selectTeams' && (
        <SelectTeamsScreen
          onNext={(teamA, teamB) =>
            setScreen({ name: 'selectRoster', teamA, teamB })
          }
        />
      )}
      {screen.name === 'selectRoster' && (
        <SelectRosterScreen
          teamA={screen.teamA}
          teamB={screen.teamB}
          onNext={(matchId) => setScreen({ name: 'scoring', matchId })}
          onBack={() => setScreen({ name: 'selectTeams' })}
        />
      )}
      {screen.name === 'scoring' && (
        <ScoringScreen matchId={screen.matchId} />
      )}
      <StatusBar style="light" />
    </>
  );
}
