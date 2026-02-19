import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, BorderRadius, Typography } from '@crichead/ui/mobile';
import { getFirebaseDb, type TossDecision, type PlayerRole } from '@crichead/core';
import { addDoc, collection } from 'firebase/firestore';
import type { QuickMatchConfig } from '../types/QuickMatchConfig';

/* ── Temporary data ── */

interface TempPlayer {
  id: string;
  name: string;
  role: PlayerRole;
}

const HOME_TEAM = { id: '_home', name: 'Home', initial: 'H' };
const AWAY_TEAM = { id: '_away', name: 'Away', initial: 'A' };

function makePlayers(prefix: string, count: number): TempPlayer[] {
  const roles: PlayerRole[] = [];
  // Distribute roles: ~40% bat, ~20% all, ~40% bowl
  for (let i = 0; i < count; i++) {
    if (i < Math.ceil(count * 0.4)) roles.push('bat');
    else if (i < Math.ceil(count * 0.6)) roles.push('all');
    else roles.push('bowl');
  }
  return roles.map((role, i) => ({
    id: `${prefix}_${i + 1}`,
    name: `${prefix} Player ${i + 1}`,
    role,
  }));
}

const OVERS_PRESETS = [5, 10, 15, 20];

/* ── Component ── */

interface Props {
  onMatchCreated: (matchId: string | null, config: QuickMatchConfig) => void;
  onCancel: () => void;
}

