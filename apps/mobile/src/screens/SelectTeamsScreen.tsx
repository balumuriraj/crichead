import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, BorderRadius, Typography } from '@crichead/ui/mobile';
import { getFirebaseDb } from '@crichead/core';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

export interface TeamInfo {
  id: string;
  name: string;
  logoUrl: string;
  homeGround: string;
}

interface Props {
  onNext: (teamA: TeamInfo, teamB: TeamInfo) => void;
}

export default function SelectTeamsScreen({ onNext }: Props) {
  const [teams, setTeams] = useState<TeamInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedA, setSelectedA] = useState<string | null>(null);
  const [selectedB, setSelectedB] = useState<string | null>(null);

  useEffect(() => {
    const db = getFirebaseDb();
    const q = query(collection(db, 'teams'), orderBy('name'));
    const unsub = onSnapshot(q, (snap) => {
      setTeams(snap.docs.map((d) => ({ id: d.id, ...d.data() } as TeamInfo)));
      setLoading(false);
    });
    return unsub;
  }, []);

  function handleSelectTeam(teamId: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (selectedA === teamId) {
      setSelectedA(null);
      return;
    }
    if (selectedB === teamId) {
      setSelectedB(null);
      return;
    }

    if (!selectedA) {
      setSelectedA(teamId);
    } else if (!selectedB) {
      setSelectedB(teamId);
    } else {
      // Both selected — replace B
      setSelectedB(teamId);
    }
  }

  function handleNext() {
    const teamA = teams.find((t) => t.id === selectedA);
    const teamB = teams.find((t) => t.id === selectedB);
    if (teamA && teamB) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onNext(teamA, teamB);
    }
  }

  function getSelectionLabel(teamId: string): string | null {
    if (teamId === selectedA) return 'A';
    if (teamId === selectedB) return 'B';
    return null;
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.electricGreen} />
          <Text style={styles.loadingText}>Loading teams...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.brand}>
          cric<Text style={styles.brandAccent}>head</Text>
        </Text>
        <Text style={styles.title}>SELECT TEAMS</Text>
        <Text style={styles.subtitle}>
          Tap to pick Team A, then Team B
        </Text>
      </View>

      {/* Team List */}
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {teams.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🏏</Text>
            <Text style={styles.emptyText}>No teams found</Text>
            <Text style={styles.emptyHint}>
              Create teams in the web app first
            </Text>
          </View>
        ) : (
          teams.map((team) => {
            const label = getSelectionLabel(team.id);
            const isSelected = !!label;
            return (
              <TouchableOpacity
                key={team.id}
                style={[styles.teamCard, isSelected && styles.teamCardSelected]}
                onPress={() => handleSelectTeam(team.id)}
                activeOpacity={0.7}
              >
                {/* Avatar */}
                <View style={[styles.avatar, isSelected && styles.avatarSelected]}>
                  {label ? (
                    <Text style={styles.avatarLabel}>{label}</Text>
                  ) : (
                    <Text style={styles.avatarInitial}>
                      {team.name.charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>

                {/* Info */}
                <View style={styles.teamInfo}>
                  <Text style={[styles.teamName, isSelected && styles.teamNameSelected]}>
                    {team.name}
                  </Text>
                  {team.homeGround ? (
                    <Text style={styles.teamGround}>{team.homeGround}</Text>
                  ) : null}
                </View>

                {/* Selection badge */}
                {isSelected && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      Team {label}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Bottom action */}
      <View style={styles.footer}>
        <View style={styles.selectionSummary}>
          <Text style={styles.summaryText}>
            {selectedA
              ? teams.find((t) => t.id === selectedA)?.name ?? '—'
              : '—'}
          </Text>
          <Text style={styles.vsText}>vs</Text>
          <Text style={styles.summaryText}>
            {selectedB
              ? teams.find((t) => t.id === selectedB)?.name ?? '—'
              : '—'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.nextButton, (!selectedA || !selectedB) && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={!selectedA || !selectedB}
          activeOpacity={0.8}
        >
          <Text style={styles.nextButtonText}>Select Players →</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

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
  brand: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
    marginBottom: Spacing.md,
  },
  brandAccent: {
    color: Colors.electricGreen,
  },
  title: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textSecondary,
    letterSpacing: 2,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.gray500,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.base,
    marginBottom: Spacing.xs,
  },
  emptyHint: {
    color: Colors.gray500,
    fontSize: Typography.fontSize.sm,
  },
  teamCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray800,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  teamCardSelected: {
    borderColor: Colors.electricGreen + '66',
    backgroundColor: Colors.electricGreen + '0D',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.gray700,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  avatarSelected: {
    backgroundColor: Colors.electricGreen,
  },
  avatarInitial: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.gray500,
  },
  avatarLabel: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.extrabold,
    color: Colors.deepNavy,
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
  },
  teamNameSelected: {
    color: Colors.electricGreen,
  },
  teamGround: {
    fontSize: Typography.fontSize.xs,
    color: Colors.gray500,
    marginTop: 2,
  },
  badge: {
    backgroundColor: Colors.electricGreen + '1A',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.electricGreen + '4D',
  },
  badgeText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.electricGreen,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  selectionSummary: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  summaryText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
  },
  vsText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.gray500,
    marginHorizontal: Spacing.sm,
  },
  nextButton: {
    backgroundColor: Colors.electricGreen,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  nextButtonDisabled: {
    opacity: 0.4,
  },
  nextButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.deepNavy,
  },
});
