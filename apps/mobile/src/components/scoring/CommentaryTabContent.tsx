import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography, BorderRadius } from '@crichead/ui/mobile';
import { formatBallDisplay, EventSchema } from '@crichead/core';

export interface CommentaryTabContentProps {
  balls: EventSchema.BallEvent[];
}

export function CommentaryTabContent({ balls }: CommentaryTabContentProps) {
  if (balls.length === 0) {
    return (
      <View style={styles.commContent}>
        <Text style={styles.emptyText}>No commentary yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.commContent}>
      {balls
        .slice(-10)
        .reverse()
        .map((ball, index) => {
          const actualIndex = balls.length - index - 1;
          const isWicket = !!ball.wicket;
          const isBoundary = (ball.runs.bat === 4 || ball.runs.bat === 6) && ball.deliveryType === 'legal';
          return (
            <View key={`${actualIndex}-${ball.metadata?.commentary || ball.id}`} style={styles.commRow}>
              <View style={[
                styles.commBallBadge,
                isWicket && styles.commBallBadgeWicket,
                isBoundary && styles.commBallBadgeBoundary,
              ]}>
                <Text style={[
                  styles.commBallText,
                  (isWicket || isBoundary) && styles.commBallTextHighlight,
                ]}>
                  {formatBallDisplay(ball)}
                </Text>
              </View>
              <Text style={styles.commText}>{String(ball.metadata?.commentary || '...')}</Text>
            </View>
          );
        })}
    </View>
  );
}

const styles = StyleSheet.create({
  commContent: {
    gap: Spacing.sm,
  },
  emptyText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.gray500,
    fontStyle: 'italic',
    paddingVertical: Spacing.md,
  },
  commRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray800,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  commBallBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.gray700,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commBallBadgeWicket: {
    backgroundColor: Colors.error,
  },
  commBallBadgeBoundary: {
    backgroundColor: Colors.electricGreen,
  },
  commBallText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
  },
  commBallTextHighlight: {
    color: Colors.deepNavy,
  },
  commText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
});
