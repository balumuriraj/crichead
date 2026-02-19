import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Calendar, ChevronRight, Play, ChevronDown, Zap, Smartphone } from 'lucide-react-native';
import { listLocalMatches, type LocalMatchRecord } from '../../src/utils/localMatchStore';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, BorderRadius, Typography } from '@crichead/ui/mobile';
import { getFirebaseDb } from '@crichead/core';
import { collection, onSnapshot, query, where, limit } from 'firebase/firestore';

interface MatchDoc {
  id: string;
  teamA: string;
  teamB: string;
  status: 'upcoming' | 'live' | 'finished';
}

export default function HomeScreen() {
  const router = useRouter();
  const [matches, setMatches] = useState<MatchDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [localMatches, setLocalMatches] = useState<LocalMatchRecord[]>([]);

  useFocusEffect(
    useCallback(() => {
      listLocalMatches().then(setLocalMatches);
    }, []),
  );

  useEffect(() => {
    const db = getFirebaseDb();
    const q = query(
      collection(db, 'matches'),
      where('status', 'in', ['upcoming', 'live']),
      limit(20)
    );
    const unsub = onSnapshot(q, (snap) => {
      setMatches(snap.docs.map((d) => ({ id: d.id, ...d.data() } as MatchDoc)));
      setLoading(false);
    });
    return unsub;
  }, []);

  const liveMatches = matches.filter((m) => m.status === 'live');
  const upcomingMatches = matches.filter((m) => m.status === 'upcoming');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.brand}>
          cric<Text style={styles.brandAccent}>head</Text>
        </Text>

        {/* Split Button */}
        <View style={styles.splitButton}>
          <TouchableOpacity
            style={styles.splitMain}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/match/new');
            }}
            activeOpacity={0.8}
          >
            <Play size={14} color={Colors.deepNavy} strokeWidth={3} />
            <Text style={styles.splitMainText}>Start Match</Text>
          </TouchableOpacity>
          <View style={styles.splitDivider} />
          <TouchableOpacity
            style={styles.splitDropdown}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowDropdown(true);
            }}
            activeOpacity={0.8}
          >
            <ChevronDown size={14} color={Colors.deepNavy} strokeWidth={3} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Dropdown Menu */}
      <Modal
        visible={showDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDropdown(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setShowDropdown(false)}>
          <View style={styles.dropdownMenu}>
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setShowDropdown(false);
                router.push('/match/new');
              }}
              activeOpacity={0.7}
            >
              <Play size={16} color={Colors.electricGreen} strokeWidth={2.5} />
              <View style={styles.dropdownItemInfo}>
                <Text style={styles.dropdownItemTitle}>New Match</Text>
                <Text style={styles.dropdownItemHint}>Full setup wizard</Text>
              </View>
            </TouchableOpacity>
            <View style={styles.dropdownDivider} />
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setShowDropdown(false);
                router.push('/match/quick');
              }}
              activeOpacity={0.7}
            >
              <Zap size={16} color={Colors.warning} strokeWidth={2.5} />
              <View style={styles.dropdownItemInfo}>
                <Text style={styles.dropdownItemTitle}>Quick Match</Text>
                <Text style={styles.dropdownItemHint}>
                  Skip setup, start instantly
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        {/* Live Matches */}
        {liveMatches.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.liveDot} />
              <Text style={styles.sectionTitle}>LIVE NOW</Text>
            </View>
            {liveMatches.map((match) => (
              <TouchableOpacity
                key={match.id}
                style={[styles.matchCard, styles.matchCardLive]}
                onPress={() => router.push(`/match/${match.id}`)}
                activeOpacity={0.7}
              >
                <View style={styles.matchInfo}>
                  <Text style={styles.matchTeams}>{match.teamA} vs {match.teamB}</Text>
                  <Text style={styles.matchStatus}>In Progress</Text>
                </View>
                <ChevronRight size={18} color={Colors.electricGreen} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Local Matches */}
        {localMatches.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Smartphone size={14} color={Colors.gray500} />
              <Text style={styles.sectionTitle}>LOCAL MATCHES</Text>
            </View>
            {localMatches.map((m) => (
              <TouchableOpacity
                key={m.id}
                style={styles.matchCard}
                onPress={() => router.push(`/match/local-${m.id}`)}
                activeOpacity={0.7}
              >
                <View style={styles.matchInfo}>
                  <Text style={styles.matchTeams}>
                    {m.config.teamAName} vs {m.config.teamBName}
                  </Text>
                  <Text style={styles.matchStatus}>
                    Local · {m.config.oversPerInnings} overs
                  </Text>
                </View>
                <ChevronRight size={18} color={Colors.gray500} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Upcoming Matches */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Calendar size={14} color={Colors.gray500} />
            <Text style={styles.sectionTitle}>UPCOMING</Text>
          </View>
          {loading ? (
            <ActivityIndicator color={Colors.electricGreen} style={{ marginTop: Spacing.xl }} />
          ) : upcomingMatches.length === 0 && liveMatches.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No upcoming matches</Text>
              <Text style={styles.emptyHint}>Tap "Start Match" to create one</Text>
            </View>
          ) : (
            upcomingMatches.map((match) => (
              <TouchableOpacity
                key={match.id}
                style={styles.matchCard}
                onPress={() => router.push(`/match/${match.id}`)}
                activeOpacity={0.7}
              >
                <View style={styles.matchInfo}>
                  <Text style={styles.matchTeams}>{match.teamA} vs {match.teamB}</Text>
                  <Text style={styles.matchStatus}>Scheduled</Text>
                </View>
                <ChevronRight size={18} color={Colors.gray500} />
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.deepNavy,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  brand: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
  },
  brandAccent: {
    color: Colors.electricGreen,
  },

  /* ── Split Button ── */
  splitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.electricGreen,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  splitMain: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  splitMainText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.deepNavy,
  },
  splitDivider: {
    width: 1,
    height: 20,
    backgroundColor: Colors.deepNavy + '33',
  },
  splitDropdown: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* ── Dropdown Menu ── */
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 100,
    paddingRight: Spacing.lg,
  },
  dropdownMenu: {
    backgroundColor: Colors.gray800,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    width: 220,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  dropdownItemInfo: {
    flex: 1,
  },
  dropdownItemTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
  },
  dropdownItemHint: {
    fontSize: Typography.fontSize.xs,
    color: Colors.gray500,
    marginTop: 1,
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.md,
  },

  /* ── Content ── */
  content: {
    flex: 1,
  },
  contentInner: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.gray500,
    letterSpacing: 2,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.electricGreen,
  },
  matchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray800,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  matchCardLive: {
    borderColor: Colors.electricGreen + '4D',
  },
  matchInfo: {
    flex: 1,
  },
  matchTeams: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
  },
  matchStatus: {
    fontSize: Typography.fontSize.xs,
    color: Colors.gray500,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: Spacing.xxl,
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
});
