import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { type MatchConfig, type Toss } from '@crichead/core';
import MatchDetailsScreen from './src/screens/MatchDetailsScreen';
import SelectTeamsScreen, { type LocalTeamInfo } from './src/screens/SelectTeamsScreen';
import TossScreen from './src/screens/TossScreen';
import SelectRosterScreen from './src/screens/SelectRosterScreen';
import ScoringScreen from './src/screens/ScoringScreen';

type AppScreen =
  | { name: 'matchDetails' }
  | { name: 'selectTeams'; config: MatchConfig }
  | { name: 'toss'; config: MatchConfig; teamA: LocalTeamInfo; teamB: LocalTeamInfo }
  | { name: 'selectRoster'; config: MatchConfig; teamA: LocalTeamInfo; teamB: LocalTeamInfo; toss: Toss }
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
