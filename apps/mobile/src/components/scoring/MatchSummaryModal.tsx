import React from 'react';
import { Modal, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BorderRadius, Colors, Spacing, Typography } from '@crichead/ui/mobile';

interface MatchSummaryModalProps {
  visible: boolean;
  scoreString: string;
  oversString: string;
  onEndMatch: () => void;
  onUndoLastBall: () => void;
}

export function MatchSummaryModal({
  visible,
  scoreString,
  oversString,
  onEndMatch,
  onUndoLastBall,
}: MatchSummaryModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.modalContent}>
            <Text style={styles.title}>MATCH SUMMARY</Text>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>FINAL SCORE</Text>
              <Text style={styles.summaryScore}>{scoreString}</Text>
              <Text style={styles.summaryOvers}>Overs: {oversString}</Text>
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={onEndMatch} activeOpacity={0.8}>
              <Text style={styles.primaryButtonText}>END MATCH</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={onUndoLastBall} activeOpacity={0.8}>
              <Text style={styles.secondaryButtonText}>UNDO LAST BALL</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  safeArea: {
    width: '100%',
  },
  modalContent: {
    backgroundColor: Colors.deepNavy,
    borderTopLeftRadius: BorderRadius.xl * 1.5,
    borderTopRightRadius: BorderRadius.xl * 1.5,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxl,
    borderTopWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  title: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
    textAlign: 'center',
    letterSpacing: 1,
  },
  summaryCard: {
    backgroundColor: Colors.gray800,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  summaryLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.gray400,
    letterSpacing: 1,
  },
  summaryScore: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: '900',
    color: Colors.white,
  },
  summaryOvers: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.gray300,
  },
  primaryButton: {
    backgroundColor: Colors.error,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: 0.5,
  },
  secondaryButton: {
    backgroundColor: Colors.gray800,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
    letterSpacing: 0.5,
  },
});
