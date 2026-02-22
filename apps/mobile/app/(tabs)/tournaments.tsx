import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Trophy, ChevronRight } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius, Typography } from '@crichead/ui/mobile';
import { useTournamentsQuery, type TournamentDoc } from '@crichead/core/hooks';

export default function TournamentsScreen() {
  const { tournaments, loading } = useTournamentsQuery();

  const statusColor = (status: TournamentDoc['status']) => {
    switch (status) {
      case 'ongoing': return Colors.electricGreen;
      case 'upcoming': return Colors.info;
      case 'completed': return Colors.gray500;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Tournaments</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        {loading ? (
          <ActivityIndicator color={Colors.electricGreen} style={{ marginTop: Spacing.xxl }} />
        ) : tournaments.length === 0 ? (
          <View style={styles.emptyState}>
            <Trophy size={48} color={Colors.gray700} />
            <Text style={styles.emptyText}>No tournaments yet</Text>
            <Text style={styles.emptyHint}>Create tournaments from the web dashboard</Text>
          </View>
        ) : (
          tournaments.map((t) => (
            <TouchableOpacity key={t.id} style={styles.card} activeOpacity={0.7}>
              <View style={styles.cardLeft}>
                <View style={[styles.statusDot, { backgroundColor: statusColor(t.status) }]} />
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>{t.name}</Text>
                  <Text style={styles.cardMeta}>
                    {t.type === 'league' ? 'League' : 'Knockout'} · {t.teamIds.length} teams
                  </Text>
                </View>
              </View>
              <ChevronRight size={18} color={Colors.gray500} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.deepNavy,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.gray800,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.md,
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
  },
  cardMeta: {
    fontSize: Typography.fontSize.xs,
    color: Colors.gray500,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    gap: Spacing.sm,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.base,
  },
  emptyHint: {
    color: Colors.gray500,
    fontSize: Typography.fontSize.sm,
  },
});
