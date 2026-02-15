import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, BorderRadius, Typography } from '@crichead/ui/mobile';
import { getFirebaseDb, type PlayerRole } from '@crichead/core';
import { collection, onSnapshot, addDoc } from 'firebase/firestore';
import type { TeamInfo } from './SelectTeamsScreen';

interface PlayerDoc {
  id: string;
  name: string;
  role: PlayerRole;
  hand: 'left' | 'right';
}

interface Props {
  teamA: TeamInfo;
  teamB: TeamInfo;
  onNext: (matchId: string) => void;
  onBack: () => void;
}

const roleLabels: Record<PlayerRole, string> = {
  bat: 'BAT',
  bowl: 'BOWL',
  all: 'ALL',
};

const roleBadgeColors: Record<PlayerRole, { bg: string; text: string }> = {
  bat: { bg: '#3B82F620', text: '#3B82F6' },
  bowl: { bg: '#EF444420', text: '#EF4444' },
  all: { bg: '#A855F720', text: '#A855F7' },
};

export default function SelectRosterScreen({ teamA, teamB, onNext, onBack }: Props) {
  const [playersA, setPlayersA] = useState<PlayerDoc[]>([]);
  const [playersB, setPlayersB] = useState<PlayerDoc[]>([]);
  const [selectedA, setSelectedA] = useState<Set<string>>(new Set());
  const [selectedB, setSelectedB] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const db = getFirebaseDb();
    let loaded = 0;
    const checkLoaded = () => { if (++loaded >= 2) setLoading(false); };

    const unsubA = onSnapshot(collection(db, 'teams', teamA.id, 'players'), (snap) => {
      setPlayersA(snap.docs.map((d) => ({ id: d.id, ...d.data() } as PlayerDoc)));
      checkLoaded();
    });
    const unsubB = onSnapshot(collection(db, 'teams', teamB.id, 'players'), (snap) => {
      setPlayersB(snap.docs.map((d) => ({ id: d.id, ...d.data() } as PlayerDoc)));
      checkLoaded();
    });

    return () => { unsubA(); unsubB(); };
  }, [teamA.id, teamB.id]);

  function togglePlayer(teamSide: 'A' | 'B', playerId: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const setter = teamSide === 'A' ? setSelectedA : setSelectedB;
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) {
        next.delete(playerId);
      } else {
        if (next.size >= 11) return prev;
        next.add(playerId);
      }
      return next;
    });
  }

  function selectAll(teamSide: 'A' | 'B') {
    const players = teamSide === 'A' ? playersA : playersB;
    const setter = teamSide === 'A' ? setSelectedA : setSelectedB;
    setter(new Set(players.slice(0, 11).map((p) => p.id)));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  async function handleStartMatch() {
    if (selectedA.size === 0 || selectedB.size === 0) {
      Alert.alert('Select Players', 'Select at least 1 player per team.');
      return;
    }

    setCreating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      const db = getFirebaseDb();
      const xiA = playersA
        .filter((p) => selectedA.has(p.id))
        .map((p) => ({ id: p.id, name: p.name, role: p.role }));
      const xiB = playersB
        .filter((p) => selectedB.has(p.id))
        .map((p) => ({ id: p.id, name: p.name, role: p.role }));

      const matchDoc = {
        teamA: teamA.id,
        teamB: teamB.id,
        toss: null,
        status: 'live' as const,
        currentInningsIndex: 0,
        innings: [
          {
            teamId: teamA.id,
            totalRuns: 0,
            totalWickets: 0,
            overs: 0,
            ballCount: 0,
          },
        ],
        playingXI: {
          [teamA.id]: xiA,
          [teamB.id]: xiB,
        },
      };

      const ref = await addDoc(collection(db, 'matches'), matchDoc);
      onNext(ref.id);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create match');
      setCreating(false);
    }
  }

  const canStart = selectedA.size > 0 && selectedB.size > 0 && !creating;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.electricGreen} />
          <Text style={styles.loadingText}>Loading rosters...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} activeOpacity={0.7}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>SELECT PLAYING XI</Text>
        <Text style={styles.subtitle}>
          {teamA.name} vs {teamB.name}
        </Text>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {/* Team A */}
        <TeamSection
          teamName={teamA.name}
          players={playersA}
          selected={selectedA}
          onToggle={(id) => togglePlayer('A', id)}
          onSelectAll={() => selectAll('A')}
        />

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>vs</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Team B */}
        <TeamSection
          teamName={teamB.name}
          players={playersB}
          selected={selectedB}
          onToggle={(id) => togglePlayer('B', id)}
          onSelectAll={() => selectAll('B')}
        />
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.startButton, !canStart && styles.startButtonDisabled]}
          onPress={handleStartMatch}
          disabled={!canStart}
          activeOpacity={0.8}
        >
          {creating ? (
            <ActivityIndicator size="small" color={Colors.deepNavy} />
          ) : (
            <Text style={styles.startButtonText}>
              Start Match ({selectedA.size} vs {selectedB.size})
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Team Section Sub-component
// ---------------------------------------------------------------------------

function TeamSection({
  teamName,
  players,
  selected,
  onToggle,
  onSelectAll,
}: {
  teamName: string;
  players: PlayerDoc[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onSelectAll: () => void;
}) {
  return (
    <View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{teamName.toUpperCase()}</Text>
        <View style={styles.sectionRight}>
          <Text style={styles.counter}>{selected.size}/11</Text>
          {players.length > 0 && selected.size < players.length && (
            <TouchableOpacity onPress={onSelectAll} activeOpacity={0.7}>
              <Text style={styles.selectAllText}>Select All</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {players.length === 0 ? (
        <Text style={styles.noPlayers}>No players registered</Text>
      ) : (
        players.map((player) => {
          const isSelected = selected.has(player.id);
          const badgeColor = roleBadgeColors[player.role];
          return (
            <TouchableOpacity
              key={player.id}
              style={[styles.playerRow, isSelected && styles.playerRowSelected]}
              onPress={() => onToggle(player.id)}
              activeOpacity={0.7}
            >
              {/* Checkbox */}
              <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                {isSelected && <Text style={styles.checkmark}>✓</Text>}
              </View>

              {/* Avatar */}
              <View style={styles.playerAvatar}>
                <Text style={styles.playerInitial}>
                  {player.name.charAt(0).toUpperCase()}
                </Text>
              </View>

              {/* Info */}
              <View style={styles.playerInfo}>
                <Text style={[styles.playerName, isSelected && styles.playerNameSelected]}>
                  {player.name}
                </Text>
                <Text style={styles.playerHand}>
                  {player.hand === 'left' ? 'Left' : 'Right'}-handed
                </Text>
              </View>

              {/* Role badge */}
              <View style={[styles.roleBadge, { backgroundColor: badgeColor.bg }]}>
                <Text style={[styles.roleBadgeText, { color: badgeColor.text }]}>
                  {roleLabels[player.role]}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.deepNavy,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.sm,
    marginTop: Spacing.md,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  backText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.sm,
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textSecondary,
    letterSpacing: 2,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.electricGreen,
    letterSpacing: 2,
  },
  sectionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  counter: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textSecondary,
  },
  selectAllText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.electricGreen,
    fontWeight: Typography.fontWeight.semibold,
  },
  noPlayers: {
    color: Colors.gray500,
    fontSize: Typography.fontSize.sm,
    fontStyle: 'italic',
    paddingVertical: Spacing.md,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray800,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm + 2,
    marginBottom: Spacing.xs + 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  playerRowSelected: {
    borderColor: Colors.electricGreen + '4D',
    backgroundColor: Colors.electricGreen + '0D',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: BorderRadius.sm + 2,
    borderWidth: 2,
    borderColor: Colors.gray600,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  checkboxSelected: {
    backgroundColor: Colors.electricGreen,
    borderColor: Colors.electricGreen,
  },
  checkmark: {
    fontSize: 13,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.deepNavy,
  },
  playerAvatar: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray700,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  playerInitial: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.gray400,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.white,
  },
  playerNameSelected: {
    color: Colors.electricGreen,
  },
  playerHand: {
    fontSize: Typography.fontSize.xs,
    color: Colors.gray500,
  },
  roleBadge: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: Typography.fontWeight.bold,
    letterSpacing: 1,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    color: Colors.gray500,
    fontSize: Typography.fontSize.xs,
    marginHorizontal: Spacing.md,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  startButton: {
    backgroundColor: Colors.electricGreen,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  startButtonDisabled: {
    opacity: 0.4,
  },
  startButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.deepNavy,
  },
});
