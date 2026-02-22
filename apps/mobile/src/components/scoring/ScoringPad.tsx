import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography, BorderRadius, type ExtraType } from '@crichead/ui/mobile';

export interface ScoringPadProps {
  disabled: boolean;
  canUndo: boolean;
  onScore: (runs: number) => void;
  onExtra: (type: ExtraType) => void;
  onWicket: () => void;
  onPenalty: () => void;
  onUndo: () => void;
  onSwapStrike: () => void;
}

export function ScoringPad({
  disabled,
  canUndo,
  onScore,
  onExtra,
  onWicket,
  onPenalty,
  onUndo,
  onSwapStrike,
}: ScoringPadProps) {
  return (
      <>
        {/* Run buttons: 0 1 2 3 */}
        <View style={[styles.runRow, disabled && styles.scoringPadDisabled]}>
          {[0, 1, 2, 3].map((runs) => (
            <TouchableOpacity
              key={runs}
              style={styles.runButton}
              onPress={() => onScore(runs)}
              disabled={disabled}
              activeOpacity={0.7}
            >
              <Text style={styles.runButtonText}>{runs}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Boundary + Wicket row */}
        <View style={[styles.boundaryRow, disabled && styles.scoringPadDisabled]}>
          <TouchableOpacity
            style={styles.boundaryButton}
            onPress={() => onScore(4)}
            disabled={disabled}
            activeOpacity={0.7}
          >
            <Text style={styles.boundaryButtonText}>4</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.boundaryButton}
            onPress={() => onScore(6)}
            disabled={disabled}
            activeOpacity={0.7}
          >
            <Text style={styles.boundaryButtonText}>6</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.wicketButton}
            onPress={onWicket}
            disabled={disabled}
            activeOpacity={0.7}
          >
            <Text style={styles.wicketButtonText}>WICKET</Text>
          </TouchableOpacity>
        </View>

        {/* Extras + Penalty row */}
        <View style={styles.extrasRow}>
          {(['WD', 'NB', 'B', 'lb'] as ExtraType[]).map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.extraButton, disabled && styles.scoringPadDisabled]}
              onPress={() => onExtra(type)}
              disabled={disabled}
              activeOpacity={0.7}
            >
              <Text style={styles.extraButtonText}>{type}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.penaltyButton, disabled && styles.scoringPadDisabled]}
            onPress={onPenalty}
            disabled={disabled}
            activeOpacity={0.7}
          >
            <Text style={styles.penaltyButtonText}>PEN</Text>
          </TouchableOpacity>
          {/* Undo remains active based purely on canUndo */}
          <View style={{ width: 44, marginLeft: Spacing.xs }}>
            <TouchableOpacity
              style={[styles.undoButton, !canUndo && styles.undoButtonDisabled]}
              onPress={onUndo}
              disabled={!canUndo}
              activeOpacity={0.7}
            >
              <Text style={[styles.undoIcon, !canUndo && styles.undoIconDisabled]}>
                {'\u21A9'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Swap strike row */}
        <View style={[styles.swapRow, disabled && styles.scoringPadDisabled]}>
          <TouchableOpacity
            style={styles.swapButton}
            onPress={onSwapStrike}
            disabled={disabled}
            activeOpacity={0.7}
          >
            <Text style={styles.swapIcon}>{'\u21C4'}</Text>
            <Text style={styles.swapText}>SWAP STRIKE</Text>
          </TouchableOpacity>
        </View>
      </>
  );
}

const styles = StyleSheet.create({
  scoringPadDisabled: {
    opacity: 0.4,
  },
  runRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  runButton: {
    flex: 1,
    height: 56,
    backgroundColor: Colors.gray700,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.gray600,
  },
  runButtonText: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
  },
  boundaryRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  boundaryButton: {
    flex: 1,
    height: 56,
    backgroundColor: Colors.electricGreen,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  boundaryButtonText: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.deepNavy,
  },
  wicketButton: {
    flex: 2,
    height: 56,
    backgroundColor: Colors.error,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wicketButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.extrabold,
    color: Colors.white,
    letterSpacing: 1,
  },
  extrasRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  extraButton: {
    flex: 1,
    height: 44,
    backgroundColor: Colors.gray700,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.gray600,
  },
  extraButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textSecondary,
  },
  penaltyButton: {
    flex: 1,
    height: 44,
    backgroundColor: Colors.warning + '1A',
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.warning + '4D',
  },
  penaltyButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.warning,
  },
  undoButton: {
    width: 44,
    height: 44,
    backgroundColor: Colors.gray700,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.gray600,
  },
  undoButtonDisabled: {
    opacity: 0.4,
  },
  undoIcon: {
    fontSize: Typography.fontSize.xl,
    color: Colors.white,
  },
  undoIconDisabled: {
    color: Colors.gray500,
  },
  swapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  swapIcon: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
  },
  swapText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
});
