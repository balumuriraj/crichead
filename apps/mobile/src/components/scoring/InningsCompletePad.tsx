import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography, BorderRadius } from '@crichead/ui/mobile';

export interface InningsCompletePadProps {
  isMatchFinished: boolean;
  isLiveMode: boolean;
  canUndo: boolean;
  onEndInnings: () => void;
  onUndo: () => void;
}

export function InningsCompletePad({
  isMatchFinished,
  isLiveMode,
  canUndo,
  onEndInnings,
  onUndo,
}: InningsCompletePadProps) {
  return (
    <View style={styles.overlay}>
      {isLiveMode && isMatchFinished ? (
        <Text style={styles.disabledText}>Match has ended</Text>
      ) : (
        <View style={styles.container}>
          <Text style={styles.disabledText}>Innings complete</Text>
          <View style={styles.row}>
            <TouchableOpacity
              style={styles.endInningsBtn}
              onPress={onEndInnings}
              activeOpacity={0.7}
            >
              <Text style={styles.endInningsBtnText}>END INNINGS</Text>
            </TouchableOpacity>
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  container: {
    alignItems: 'center',
    gap: Spacing.md,
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
  },
  endInningsBtn: {
    flex: 3,
    height: 56,
    backgroundColor: Colors.electricGreen,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  endInningsBtnText: {
    fontSize: 16,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.deepNavy,
  },
  undoButton: {
    flex: 1,
    height: 56,
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
});