export default function QuickMatchScreen({ onMatchCreated, onCancel }: Props) {
  const [overs, setOvers] = useState(20);
  const [playersPerSide, setPlayersPerSide] = useState(11);
  const [tossWinner, setTossWinner] = useState<string | null>(null);
  const [tossDecision, setTossDecision] = useState<TossDecision | null>(null);
  const [liveMode, setLiveMode] = useState(true);
  const [creating, setCreating] = useState(false);

  const homePlayers = makePlayers('Home', playersPerSide);
  const awayPlayers = makePlayers('Away', playersPerSide);

  function handleOversChange(delta: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setOvers((prev) => Math.max(1, Math.min(50, prev + delta)));
  }

  function handlePlayersChange(delta: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPlayersPerSide((prev) => Math.max(2, Math.min(11, prev + delta)));
  }

  async function handleStartMatch() {
    if (!tossWinner || !tossDecision) {
      Alert.alert('Toss Required', 'Select who won the toss and their decision.');
      return;
    }

    setCreating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      const battingFirstId =
        tossDecision === 'bat'
          ? tossWinner
          : tossWinner === HOME_TEAM.id
            ? AWAY_TEAM.id
            : HOME_TEAM.id;

      const config: QuickMatchConfig = {
        teamA: HOME_TEAM.id,
        teamAName: HOME_TEAM.name,
        teamB: AWAY_TEAM.id,
        teamBName: AWAY_TEAM.name,
        toss: { winner: tossWinner, decision: tossDecision },
        playingXI: {
          [HOME_TEAM.id]: homePlayers.map((p) => ({ id: p.id, name: p.name, role: p.role })),
          [AWAY_TEAM.id]: awayPlayers.map((p) => ({ id: p.id, name: p.name, role: p.role })),
        },
        oversPerInnings: overs,
        playersPerSide,
      };

      if (liveMode) {
        const db = getFirebaseDb();
        const matchDoc = {
          ...config,
          status: 'live' as const,
          currentInningsIndex: 0,
          innings: [{ teamId: battingFirstId, totalRuns: 0, totalWickets: 0, overs: 0, ballCount: 0 }],
          quickMatch: true,
        };
        const ref = await addDoc(collection(db, 'matches'), matchDoc);
        onMatchCreated(ref.id, config);
      } else {
        onMatchCreated(null, config);
      }
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to create match',
      );
      setCreating(false);
    }
  }

  const canStart = tossWinner !== null && tossDecision !== null && !creating;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onCancel();
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quick Match</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Title */}
        <Text style={styles.title}>{'\u26A1'} Quick Match</Text>
        <Text style={styles.subtitle}>
          Instant game with temporary teams. Just pick the toss and go!
        </Text>

        {/* Teams Preview */}
        <View style={styles.teamsCard}>
          <View style={styles.teamSide}>
            <View style={[styles.teamCircle, styles.teamCircleHome]}>
              <Text style={styles.teamCircleText}>{HOME_TEAM.initial}</Text>
            </View>
            <Text style={styles.teamName}>{HOME_TEAM.name}</Text>
            <Text style={styles.teamMeta}>{playersPerSide} Players</Text>
          </View>

          <Text style={styles.vsDivider}>VS</Text>

          <View style={styles.teamSide}>
            <View style={[styles.teamCircle, styles.teamCircleAway]}>
              <Text style={styles.teamCircleText}>{AWAY_TEAM.initial}</Text>
            </View>
            <Text style={styles.teamName}>{AWAY_TEAM.name}</Text>
            <Text style={styles.teamMeta}>{playersPerSide} Players</Text>
          </View>
        </View>

        {/* Match Settings */}
        <View style={styles.settingsCard}>
          <Text style={styles.settingsTitle}>MATCH SETTINGS</Text>

          {/* Overs */}
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Overs per Innings</Text>
            <View style={styles.stepper}>
              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => handleOversChange(-1)}
                activeOpacity={0.7}
              >
                <Text style={styles.stepperBtnText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.stepperValue}>{overs}</Text>
              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => handleOversChange(1)}
                activeOpacity={0.7}
              >
                <Text style={styles.stepperBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick overs presets */}
          <View style={styles.presetsRow}>
            {OVERS_PRESETS.map((v) => (
              <TouchableOpacity
                key={v}
                style={[styles.presetChip, overs === v && styles.presetChipActive]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setOvers(v);
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.presetChipText,
                    overs === v && styles.presetChipTextActive,
                  ]}
                >
                  {v}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Players per side */}
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Players per Side</Text>
            <View style={styles.stepper}>
              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => handlePlayersChange(-1)}
                activeOpacity={0.7}
              >
                <Text style={styles.stepperBtnText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.stepperValue}>{playersPerSide}</Text>
              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => handlePlayersChange(1)}
                activeOpacity={0.7}
              >
                <Text style={styles.stepperBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Live Mode toggle */}
          <View style={styles.settingRow}>
            <View style={styles.settingLabelGroup}>
              <Text style={styles.settingLabel}>Live Mode</Text>
              <Text style={styles.settingSubLabel}>Sync scores to Firebase</Text>
            </View>
            <Switch
              value={liveMode}
              onValueChange={setLiveMode}
              trackColor={{ false: Colors.gray700, true: Colors.electricGreen + '80' }}
              thumbColor={liveMode ? Colors.electricGreen : Colors.gray500}
            />
          </View>
        </View>

        {/* Toss Card */}
        <View style={styles.tossCard}>
          <View style={styles.tossHeader}>
            <Text style={styles.tossIcon}>{'\uD83C\uDFB2'}</Text>
            <Text style={styles.tossHeaderText}>TOSS DECISION</Text>
          </View>

          <Text style={styles.tossQuestion}>WHO WON THE TOSS?</Text>
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[
                styles.optionBtn,
                tossWinner === HOME_TEAM.id && styles.optionBtnActive,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setTossWinner(HOME_TEAM.id);
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.optionBtnText,
                  tossWinner === HOME_TEAM.id && styles.optionBtnTextActive,
                ]}
              >
                {HOME_TEAM.name}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.optionBtn,
                tossWinner === AWAY_TEAM.id && styles.optionBtnActive,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setTossWinner(AWAY_TEAM.id);
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.optionBtnText,
                  tossWinner === AWAY_TEAM.id && styles.optionBtnTextActive,
                ]}
              >
                {AWAY_TEAM.name}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.tossQuestion}>ELECTED TO</Text>
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[
                styles.optionBtn,
                tossDecision === 'bat' && styles.optionBtnActive,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setTossDecision('bat');
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.optionBtnText,
                  tossDecision === 'bat' && styles.optionBtnTextActive,
                ]}
              >
                {'\uD83C\uDFCF'}  Bat
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.optionBtn,
                tossDecision === 'bowl' && styles.optionBtnActive,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setTossDecision('bowl');
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.optionBtnText,
                  tossDecision === 'bowl' && styles.optionBtnTextActive,
                ]}
              >
                {'\uD83E\uDD4E'}  Bowl
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Lineup Preview */}
        <View style={styles.lineupCard}>
          <Text style={styles.lineupTitle}>
            PLAYING {playersPerSide > 1 ? `${playersPerSide}-A-SIDE` : ''}
          </Text>
          <View style={styles.lineupColumns}>
            <View style={styles.lineupCol}>
              <Text style={styles.lineupTeamLabel}>{HOME_TEAM.name}</Text>
              {homePlayers.map((p, i) => (
                <Text key={p.id} style={styles.lineupPlayer}>
                  {i + 1}. {p.name}
                </Text>
              ))}
            </View>
            <View style={styles.lineupDivider} />
            <View style={styles.lineupCol}>
              <Text style={styles.lineupTeamLabel}>{AWAY_TEAM.name}</Text>
              {awayPlayers.map((p, i) => (
                <Text key={p.id} style={styles.lineupPlayer}>
                  {i + 1}. {p.name}
                </Text>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
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

  /* ── Teams Preview ── */
  teamsCard: {
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
  teamSide: {
    flex: 1,
    alignItems: 'center',
  },
  teamCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    borderWidth: 2,
  },
  teamCircleHome: {
    backgroundColor: Colors.electricGreen + '1A',
    borderColor: Colors.electricGreen,
  },
  teamCircleAway: {
    backgroundColor: Colors.info + '1A',
    borderColor: Colors.info,
  },
  teamCircleText: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
  },
  teamName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
    marginBottom: 2,
  },
  teamMeta: {
    fontSize: Typography.fontSize.xs,
    color: Colors.gray500,
  },
  vsDivider: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.gray500,
    marginHorizontal: Spacing.md,
  },

  /* ── Match Settings Card ── */
  settingsCard: {
    backgroundColor: Colors.gray800,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  settingsTitle: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.gray400,
    letterSpacing: 1.5,
    marginBottom: Spacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  settingLabel: {
    fontSize: Typography.fontSize.base,
    color: Colors.white,
  },
  settingLabelGroup: {
    flex: 1,
  },
  settingSubLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.gray500,
    marginTop: 2,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.gray700,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperBtnText: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
  },
  stepperValue: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
    minWidth: 32,
    textAlign: 'center',
  },
  presetsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
  },
  presetChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray700,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  presetChipActive: {
    borderColor: Colors.electricGreen,
    backgroundColor: Colors.electricGreen + '1A',
  },
  presetChipText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.gray400,
  },
  presetChipTextActive: {
    color: Colors.electricGreen,
  },

  /* ── Toss Card ── */
  tossCard: {
    backgroundColor: Colors.gray800,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tossHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  tossIcon: {
    fontSize: Typography.fontSize.lg,
  },
  tossHeaderText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
    letterSpacing: 1.5,
  },
  tossQuestion: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.gray400,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  btnRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  optionBtn: {
    flex: 1,
    backgroundColor: Colors.gray700,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm + 2,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  optionBtnActive: {
    backgroundColor: Colors.electricGreen,
    borderColor: Colors.electricGreen,
  },
  optionBtnText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
  },
  optionBtnTextActive: {
    color: Colors.deepNavy,
  },

  /* ── Lineup Preview ── */
  lineupCard: {
    backgroundColor: Colors.gray800,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  lineupTitle: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.gray400,
    letterSpacing: 1.5,
    marginBottom: Spacing.md,
  },
  lineupColumns: {
    flexDirection: 'row',
  },
  lineupCol: {
    flex: 1,
  },
  lineupDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.md,
  },
  lineupTeamLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.electricGreen,
    marginBottom: Spacing.sm,
  },
  lineupPlayer: {
    fontSize: Typography.fontSize.xs,
    color: Colors.gray400,
    paddingVertical: 2,
  },

  /* ── Footer ── */
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
