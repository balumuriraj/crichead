import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography } from '@crichead/ui/mobile';
import { formatBallDisplay, type Ball } from '@crichead/core';

export interface ThisOverDisplayProps {
  balls: Ball[];
}

export function ThisOverDisplay({ balls }: ThisOverDisplayProps) {
  const validBallCount = balls.filter((b) => {
    const isExtra = b?.extras?.type === 'wd' || b?.extras?.type === 'nb';
    return !isExtra;
  }).length;

  return (
    <View style={styles.thisOverRow}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.thisOverScroll}
        contentContainerStyle={styles.thisOverBalls}
      >
        {balls.map((ball, i) => {
          const isWicket = !!ball.wicket;
          const isBoundary = (ball.runs === 4 || ball.runs === 6) && !ball.extras;
          return (
            <View
              key={i}
              style={[
                styles.overBallCircle,
                isWicket && styles.overBallWicket,
                isBoundary && styles.overBallBoundary,
              ]}
            >
              <Text
                style={[
                  styles.overBallText,
                  isWicket && styles.overBallTextWicket,
                  isBoundary && styles.overBallTextBoundary,
                ]}
              >
                {formatBallDisplay(ball)}
              </Text>
            </View>
          );
        })}
        {Array.from({ length: Math.max(0, 6 - validBallCount) }).map((_, i) => (
          <View key={`empty-${i}`} style={styles.overBallEmpty} />
        ))}
      </ScrollView>
      <Text style={styles.thisOverLabel}>THIS OVER</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  thisOverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  thisOverScroll: {
    flex: 1,
    marginRight: Spacing.md,
  },
  thisOverBalls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  overBallCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.gray700,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.gray600,
  },
  overBallWicket: {
    backgroundColor: Colors.error,
    borderColor: Colors.error,
  },
  overBallBoundary: {
    backgroundColor: Colors.electricGreen,
    borderColor: Colors.electricGreen,
  },
  overBallText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
  },
  overBallTextWicket: {
    color: Colors.white,
  },
  overBallTextBoundary: {
    color: Colors.deepNavy,
  },
  overBallEmpty: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.gray600,
  },
  thisOverLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
});
