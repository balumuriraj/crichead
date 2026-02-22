import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Zap, Plus, Settings, RotateCcw, Bell } from 'lucide-react-native';
import { listLocalMatches, type LocalMatchRecord } from '../../src/utils/localMatchStore';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, BorderRadius, Typography } from '@crichead/ui/mobile';

export default function HomeScreen() {
  const router = useRouter();
  const [localMatches, setLocalMatches] = useState<LocalMatchRecord[]>([]);

  useFocusEffect(
    useCallback(() => {
      listLocalMatches().then((records) => {
        // Only show active matches, sort newest first
        const activeRecords = records.filter(m => m.status !== 'finished' && m.status !== 'abandoned');
        const sorted = [...activeRecords].sort((a, b) => b.updatedAt - a.updatedAt);
        setLocalMatches(sorted);
      });
    }, []),
  );

  const featuredLocal = localMatches[0];
  const featuredMatch = featuredLocal;

  const fMatchNameA = featuredMatch ? featuredMatch.config.teamAName : null;
  const fMatchNameB = featuredMatch ? featuredMatch.config.teamBName : null;
  const fMatchStatus = featuredMatch ? featuredMatch.status : 'local';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.brand}>
          <Text style={styles.brandItalic}>CRIC</Text>
          <Text style={styles.brandSuffix}>HEAD</Text>
        </Text>
        <TouchableOpacity style={styles.notificationBtn} activeOpacity={0.7}>
          <Bell size={22} color={Colors.white} />
        </TouchableOpacity>
      </View>      

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} showsVerticalScrollIndicator={false}>

        {/* ── Action Row ── */}
        <View style={styles.actionRow}>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/match/new');
            }}
            activeOpacity={0.8}
          >
            <Plus size={18} color={Colors.white} />
            <View style={styles.actionBtnBody}>
              <Text style={styles.actionBtnText}>NEW MATCH</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.quickMatchBtn]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/match/quick');
            }}
            activeOpacity={0.8}
          >
            <Zap size={18} color={Colors.electricGreen} fill={Colors.electricGreen} />
            <View style={styles.actionBtnBody}>
              <Text style={[styles.actionBtnText, styles.quickMatchText]}>QUICK MATCH</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Featured Match Card ── */}
        {featuredMatch ? (
          <TouchableOpacity 
            style={styles.featuredCard}
            activeOpacity={0.8}
            onPress={() => router.push(`/match/local-${featuredMatch.id}`)}
          >
            <View style={styles.featuredHeader}>
              <View style={styles.featuredTag}>
                <Text style={styles.featuredTagText}>FEATURED MATCH</Text>
              </View>
              <View style={styles.featuredLiveRow}>
                {fMatchStatus === 'live' && <View style={styles.featuredLiveDot} />}
                <Text style={[styles.featuredLiveText, fMatchStatus !== 'live' && { color: Colors.gray400 }]}>
                  {fMatchStatus === 'live' ? 'LIVE' : (fMatchStatus === 'upcoming' ? 'UPCOMING' : 'LOCAL')}
                </Text>
              </View>
            </View>

            <View style={styles.featuredTeamRow}>
              <View style={styles.teamLeft}>
                <View style={[styles.teamCircle, { backgroundColor: '#1E3A8A' }]}>
                  <Text style={styles.teamCircleText}>{fMatchNameA?.substring(0, 3).toUpperCase() || 'TMA'}</Text>
                </View>
                <Text style={styles.teamNameLarge} numberOfLines={1}>{fMatchNameA && fMatchNameA.length > 12 ? fMatchNameA.substring(0,10)+'...' : fMatchNameA}</Text>
              </View>
              <Text style={styles.teamScoreLarge}>
                --<Text style={styles.teamWicketsLarge}>/--</Text>
              </Text>
            </View>

            <View style={styles.featuredTeamRow}>
              <View style={styles.teamLeft}>
                <View style={[styles.teamCircle, { backgroundColor: '#B45309' }]}>
                  <Text style={styles.teamCircleText}>{fMatchNameB?.substring(0, 3).toUpperCase() || 'TMB'}</Text>
                </View>
                <Text style={styles.teamNameLarge} numberOfLines={1}>{fMatchNameB && fMatchNameB.length > 12 ? fMatchNameB.substring(0,10)+'...' : fMatchNameB}</Text>
              </View>
              <Text style={styles.teamScoreLargeSub}>
                --<Text style={styles.teamWicketsLargeSub}>/--</Text>
              </Text>
            </View>

            <View style={styles.featuredFooter}>
              <View style={styles.featuredStats}>
                <Text style={styles.featuredStatText}>
                  Tap to view match details
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={[styles.featuredCard, { alignItems: 'center', paddingVertical: 32 }]}>
            <View style={[styles.teamCircle, { backgroundColor: Colors.electricGreen + '1A', width: 48, height: 48, borderRadius: 24, marginBottom: 16, marginRight: 0 }]}>
              <Plus size={24} color={Colors.electricGreen} />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: Colors.white, marginBottom: 8 }}>Ready to Play?</Text>
            <Text style={{ fontSize: 12, color: Colors.gray400, textAlign: 'center', marginBottom: 20, lineHeight: 18 }}>
              Your featured match will appear here.{'\n'}Start a Quick Match to get started.
            </Text>
            <TouchableOpacity
              style={{ backgroundColor: Colors.electricGreen, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 }}
              onPress={() => router.push('/match/quick')}
              activeOpacity={0.8}
            >
              <Text style={{ color: Colors.deepNavy, fontWeight: '800', fontSize: 12 }}>START QUICK MATCH</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Local Matches List ── */}
        <View style={styles.listHeader}>
          <Text style={styles.listSectionTitle}>MATCHES</Text>
          <TouchableOpacity>
            <Text style={styles.viewAllText}>VIEW ALL</Text>
          </TouchableOpacity>
        </View>

        {localMatches.map((m, idx) => (
          <TouchableOpacity
            key={m.id}
            style={styles.listItem}
            onPress={() => router.push(`/match/local-${m.id}`)}
            activeOpacity={0.7}
          >
            <View style={styles.listLeft}>
              <Text style={styles.listTeamsText}>
                <Text style={styles.listTeamBold}>{m.config.teamAName}</Text>
                <Text style={styles.listVs}> VS </Text>
                <Text style={styles.listTeamBold}>{m.config.teamBName}</Text>
              </Text>
              <Text style={styles.listSubtitle}>
                LOCAL MATCH • <Text style={styles.listHighlight}>{m.config.oversPerInnings} Ov</Text>
              </Text>
            </View>
            <View style={styles.listRight}>
              <Text style={styles.listScore}>--/--</Text>
              <View style={[styles.statusBadge, styles.statusBadgeUpcoming]}>
                <Text style={styles.statusBadgeText}>LOCAL</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}


      </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 0.25,
    borderBottomColor: Colors.border,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  brandItalic: {
    fontSize: 22,
    fontWeight: '900',
    fontStyle: 'italic',
    color: Colors.white,
    letterSpacing: -0.5,
  },
  brandSuffix: {
    fontSize: 22,
    fontWeight: '900',
    fontStyle: 'italic',
    color: Colors.electricGreen,
    letterSpacing: -0.5,
  },
  notificationBtn: {
    padding: Spacing.xs,
  },

  /* ── Action Row ── */
  actionRow: {
    flexDirection: 'row',
    paddingBottom: Spacing.md,
    gap: Spacing.sm,    
  },
  actionBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.gray800,
    borderRadius: 30,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  actionBtnBody: {
    alignItems: 'flex-start',
  },
  quickMatchBtn: {
    backgroundColor: Colors.electricGreen + '0D',
    borderColor: Colors.electricGreen + '4D',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.white,
    lineHeight: 14,
  },
  quickMatchText: {
    color: Colors.electricGreen,
    fontStyle: 'italic',
  },
  iconBtn: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: Colors.gray800,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },

  /* ── Content Area ── */
  content: {
    flex: 1,
  },
  contentInner: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },

  /* ── Featured Card ── */
  featuredCard: {
    backgroundColor: Colors.gray800,
    borderRadius: 24,
    padding: 20,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    // a slight inner shadow or gradient effect is simulated via borders
  },
  featuredHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  featuredTag: {
    backgroundColor: Colors.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  featuredTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.gray400,
    letterSpacing: 1,
  },
  featuredLiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featuredLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
    marginRight: 6,
  },
  featuredLiveText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#EF4444',
    letterSpacing: 1,
  },
  featuredTeamRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  teamLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  teamCircleIND: {
    backgroundColor: '#1E3A8A', // Blue
  },
  teamCircleAUS: {
    backgroundColor: '#B45309', // Amber-ish
  },
  teamCircleText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.white,
  },
  teamNameLarge: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.white,
  },
  teamScoreLarge: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.white,
  },
  teamWicketsLarge: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.gray500,
  },
  teamScoreLargeSub: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.gray400,
  },
  teamWicketsLargeSub: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray600,
  },
  featuredFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 16,
  },
  featuredStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featuredStatText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.gray500,
  },
  featuredStatValue: {
    color: Colors.white,
    fontWeight: '800',
  },
  winProbTag: {
    backgroundColor: Colors.electricGreen + '1A',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.electricGreen + '4D',
  },
  winProbText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.electricGreen,
  },

  /* ── List Section ── */
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  listSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.gray500,
    letterSpacing: 2,
  },
  viewAllText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.electricGreen,
    letterSpacing: 1,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  listLeft: {
    flex: 1,
  },
  listTeamsText: {
    marginBottom: 4,
  },
  listTeamBold: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.white,
  },
  listVs: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.gray500,
  },
  listSubtitle: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.gray500,
    letterSpacing: 0.5,
  },
  listHighlight: {
    color: Colors.electricGreen,
  },
  listRight: {
    alignItems: 'flex-end',
  },
  listScore: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.white,
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgeLive: {
    backgroundColor: Colors.electricGreen + '33',
  },
  statusBadgeUpcoming: {
    backgroundColor: Colors.border,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    color: Colors.white,
  },
});

