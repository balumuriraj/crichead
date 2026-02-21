import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { Colors, Spacing, Typography, BorderRadius } from '@crichead/ui/mobile';
import { EventSchema, formatBallDisplay } from '@crichead/core';
import { Zap, UserPlus, Edit2 } from 'lucide-react-native';

interface OverCompleteModalProps {
  visible: boolean;
  totalOvers: number;
  scoreString: string; // e.g., "25/0"
  bowlerName: string;
  bowlerRole?: string;
  bowlerFigures: string; // e.g., "1.0-0-16-0"
  balls: EventSchema.BallEvent[];
  isInningsComplete?: boolean;
  isMatchFinished?: boolean;
  onStartNextOver: () => void;
  onContinueOver: () => void;
  onEndInnings?: () => void;
  onEndMatch?: () => void;
}

export function OverCompleteModal({
  visible,
  totalOvers,
  scoreString,
  bowlerName,
  bowlerRole,
  bowlerFigures,
  balls,
  isInningsComplete,
  isMatchFinished,
  onStartNextOver,
  onContinueOver,
  onEndInnings,
  onEndMatch,
}: OverCompleteModalProps) {
  const overRuns = useMemo(() => {
    let sum = 0;
    for (const b of balls) {
      sum += b.runs.bat + b.runs.extra + b.runs.penalty;
    }
    return sum;
  }, [balls]);

  const overWickets = useMemo(() => {
    return balls.filter(b => b.wicket).length;
  }, [balls]);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.titleContainer}>
                <Text style={styles.titleLine1}>OVER</Text>
                <Text style={styles.titleLine2}>COMPLETE</Text>
              </View>
            </View>

            {/* Stats Cards */}
            <View style={styles.statsRow}>
              <View style={styles.statsCard}>
                <Text style={styles.statsCardLabel}>RUNS</Text>
                <Text style={styles.statsCardValueRuns}>{overRuns}</Text>
              </View>
              <View style={styles.statsCard}>
                <Text style={styles.statsCardLabel}>WICKETS</Text>
                <Text style={styles.statsCardValueWickets}>{overWickets}</Text>
              </View>
            </View>

            {/* Balls Row */}
            <View style={styles.ballsContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ballsScroll}>
                {balls.map((ball, i) => {
                  const isBoundary = (ball.runs.bat === 4 || ball.runs.bat === 6) && ball.deliveryType === 'legal';
                  return (
                    <View key={i} style={styles.ballWrapper}>
                      <View
                        style={[
                          styles.ballCircle,
                          isBoundary && styles.ballBoundary,
                        ]}
                      >
                        <Text
                          style={[
                            styles.ballText,
                            isBoundary && styles.ballTextBoundary,
                          ]}
                        >
                          {formatBallDisplay(ball)}
                        </Text>
                      </View>
                      <Text style={[styles.ballNumberLabel, isBoundary && styles.ballNumberBoundary]}>
                        {totalOvers - 1}.{i + 1}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>
            </View>

            {/* Actions */}
            {isMatchFinished && onEndMatch ? (
              <TouchableOpacity style={[styles.primaryButton, { backgroundColor: Colors.error }]} onPress={onEndMatch} activeOpacity={0.8}>
                <Zap size={20} color={Colors.white} fill={Colors.white} style={{ marginRight: 8 }} />
                <Text style={[styles.primaryButtonText, { color: Colors.white }]}>END MATCH</Text>
              </TouchableOpacity>
            ) : isInningsComplete && onEndInnings ? (
              <TouchableOpacity style={styles.primaryButton} onPress={onEndInnings} activeOpacity={0.8}>
                <Zap size={20} color={Colors.deepNavy} fill={Colors.deepNavy} style={{ marginRight: 8 }} />
                <Text style={styles.primaryButtonText}>END INNINGS</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.primaryButton} onPress={onStartNextOver} activeOpacity={0.8}>
                <UserPlus size={20} color={Colors.deepNavy} fill={Colors.deepNavy} strokeWidth={2.5} style={{ marginRight: 8 }} />
                <Text style={styles.primaryButtonText}>SELECT NEXT BOWLER</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.secondaryButton} onPress={onContinueOver} activeOpacity={0.8}>
              <Edit2 size={14} color={Colors.gray400} style={{ marginRight: 6 }} />
              <Text style={styles.secondaryButtonText}>Edit This Over</Text>
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
    backgroundColor: '#0F1522', // Deeper navy for specific sleek look
    borderTopLeftRadius: BorderRadius.xl * 1.5,
    borderTopRightRadius: BorderRadius.xl * 1.5,
    padding: Spacing.xl,
    paddingBottom: Spacing.xxl + Spacing.lg,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#1E293B',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  titleLine1: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: '900',
    fontStyle: 'italic',
    color: Colors.white,
    letterSpacing: 1,
  },
  titleLine2: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: '900',
    fontStyle: 'italic',
    color: Colors.electricGreen,
    letterSpacing: 1,
    
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  statsCard: {
    flex: 1,
    backgroundColor: '#161E2E',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: '#1E293B',
    justifyContent: 'center',
  },
  statsCardLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.gray400,
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  statsCardValueRuns: {
    fontSize: Typography.fontSize['4xl'],
    fontWeight: '900',
    color: Colors.white,
  },
  statsCardValueWickets: {
    fontSize: Typography.fontSize['4xl'],
    fontWeight: '900',
    color: Colors.electricGreen,
  },
  bowlerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161E2E',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: Spacing.md,
  },
  bowlerIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.electricGreen,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
    shadowColor: Colors.electricGreen,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  bowlerInfo: {
    flex: 1,
  },
  bowlerName: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
    marginBottom: 2,
  },
  bowlerRole: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.gray400,
  },
  bowlerFiguresBox: {
    alignItems: 'flex-end',
  },
  bowlerFigures: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '900',
    color: Colors.electricGreen,
    letterSpacing: 1,
    marginBottom: 2,
  },
  bowlerFiguresLabel: {
    fontSize: 10,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.gray500,
    letterSpacing: 1,
  },
  ballsContainer: {
    marginBottom: Spacing.xl,
  },
  ballsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: Spacing.xs,
  },
  ballWrapper: {
    alignItems: 'center',
  },
  ballCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    marginVertical: 12
  },
  ballBoundary: {
    backgroundColor: Colors.electricGreen,
    borderColor: Colors.electricGreen,
    shadowColor: Colors.electricGreen,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  ballText: {
    fontSize: Typography.fontSize.base,
    fontWeight: '900',
    color: Colors.white,
  },
  ballTextBoundary: {
    color: Colors.deepNavy,
  },
  ballNumberLabel: {
    fontSize: 10,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.gray500,
  },
  ballNumberBoundary: {
    color: Colors.electricGreen,
  },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: Colors.electricGreen,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  primaryButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: '900',
    color: Colors.deepNavy,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
  },
  secondaryButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.gray400,
  },
});
