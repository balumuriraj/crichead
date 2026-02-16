import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, BarChart3, Settings, ChevronRight } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius, Typography } from '@crichead/ui/mobile';

const MENU_ITEMS = [
  { label: 'Batting Stats', icon: BarChart3, description: 'Runs, average, strike rate' },
  { label: 'Bowling Stats', icon: BarChart3, description: 'Wickets, economy, best figures' },
  { label: 'Settings', icon: Settings, description: 'App preferences' },
] as const;

export default function ProfileScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        {/* Avatar card */}
        <View style={styles.avatarCard}>
          <View style={styles.avatar}>
            <User size={32} color={Colors.gray500} />
          </View>
          <View>
            <Text style={styles.playerName}>Player</Text>
            <Text style={styles.playerRole}>Sign in to view your stats</Text>
          </View>
        </View>

        {/* Menu items */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionLabel}>STATS & SETTINGS</Text>
          {MENU_ITEMS.map((item) => (
            <TouchableOpacity key={item.label} style={styles.menuItem} activeOpacity={0.7}>
              <View style={styles.menuIconContainer}>
                <item.icon size={18} color={Colors.electricGreen} />
              </View>
              <View style={styles.menuInfo}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuDesc}>{item.description}</Text>
              </View>
              <ChevronRight size={16} color={Colors.gray500} />
            </TouchableOpacity>
          ))}
        </View>
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
  avatarCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray800,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.gray700,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerName: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
  },
  playerRole: {
    fontSize: Typography.fontSize.sm,
    color: Colors.gray500,
    marginTop: 2,
  },
  menuSection: {
    gap: Spacing.sm,
  },
  sectionLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.gray500,
    letterSpacing: 2,
    marginBottom: Spacing.xs,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray800,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.electricGreen + '1A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  menuInfo: {
    flex: 1,
  },
  menuLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.white,
  },
  menuDesc: {
    fontSize: Typography.fontSize.xs,
    color: Colors.gray500,
    marginTop: 1,
  },
});
