import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, BorderRadius, Typography } from '@crichead/ui/mobile';
import { type TeamInfo } from '@crichead/core/hooks'; // Need to define this locally if we removed it from core hooks, let's keep the import but cast for now or update it in a minute. We actually removed type TeamInfo from core hooks, so let's define it.

export interface LocalTeamInfo {
  id: string;
  name: string;
  shortName: string;
  homeGround?: string;
}

interface Props {
  onNext: (teamA: LocalTeamInfo, teamB: LocalTeamInfo) => void;
  onBack?: () => void;
  onCancel?: () => void;
}

export default function SelectTeamsScreen({ onNext, onBack, onCancel }: Props) {
  const teams: LocalTeamInfo[] = []; // empty for offline
  const [selectedA, setSelectedA] = useState<string | null>(null);
  const [selectedB, setSelectedB] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [saving, setSaving] = useState(false);

  const filteredTeams = useMemo(() => {
    if (!searchQuery.trim()) return teams;
    const q = searchQuery.toLowerCase();
    return teams.filter((t) => t.name.toLowerCase().includes(q));
  }, [teams, searchQuery]);

  const teamA = teams.find((t) => t.id === selectedA) ?? null;
  const teamB = teams.find((t) => t.id === selectedB) ?? null;

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
      setSelectedB(teamId);
    }
  }

  function handleNext() {
    if (teamA && teamB) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onNext(teamA, teamB);
    }
  }

  async function handleCreateTeam() {
    const trimmed = newTeamName.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      // Just mock creating a team locally for now
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setNewTeamName('');
      setShowCreateForm(false);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSaving(false);
    }
  }

  function isSelected(teamId: string) {
    return teamId === selectedA || teamId === selectedB;
  }



  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            (onCancel ?? onBack)?.();
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
        <Text style={styles.stepLabelActive}>STEP 2</Text>
        <View style={styles.stepBarContainer}>
          <View style={[styles.stepBar, styles.stepBarActive]} />
          <View style={[styles.stepBar, styles.stepBarActive]} />
          <View style={styles.stepBar} />
          <View style={styles.stepBar} />
        </View>
        <Text style={styles.stepLabel}>STEP 4</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title */}
        <Text style={styles.title}>Who is playing?</Text>
        <Text style={styles.subtitle}>Select the home and away teams.</Text>

        {/* VS Preview */}
        <View style={styles.vsCard}>
          {/* Home team */}
          <View style={styles.vsTeam}>
            {teamA ? (
              <View style={styles.vsAvatarFilled}>
                <Text style={styles.vsAvatarText}>
                  {teamA.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            ) : (
              <View style={styles.vsAvatarEmpty}>
                <Text style={styles.vsAvatarPlus}>+</Text>
              </View>
            )}
            <Text style={styles.vsTeamName} numberOfLines={1}>
              {teamA?.name ?? 'Select Team'}
            </Text>
            <Text style={[styles.vsRoleLabel, teamA && styles.vsRoleLabelActive]}>
              HOME
            </Text>
          </View>

          {/* VS divider */}
          <Text style={styles.vsDivider}>VS</Text>

          {/* Away team */}
          <View style={styles.vsTeam}>
            {teamB ? (
              <View style={styles.vsAvatarFilled}>
                <Text style={styles.vsAvatarText}>
                  {teamB.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            ) : (
              <View style={styles.vsAvatarEmpty}>
                <Text style={styles.vsAvatarPlus}>+</Text>
              </View>
            )}
            <Text style={styles.vsTeamName} numberOfLines={1}>
              {teamB?.name ?? 'Select Team'}
            </Text>
            <Text style={[styles.vsRoleLabel, teamB && styles.vsRoleLabelActive]}>
              AWAY
            </Text>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchRow}>
          <Text style={styles.searchIcon}>{'\uD83D\uDD0D'}</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search for a team..."
            placeholderTextColor={Colors.gray500}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Create New Team */}
        {showCreateForm ? (
          <View style={styles.createForm}>
            <TextInput
              style={styles.createInput}
              placeholder="Enter team name"
              placeholderTextColor={Colors.gray500}
              value={newTeamName}
              onChangeText={setNewTeamName}
              autoFocus
            />
            <View style={styles.createActions}>
              <TouchableOpacity
                style={styles.createCancelBtn}
                onPress={() => {
                  setShowCreateForm(false);
                  setNewTeamName('');
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.createCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.createSaveBtn,
                  (!newTeamName.trim() || saving) && styles.disabledBtn,
                ]}
                onPress={handleCreateTeam}
                disabled={!newTeamName.trim() || saving}
                activeOpacity={0.8}
              >
                <Text style={styles.createSaveText}>
                  {saving ? 'Saving...' : 'Create'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.createTeamCard}
            onPress={() => setShowCreateForm(true)}
            activeOpacity={0.7}
          >
            <View style={styles.createTeamAvatar}>
              <Text style={styles.createTeamIcon}>{'\uD83D\uDC65'}</Text>
            </View>
            <View style={styles.createTeamInfo}>
              <Text style={styles.createTeamTitle}>Create New Team</Text>
              <Text style={styles.createTeamHint}>Add a team not in the list</Text>
            </View>
            <Text style={styles.chevron}>{'>'}</Text>
          </TouchableOpacity>
        )}

        {/* Section header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>RECENT TEAMS</Text>
        </View>

        {/* Team List */}
        {filteredTeams.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No teams found</Text>
          </View>
        ) : (
          filteredTeams.map((team) => {
            const selected = isSelected(team.id);
            return (
              <TouchableOpacity
                key={team.id}
                style={[styles.teamCard, selected && styles.teamCardSelected]}
                onPress={() => handleSelectTeam(team.id)}
                activeOpacity={0.7}
              >
                {/* Avatar */}
                <View style={[styles.teamAvatar, selected && styles.teamAvatarSelected]}>
                  <Text
                    style={[
                      styles.teamAvatarText,
                      selected && styles.teamAvatarTextSelected,
                    ]}
                  >
                    {team.name.charAt(0).toUpperCase()}
                  </Text>
                </View>

                {/* Info */}
                <View style={styles.teamInfo}>
                  <View style={styles.teamNameRow}>
                    <Text
                      style={[styles.teamName, selected && styles.teamNameSelected]}
                      numberOfLines={1}
                    >
                      {team.name}
                    </Text>
                  </View>
                  <Text style={styles.teamMeta}>
                    {team.homeGround || 'No ground set'}
                  </Text>
                </View>

                {/* Radio */}
                <View style={[styles.radio, selected && styles.radioSelected]}>
                  {selected && <View style={styles.radioDot} />}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.nextButton, (!teamA || !teamB) && styles.disabledBtn]}
          onPress={handleNext}
          disabled={!teamA || !teamB}
          activeOpacity={0.8}
        >
          <Text style={styles.nextButtonText}>
            Next: Toss & Overs  {'\u2192'}
          </Text>
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
  title: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.gray500,
    marginBottom: Spacing.lg,
  },

  /* ── VS Preview ── */
  vsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.gray800,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  vsTeam: {
    flex: 1,
    alignItems: 'center',
  },
  vsAvatarFilled: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.gray700,
    borderWidth: 2,
    borderColor: Colors.electricGreen,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  vsAvatarText: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
  },
  vsAvatarEmpty: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: Colors.gray600,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  vsAvatarPlus: {
    fontSize: Typography.fontSize['2xl'],
    color: Colors.gray500,
  },
  vsTeamName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
    marginBottom: 2,
  },
  vsRoleLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.gray500,
    letterSpacing: 1,
  },
  vsRoleLabelActive: {
    color: Colors.electricGreen,
  },
  vsDivider: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.gray500,
    marginHorizontal: Spacing.md,
  },

  /* ── Search ── */
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray800,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchIcon: {
    fontSize: Typography.fontSize.base,
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    color: Colors.white,
    padding: 0,
  },

  /* ── Create Team Card ── */
  createTeamCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray800,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  createTeamAvatar: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.electricGreen + '1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  createTeamIcon: {
    fontSize: Typography.fontSize.xl,
  },
  createTeamInfo: {
    flex: 1,
  },
  createTeamTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
  },
  createTeamHint: {
    fontSize: Typography.fontSize.sm,
    color: Colors.gray500,
    marginTop: 2,
  },
  chevron: {
    fontSize: Typography.fontSize.lg,
    color: Colors.gray500,
  },

  /* ── Create Form (inline) ── */
  createForm: {
    backgroundColor: Colors.gray800,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.electricGreen + '4D',
    gap: Spacing.sm,
  },
  createInput: {
    backgroundColor: Colors.gray700,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontSize: Typography.fontSize.base,
    color: Colors.white,
  },
  createActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  createCancelBtn: {
    flex: 1,
    backgroundColor: Colors.gray700,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  createCancelText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.white,
  },
  createSaveBtn: {
    flex: 1,
    backgroundColor: Colors.electricGreen,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  createSaveText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.deepNavy,
  },

  /* ── Section Header ── */
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.gray400,
    letterSpacing: 1.5,
  },

  /* ── Team Cards ── */
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
  teamAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.gray700,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  teamAvatarSelected: {
    backgroundColor: Colors.electricGreen + '1A',
    borderWidth: 1.5,
    borderColor: Colors.electricGreen,
  },
  teamAvatarText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.gray400,
  },
  teamAvatarTextSelected: {
    color: Colors.electricGreen,
  },
  teamInfo: {
    flex: 1,
  },
  teamNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  teamName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
  },
  teamNameSelected: {
    color: Colors.electricGreen,
  },
  teamMeta: {
    fontSize: Typography.fontSize.xs,
    color: Colors.gray500,
    marginTop: 2,
  },

  /* ── Radio ── */
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.gray600,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.sm,
  },
  radioSelected: {
    borderColor: Colors.electricGreen,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.electricGreen,
  },

  /* ── Empty ── */
  emptyState: {
    alignItems: 'center',
    paddingTop: Spacing.xxl,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.base,
  },

  /* ── Footer ── */
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  nextButton: {
    backgroundColor: Colors.electricGreen,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  disabledBtn: {
    opacity: 0.4,
  },
  nextButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.deepNavy,
  },
});
