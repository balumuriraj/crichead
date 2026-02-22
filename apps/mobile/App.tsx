import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { initializeFirebase, type MatchConfig, type Toss } from '@crichead/core';
// @ts-expect-error firebase/auth export getReactNativePersistence is missing in some typedefs but exists at runtime
import { getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MatchDetailsScreen from './src/screens/MatchDetailsScreen';
import SelectTeamsScreen from './src/screens/SelectTeamsScreen';
import { type TeamInfo } from '@crichead/core';
import TossScreen from './src/screens/TossScreen';
import SelectRosterScreen from './src/screens/SelectRosterScreen';
import ScoringScreen from './src/screens/ScoringScreen';
import { setStorageProvider } from '@crichead/core';

setStorageProvider({
  getItem: AsyncStorage.getItem.bind(AsyncStorage),
  setItem: AsyncStorage.setItem.bind(AsyncStorage),
  removeItem: AsyncStorage.removeItem.bind(AsyncStorage),
});

// Initialize Firebase before any hooks run
initializeFirebase({
    apiKey: 'AIzaSyC4EKVna2ChIW0L-RXnFHt0LBkUX7NvIAI',
    authDomain: 'crichead-app.firebaseapp.com',
    projectId: 'crichead-app',
    storageBucket: 'crichead-app.firebasestorage.app',
    messagingSenderId: '345345271554',
    appId: '1:345345271554:web:f2dc213b6cbf909639441b',
  },
  getReactNativePersistence(AsyncStorage)
);

type AppScreen =
  | { name: 'matchDetails' }
  | { name: 'selectTeams'; config: MatchConfig }
  | { name: 'toss'; config: MatchConfig; teamA: TeamInfo; teamB: TeamInfo }
  | { name: 'selectRoster'; config: MatchConfig; teamA: TeamInfo; teamB: TeamInfo; toss: Toss }
  | { name: 'scoring'; matchId: string };

export default function App() {
  const [screen, setScreen] = useState<AppScreen>({ name: 'matchDetails' });

  return (
    <>
      {screen.name === 'matchDetails' && (
        <MatchDetailsScreen
          onNext={(config) => setScreen({ name: 'selectTeams', config })}
          onCancel={() => {}}
        />
      )}
      {screen.name === 'selectTeams' && (
        <SelectTeamsScreen
          onNext={(teamA, teamB) =>
            setScreen({ name: 'toss', config: screen.config, teamA, teamB })
          }
          onBack={() => setScreen({ name: 'matchDetails' })}
        />
      )}
      {screen.name === 'toss' && (
        <TossScreen
          teamA={screen.teamA}
          teamB={screen.teamB}
          onNext={(toss) =>
            setScreen({
              name: 'selectRoster',
              config: screen.config,
              teamA: screen.teamA,
              teamB: screen.teamB,
              toss,
            })
          }
          onBack={() =>
            setScreen({ name: 'selectTeams', config: screen.config })
          }
        />
      )}
      {screen.name === 'selectRoster' && (
        <SelectRosterScreen
          teamA={screen.teamA}
          teamB={screen.teamB}
          toss={screen.toss}
          config={screen.config}
          onNext={(matchId) => setScreen({ name: 'scoring', matchId })}
          onBack={() =>
            setScreen({
              name: 'toss',
              config: screen.config,
              teamA: screen.teamA,
              teamB: screen.teamB,
            })
          }
        />
      )}
      {screen.name === 'scoring' && (
        <ScoringScreen matchId={screen.matchId} />
      )}
      <StatusBar style="light" />
    </>
  );
}
