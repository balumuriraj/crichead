import React, { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import SelectTeamsScreen, { type TeamInfo } from '../../src/screens/SelectTeamsScreen';
import SelectRosterScreen from '../../src/screens/SelectRosterScreen';
import ScoringScreen from '../../src/screens/ScoringScreen';

type MatchStep =
  | { step: 'selectTeams' }
  | { step: 'selectRoster'; teamA: TeamInfo; teamB: TeamInfo }
  | { step: 'scoring'; matchId: string };

export default function MatchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  // If an existing match ID is provided (not "new"), go straight to scoring
  const isNewMatch = id === 'new';
  const [current, setCurrent] = useState<MatchStep>(
    isNewMatch ? { step: 'selectTeams' } : { step: 'scoring', matchId: id! }
  );

  if (current.step === 'selectTeams') {
    return (
      <SelectTeamsScreen
        onNext={(teamA, teamB) => setCurrent({ step: 'selectRoster', teamA, teamB })}
      />
    );
  }

  if (current.step === 'selectRoster') {
    return (
      <SelectRosterScreen
        teamA={current.teamA}
        teamB={current.teamB}
        onNext={(matchId) => setCurrent({ step: 'scoring', matchId })}
        onBack={() => setCurrent({ step: 'selectTeams' })}
      />
    );
  }

  return <ScoringScreen matchId={current.matchId} />;
}
