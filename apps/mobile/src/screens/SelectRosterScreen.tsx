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
  TextInput,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, BorderRadius, Typography } from '@crichead/ui/mobile';
import { type PlayerRole, type Toss, type MatchConfig } from '@crichead/core';
import { usePlayersQuery, type TeamInfo, type PlayerDoc } from '@crichead/core/hooks';
import { getFirebaseDb, createPlayer, createMatch } from '@crichead/core/firebase';

interface Props {
  teamA: TeamInfo;
  teamB: TeamInfo;
  toss: Toss;
  config?: MatchConfig;
  onNext: (matchId: string) => void;
  onBack: () => void;
  onCancel?: () => void;
}

const ROLE_LABELS: Record<PlayerRole, string> = {
  bat: 'RHB',
  bowl: 'RAF',
  all: 'AR',
};

const ROLE_ICONS: Record<PlayerRole, string> = {
  bat: '\uD83C\uDFCF',
  bowl: '\uD83E\uDD4E',
  all: '\u221E',
};

export default function SelectRosterScreen({
  teamA,
  teamB,
  toss,
  config,
  onNext,
  onBack,
  onCancel,
}: Props) {
  const [selectedA, setSelectedA] = useState<Set<string>>(new Set());
  const [selectedB, setSelectedB] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<'A' | 'B'>('A');

  // Add player state
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerRole, setNewPlayerRole] = useState<PlayerRole>('bat');
  const [savingPlayer, setSavingPlayer] = useState(false);

  const { players: playersA, loading: loadingA } = usePlayersQuery(teamA.id);
  const { players: playersB, loading: loadingB } = usePlayersQuery(teamB.id);

  const loading = loadingA || loadingB;

  const activePlayers = activeTab === 'A' ? playersA : playersB;
  const activeSelected = activeTab === 'A' ? selectedA : selectedB;
  const activeTeam = activeTab === 'A' ? teamA : teamB;

  function togglePlayer(playerId: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const setter = activeTab === 'A' ? setSelectedA : setSelectedB;
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

  async function handleAddPlayer() {
    const trimmed = newPlayerName.trim();
    if (!trimmed) return;
    setSavingPlayer(true);
    try {
      await createPlayer(activeTeam.id, trimmed, newPlayerRole, 'right');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setNewPlayerName('');
      setShowAddPlayer(false);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSavingPlayer(false);
    }
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

      // Determine batting first team based on toss
      const battingFirstTeamId =
        toss.decision === 'bat'
          ? toss.winner
          : toss.winner === teamA.id
            ? teamB.id
            : teamA.id;

      const matchDoc = {
        teamA: teamA.id,
        teamB: teamB.id,
        toss,
        status: 'live' as const,
        currentInningsIndex: 0,
        innings: [
          {
            teamId: battingFirstTeamId,
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
        oversPerInnings: config?.oversPerInnings ?? 20,
        wicketsPerInnings: config?.wicketsPerInnings ?? 10,
        playersPerSide: Math.max(xiA.length, xiB.length),
      };

      const matchId = await createMatch(matchDoc);
      onNext(matchId);
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to create match',
      );
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
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            (onCancel ?? onBack)();
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Match</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Step Indicator */}
      <View style={styles.stepRow}>
        <Text style={styles.stepLabelActive}>STEP 4</Text>
        <View style={styles.stepBarContainer}>
          <View style={[styles.stepBar, styles.stepBarActive]} />
          <View style={[styles.stepBar, styles.stepBarActive]} />
          <View style={[styles.stepBar, styles.stepBarActive]} />
          <View style={[styles.stepBar, styles.stepBarActive]} />
        </View>
        <Text style={styles.stepLabel}>STEP 4</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Playing XI Header ── */}
        <View style={styles.xiHeader}>
          <Text style={styles.xiTitle}>Playing XI</Text>
          <View style={styles.selectedBadge}>
            <Text style={styles.selectedBadgeText}>
              {activeSelected.size} Selected
            </Text>
          </View>
        </View>

        {/* ── Team Tabs ── */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'A' && styles.tabActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveTab('A');
              setShowAddPlayer(false);
            }}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'A' && styles.tabTextActive,
              ]}
            >
              {teamA.name}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'B' && styles.tabActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveTab('B');
              setShowAddPlayer(false);
            }}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'B' && styles.tabTextActive,
              ]}
            >
              {teamB.name}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Column Headers ── */}
        <View style={styles.colHeader}>
          <Text style={[styles.colText, { width: 32 }]}>#</Text>
          <Text style={[styles.colText, { flex: 1 }]}>PLAYER</Text>
          <Text style={[styles.colText, { width: 60, textAlign: 'center' }]}>
            ROLE
          </Text>
          <Text style={[styles.colText, { width: 40, textAlign: 'center' }]}>
            SEL
          </Text>
        </View>

        {/* ── Player Rows ── */}
        {activePlayers.length === 0 && !showAddPlayer ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No players registered</Text>
            <Text style={styles.emptyHint}>
              Add players using the button below
            </Text>
          </View>
        ) : (
          activePlayers.map((player, idx) => {
            const isSelected = activeSelected.has(player.id);
            return (
              <TouchableOpacity
                key={player.id}
                style={[styles.playerRow, isSelected && styles.playerRowSelected]}
                onPress={() => togglePlayer(player.id)}
                activeOpacity={0.7}
              >
                {/* Number */}
                <Text style={styles.playerNum}>
                  {String(idx + 1).padStart(2, '0')}
                </Text>

                {/* Info */}
                <View style={styles.playerInfo}>
                  <Text
                    style={[
                      styles.playerName,
                      isSelected && styles.playerNameSelected,
                    ]}
                    numberOfLines={1}
                  >
                    {player.name}
                  </Text>
                  <View style={styles.playerBadges}>
                    <View style={styles.roleBadge}>
                      <Text style={styles.roleBadgeText}>
                        {ROLE_LABELS[player.role]}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Role icon */}
                <Text style={styles.roleIcon}>{ROLE_ICONS[player.role]}</Text>

                {/* Checkbox */}
                <View
                  style={[
                    styles.checkbox,
                    isSelected && styles.checkboxSelected,
                  ]}
                >
                  {isSelected && (
                    <Text style={styles.checkmark}>{'\u2713'}</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* ── Add New Player ── */}
        {showAddPlayer ? (
          <View style={styles.addPlayerForm}>
            <TextInput
              style={styles.addPlayerInput}
              placeholder="Player name"
              placeholderTextColor={Colors.gray500}
              value={newPlayerName}
              onChangeText={setNewPlayerName}
              autoFocus
            />
            <View style={styles.rolePickerRow}>
              {(
                [
                  ['bat', 'Batsman'],
                  ['bowl', 'Bowler'],
                  ['all', 'All-rounder'],
                ] as [PlayerRole, string][]
              ).map(([role, label]) => (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.rolePickerBtn,
                    newPlayerRole === role && styles.rolePickerBtnActive,
                  ]}
                  onPress={() => setNewPlayerRole(role)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.rolePickerText,
                      newPlayerRole === role && styles.rolePickerTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.addPlayerActions}>
              <TouchableOpacity
                style={styles.addPlayerCancelBtn}
                onPress={() => {
                  setShowAddPlayer(false);
                  setNewPlayerName('');
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.addPlayerCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.addPlayerSaveBtn,
                  (!newPlayerName.trim() || savingPlayer) && styles.disabledBtn,
                ]}
                onPress={handleAddPlayer}
                disabled={!newPlayerName.trim() || savingPlayer}
                activeOpacity={0.8}
              >
                <Text style={styles.addPlayerSaveText}>
                  {savingPlayer ? 'Saving...' : 'Add'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.addPlayerCard}
            onPress={() => setShowAddPlayer(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.addPlayerCardIcon}>{'\uD83D\uDC65'}</Text>
            <Text style={styles.addPlayerCardText}>Add New Player</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* ── Footer ── */}
      <View style={styles.footer}>
        <View style={styles.footerCounts}>
          <Text style={styles.footerCountWhite}>
            {teamA.name.toUpperCase()}: {selectedA.size}/11
          </Text>
          <Text style={styles.footerCountGreen}>
            {teamB.name.toUpperCase()}: {selectedB.size}/11
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.startButton, !canStart && styles.disabledBtn]}
          onPress={handleStartMatch}
          disabled={!canStart}
          activeOpacity={0.8}
        >
          {creating ? (
            <ActivityIndicator size="small" color={Colors.deepNavy} />
          ) : (
            <Text style={styles.startButtonText}>
              START MATCH  {'\uD83C\uDFCF'}
            </Text>
          )}
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

  /* ── Header ── */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  cancelText: {
    fontSize: Typography.fontSize.base,
    color: Colors.white,
  },
  headerTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
  },

  /* ── Step Indicator ── */
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  stepLabelActive: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.electricGreen,
  },
  stepLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.gray500,
  },
  stepBarContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  stepBar: {
    flex: 1,
    height: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray700,
  },
  stepBarActive: {
    backgroundColor: Colors.electricGreen,
  },

  /* ── Scroll ── */
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },

  /* ── Playing XI Header ── */
  xiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  xiTitle: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.extrabold,
    color: Colors.white,
  },
  selectedBadge: {
    backgroundColor: Colors.electricGreen + '1A',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.electricGreen + '4D',
  },
  selectedBadgeText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.electricGreen,
  },

  /* ── Tabs ── */
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: Spacing.md,
  },
  tab: {
    flex: 1,
    paddingBottom: Spacing.sm,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: Colors.electricGreen,
  },
  tabText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.gray500,
  },
  tabTextActive: {
    color: Colors.electricGreen,
  },

  /* ── Column Header ── */
  colHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  colText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.gray500,
    letterSpacing: 1,
  },

  /* ── Player Rows ── */
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray800,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  playerRowSelected: {
    borderColor: Colors.electricGreen + '4D',
    backgroundColor: Colors.electricGreen + '0D',
  },
  playerNum: {
    width: 24,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.gray500,
  },
  playerInfo: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  playerName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
  },
  playerNameSelected: {
    color: Colors.electricGreen,
  },
  playerBadges: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: 2,
  },
  roleBadge: {
    backgroundColor: Colors.gray700,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.xs + 2,
    paddingVertical: 1,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.gray400,
    letterSpacing: 0.5,
  },
  roleIcon: {
    fontSize: Typography.fontSize.lg,
    marginRight: Spacing.md,
  },

  /* ── Checkbox ── */
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.gray600,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: Colors.electricGreen,
    borderColor: Colors.electricGreen,
  },
  checkmark: {
    fontSize: 14,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.deepNavy,
  },

  /* ── Empty State ── */
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
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

  /* ── Add Player Card ── */
  addPlayerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.electricGreen + '4D',
    borderStyle: 'dashed',
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  addPlayerCardIcon: {
    fontSize: Typography.fontSize.base,
  },
  addPlayerCardText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.electricGreen,
  },

  /* ── Add Player Form ── */
  addPlayerForm: {
    backgroundColor: Colors.gray800,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.electricGreen + '4D',
    gap: Spacing.sm,
  },
  addPlayerInput: {
    backgroundColor: Colors.gray700,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontSize: Typography.fontSize.base,
    color: Colors.white,
  },
  rolePickerRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  rolePickerBtn: {
    flex: 1,
    backgroundColor: Colors.gray700,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  rolePickerBtnActive: {
    borderColor: Colors.electricGreen,
    backgroundColor: Colors.electricGreen + '1A',
  },
  rolePickerText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.gray400,
  },
  rolePickerTextActive: {
    color: Colors.electricGreen,
  },
  addPlayerActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  addPlayerCancelBtn: {
    flex: 1,
    backgroundColor: Colors.gray700,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  addPlayerCancelText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.white,
  },
  addPlayerSaveBtn: {
    flex: 1,
    backgroundColor: Colors.electricGreen,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  addPlayerSaveText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.deepNavy,
  },

  /* ── Footer ── */
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  footerCounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  footerCountWhite: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
    letterSpacing: 0.5,
  },
  footerCountGreen: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.electricGreen,
    letterSpacing: 0.5,
  },
  startButton: {
    backgroundColor: Colors.electricGreen,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  disabledBtn: {
    opacity: 0.4,
  },
  startButtonText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.extrabold,
    color: Colors.deepNavy,
    letterSpacing: 1,
  },
});
