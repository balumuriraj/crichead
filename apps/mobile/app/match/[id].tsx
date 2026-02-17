import React, { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { MatchConfig, Toss } from '@crichead/core';
import MatchDetailsScreen from '../../src/screens/MatchDetailsScreen';
import SelectTeamsScreen, { type TeamInfo } from '../../src/screens/SelectTeamsScreen';
import TossScreen from '../../src/screens/TossScreen';
import SelectRosterScreen from '../../src/screens/SelectRosterScreen';
import QuickMatchScreen from '../../src/screens/QuickMatchScreen';
import ScoringScreen from '../../src/screens/ScoringScreen';

type MatchStep =
  | { step: 'matchDetails' }
  | { step: 'selectTeams'; config: MatchConfig }
  | { step: 'toss'; config: MatchConfig; teamA: TeamInfo; teamB: TeamInfo }
  | { step: 'selectRoster'; config: MatchConfig; teamA: TeamInfo; teamB: TeamInfo; toss: Toss }
  | { step: 'quickMatch' }
  | { step: 'scoring'; matchId: string };

export default function MatchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const initialStep: MatchStep =
    id === 'new'
      ? { step: 'matchDetails' }
      : id === 'quick'
        ? { step: 'quickMatch' }
        : { step: 'scoring', matchId: id! };

  const [current, setCurrent] = useState<MatchStep>(initialStep);

  if (current.step === 'quickMatch') {
    return (
      <QuickMatchScreen
        onMatchCreated={(matchId) => setCurrent({ step: 'scoring', matchId })}
        onCancel={() => router.back()}
      />
    );
  }

  if (current.step === 'matchDetails') {
    return (
      <MatchDetailsScreen
        onNext={(config) => setCurrent({ step: 'selectTeams', config })}
        onCancel={() => router.back()}
      />
    );
  }

  if (current.step === 'selectTeams') {
    return (
      <SelectTeamsScreen
        onNext={(teamA, teamB) =>
          setCurrent({ step: 'toss', config: current.config, teamA, teamB })
        }
        onBack={() => setCurrent({ step: 'matchDetails' })}
        onCancel={() => router.back()}
      />
    );
  }

  if (current.step === 'toss') {
    return (
      <TossScreen
        teamA={current.teamA}
        teamB={current.teamB}
        onNext={(toss) =>
          setCurrent({
            step: 'selectRoster',
            config: current.config,
            teamA: current.teamA,
            teamB: current.teamB,
            toss,
          })
        }
        onBack={() =>
          setCurrent({ step: 'selectTeams', config: current.config })
        }
        onCancel={() => router.back()}
      />
    );
  }

  if (current.step === 'selectRoster') {
    return (
      <SelectRosterScreen
        teamA={current.teamA}
        teamB={current.teamB}
        toss={current.toss}
        config={current.config}
        onNext={(matchId) => setCurrent({ step: 'scoring', matchId })}
        onBack={() =>
          setCurrent({
            step: 'toss',
            config: current.config,
            teamA: current.teamA,
            teamB: current.teamB,
          })
        }
        onCancel={() => router.back()}
      />
    );
  }

  return <ScoringScreen matchId={current.matchId} />;
}
