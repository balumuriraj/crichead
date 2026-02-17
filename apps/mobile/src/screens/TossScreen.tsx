import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, BorderRadius, Typography } from '@crichead/ui/mobile';
import type { Toss, TossDecision } from '@crichead/core';
import type { TeamInfo } from './SelectTeamsScreen';

interface Props {
  teamA: TeamInfo;
  teamB: TeamInfo;
  onNext: (toss: Toss) => void;
  onBack: () => void;
  onCancel?: () => void;
}

export default function TossScreen({
  teamA,
  teamB,
  onNext,
  onBack,
  onCancel,
}: Props) {
  const [tossWinner, setTossWinner] = useState<string | null>(null);
  const [tossDecision, setTossDecision] = useState<TossDecision | null>(null);

  const canProceed = tossWinner !== null && tossDecision !== null;

  function handleNext() {
    if (!tossWinner || !tossDecision) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onNext({ winner: tossWinner, decision: tossDecision });
  }

  // Derive summary text
  const winnerName =
    tossWinner === teamA.id
      ? teamA.name
      : tossWinner === teamB.id
        ? teamB.name
        : null;
  const loserName =
    tossWinner === teamA.id
      ? teamB.name
      : tossWinner === teamB.id
        ? teamA.name
        : null;

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
        <Text style={styles.stepLabelActive}>STEP 3</Text>
        <View style={styles.stepBarContainer}>
          <View style={[styles.stepBar, styles.stepBarActive]} />
          <View style={[styles.stepBar, styles.stepBarActive]} />
          <View style={[styles.stepBar, styles.stepBarActive]} />
          <View style={styles.stepBar} />
        </View>
        <Text style={styles.stepLabel}>STEP 4</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Title */}
        <Text style={styles.title}>Toss & Overs</Text>
        <Text style={styles.subtitle}>
          Who won the toss and what did they choose?
        </Text>

        {/* Toss Card */}
        <View style={styles.tossCard}>
          <View style={styles.tossHeader}>
            <Text style={styles.tossIcon}>{'\uD83C\uDFB2'}</Text>
            <Text style={styles.tossHeaderText}>TOSS DECISION</Text>
          </View>

          {/* Who won */}
          <Text style={styles.tossQuestion}>WHO WON THE TOSS?</Text>
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[
                styles.optionBtn,
                tossWinner === teamA.id && styles.optionBtnActive,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setTossWinner(teamA.id);
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.optionBtnText,
                  tossWinner === teamA.id && styles.optionBtnTextActive,
                ]}
                numberOfLines={1}
              >
                {teamA.name}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.optionBtn,
                tossWinner === teamB.id && styles.optionBtnActive,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setTossWinner(teamB.id);
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.optionBtnText,
                  tossWinner === teamB.id && styles.optionBtnTextActive,
                ]}
                numberOfLines={1}
              >
                {teamB.name}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Elected to */}
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

        {/* Summary */}
        {canProceed && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>MATCH SUMMARY</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Toss won by</Text>
              <Text style={styles.summaryValue}>{winnerName}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Elected to</Text>
              <Text style={styles.summaryValue}>
                {tossDecision === 'bat' ? 'Bat first' : 'Bowl first'}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Batting first</Text>
              <Text style={styles.summaryValue}>
                {tossDecision === 'bat' ? winnerName : loserName}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.nextButton, !canProceed && styles.disabledBtn]}
          onPress={handleNext}
          disabled={!canProceed}
          activeOpacity={0.8}
        >
          <Text style={styles.nextButtonText}>
            Next: Playing XI  {'\u2192'}
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

  /* ── Summary Card ── */
  summaryCard: {
    backgroundColor: Colors.gray800,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.electricGreen + '33',
  },
  summaryTitle: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.electricGreen,
    letterSpacing: 1.5,
    marginBottom: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  summaryLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.gray400,
  },
  summaryValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
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
