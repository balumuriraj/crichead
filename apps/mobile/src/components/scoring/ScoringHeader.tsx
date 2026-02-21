import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography, BorderRadius } from '@crichead/ui/mobile';
import { Settings } from 'lucide-react-native';

export interface ScoringHeaderProps {
  isLiveMode: boolean;
  canGoLive: boolean;
  onBack: () => void;
  onGoLive: () => void;
  onOpenSettings: () => void;
}

export function ScoringHeader({
  isLiveMode,
  canGoLive,
  onBack,
  onGoLive,
  onOpenSettings,
}: ScoringHeaderProps) {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={onBack}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.backText}>{'\u2039'} Back</Text>
      </TouchableOpacity>

      <View style={styles.liveBadge}>
        <View style={styles.liveDot} />
        <Text style={styles.liveBadgeText}>
          {isLiveMode ? 'LIVE MATCH' : 'LOCAL'}
        </Text>
      </View>

      <View style={styles.actions}>
        {canGoLive && (
          <TouchableOpacity
            onPress={onGoLive}
            activeOpacity={0.7}
            style={styles.actionPad}
          >
            <Text style={styles.goLiveText}>Go Live</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={onOpenSettings}
          activeOpacity={0.7}
          style={styles.actionPad}
        >
          <Settings size={22} color={Colors.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backText: {
    fontSize: Typography.fontSize.base,
    color: Colors.white,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.electricGreen + '1A',
    borderWidth: 1,
    borderColor: Colors.electricGreen + '4D',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.electricGreen,
  },
  liveBadgeText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.electricGreen,
    letterSpacing: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  actionPad: {
    padding: Spacing.xs,
  },
  goLiveText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.electricGreen,
  },
});
