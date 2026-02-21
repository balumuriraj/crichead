import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  TouchableOpacity,
} from 'react-native';
import {
  Colors,
  Spacing,
  BorderRadius,
  Typography,
} from '@crichead/ui/mobile';
import { useMatchSync } from '@crichead/core';
import { X, ChevronRight, ChevronDown } from 'lucide-react-native';
import type { QuickMatchConfig } from '../types/QuickMatchConfig';
import { useScoringState } from '../hooks/useScoringState';
import {
  ScoringHeader,
  ScoreDisplay,
  TargetBanner,
  InningsEndBanner,
  ThisOverDisplay,
  ScoringTabBar,
  PlayersTabContent,
  CommentaryTabContent,
  PlayerPickerCards,
  ScoringPad,
  InningsCompletePad,
  PlayerPickerModal,
  OverCompleteModal,
} from '../components/scoring';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ScoringScreenProps {
  matchId?: string | null;
  config?: QuickMatchConfig;
  initialLocalMatchId?: string;
  onBack?: () => void;
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function ScoringScreen({
  matchId = null,
  config,
  initialLocalMatchId,
  onBack,
}: ScoringScreenProps) {
  const [liveMatchId, setLiveMatchId] = useState<string | null>(matchId);

  // Firebase sync stays in the screen because liveMatchId changes after Go Live
  const {
    match,
    currentInningsBalls: firestoreBalls,
    loading: syncLoading,
    error: syncError,
    addBallToMatch,
    endCurrentInnings,
    undoLastBallFromMatch,
  } = useMatchSync(liveMatchId, { subscribeToBalls: true });

  // All state, derived values, and handlers
  const scoring = useScoringState({
    matchId,
    config,
    initialLocalMatchId,
    match,
    firestoreBalls,
    syncError,
    addBallToMatch,
    endCurrentInnings,
    undoLastBallFromMatch,
    liveMatchId,
    setLiveMatchId,
  });

  // ---- Loading states ----
  if (scoring.localLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.electricGreen} />
          <Text style={styles.loadingText}>Loading match...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (scoring.isLiveMode && syncLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.electricGreen} />
          <Text style={styles.loadingText}>Connecting to match...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header ── */}
      <ScoringHeader
        isLiveMode={scoring.isLiveMode}
        canGoLive={scoring.canGoLive}
        onBack={onBack ?? (() => {})}
        onGoLive={scoring.handleGoLive}
        onOpenSettings={() => scoring.setShowSettingsModal(true)}
      />

      {/* ── Scrollable content ── */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Sync error banner */}
        {scoring.isLiveMode && syncError && (
          <View style={styles.syncBanner}>
            <Text style={styles.syncError}>{syncError.message}</Text>
          </View>
        )}

        <ScoreDisplay
          teamName={scoring.displayTeamName}
          totalRuns={scoring.stats.totalRuns}
          totalWickets={scoring.stats.totalWickets}
          oversFormatted={scoring.currentOverFormatted}
          runRate={scoring.runRate}
        />

        {scoring.isChasing && !scoring.isMatchFinished && (
          <TargetBanner
            target={scoring.firstInningsRuns! + 1}
            runsNeeded={Math.max(0, scoring.firstInningsRuns! + 1 - scoring.stats.totalRuns)}
            ballsLeft={
              scoring.maxOvers > 0
                ? Math.max(
                    0,
                    scoring.maxOvers * 6 -
                      (scoring.stats.currentOver * 6 + scoring.stats.currentBall)
                  )
                : '?'
            }
          />
        )}

        {scoring.isInningsComplete && (
          <InningsEndBanner
            isMatch={scoring.isLiveMode && scoring.isMatchFinished}
            reason={scoring.inningsEndReason}
            score={scoring.inningsEndScore}
          />
        )}

        <ThisOverDisplay balls={scoring.currentOverBalls} />

        <ScoringTabBar
          activeTab={scoring.activeTab}
          onTabChange={scoring.setActiveTab}
        />

        {scoring.activeTab === 'players' && (
          <PlayersTabContent
            strikerId={scoring.strikerId}
            nonStrikerId={scoring.nonStrikerId}
            bowlerId={scoring.bowlerId}
            getPlayerName={scoring.getPlayerName}
            batsmenStatsMap={scoring.batsmenStatsMap}
            bowlerStatsMap={scoring.bowlerStatsMap}
          />
        )}

        {scoring.activeTab === 'comm' && (
          <CommentaryTabContent balls={scoring.balls} />
        )}

        {scoring.activeTab === 'cards' && (
          <View style={styles.cardsContent}>
            <Text style={styles.emptyText}>Scorecards coming soon</Text>
          </View>
        )}
      </ScrollView>

      {/* ── Scoring Pad (fixed at bottom) ── */}
      <View style={[styles.scoringPad, scoring.scoringDisabled && styles.scoringPadDisabled]}>
        {scoring.isOverCompleteWaiting && !scoring.showOverCompleteModal && (
          <View style={styles.reviewOverPrompt}>
            <TouchableOpacity 
              style={styles.reviewOverButton} 
              onPress={() => scoring.setShowOverCompleteModal(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.reviewOverButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        )}
        {scoring.scoringDisabled ? (
          <InningsCompletePad
            isMatchFinished={scoring.isMatchFinished}
            isLiveMode={scoring.isLiveMode}
            canUndo={scoring.canUndo}
            onEndInnings={scoring.handleEndInnings}
            onUndo={scoring.handleUndo}
          />
        ) : !scoring.playersReady ? (
          <PlayerPickerCards
            strikerId={scoring.strikerId}
            nonStrikerId={scoring.nonStrikerId}
            bowlerId={scoring.bowlerId}
            onPickStriker={() => scoring.setPickerMode('striker')}
            onPickNonStriker={() => scoring.setPickerMode('nonStriker')}
            onPickBowler={() => scoring.setPickerMode('bowler')}
          />
        ) : (
          <ScoringPad
            disabled={scoring.inputDisabled}
            canUndo={scoring.canUndo}
            onScore={scoring.handleScore}
            onExtra={scoring.handleExtra}
            onWicket={scoring.handleWicket}
            onPenalty={scoring.handlePenalty}
            onUndo={scoring.handleUndo}
            onSwapStrike={scoring.handleSwapStrike}
          />
        )}
      </View>

      {/* ── Player Picker Modal ── */}
      <PlayerPickerModal
        visible={scoring.pickerMode !== null}
        title={scoring.pickerTitle}
        players={scoring.pickerPlayers}
        onPickPlayer={scoring.handlePickPlayer}
        onClose={() => scoring.setPickerMode(null)}
      />

      {(() => {
        const bowlerStats = scoring.bowlerId ? scoring.bowlerStatsMap.get(scoring.bowlerId) : null;
        const validBalls = bowlerStats?.validBalls ?? 0;
        const bOvers = `${Math.floor(validBalls / 6)}.${validBalls % 6}`;
        const bMaidens = 0; // Not tracked in local stats currently
        const bRuns = bowlerStats?.runs ?? 0;
        const bWickets = bowlerStats?.wickets ?? 0;

        return (
          <OverCompleteModal
            visible={scoring.showOverCompleteModal}
            totalOvers={scoring.stats.currentOver}
            scoreString={`${scoring.stats.totalRuns}/${scoring.stats.totalWickets}`}
            bowlerName={scoring.getPlayerName(scoring.bowlerId)}
            bowlerRole="Bowler" // If role is needed, can be passed here
            bowlerFigures={`${bOvers}-${bMaidens}-${bRuns}-${bWickets}`}
            balls={scoring.completedOverBalls}
            isInningsComplete={scoring.isInningsComplete}
            isMatchFinished={scoring.isMatchFinished}
            onStartNextOver={scoring.handleStartNextOver}
            onContinueOver={() => scoring.setShowOverCompleteModal(false)}
            onEndInnings={scoring.handleEndInnings}
            onEndMatch={scoring.handleEndMatch}
          />
        );
      })()}

      {/* ── Settings Modal (left inline) ── */}
      <Modal
        visible={scoring.showSettingsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => scoring.setShowSettingsModal(false)}
      >
        <SafeAreaView style={styles.settingsContainer}>
          <View style={styles.settingsHeader}>
            <Text style={styles.settingsTitle}>Settings</Text>
            <TouchableOpacity
              onPress={() => scoring.setShowSettingsModal(false)}
              style={styles.settingsCloseBtn}
            >
              <X size={24} color={Colors.white} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.settingsScroll} showsVerticalScrollIndicator={false}>
            {/* Match Settings */}
            <TouchableOpacity
              style={styles.settingsSectionHeader}
              onPress={() =>
                scoring.setExpandedSection(
                  scoring.expandedSection === 'Match Settings' ? null : 'Match Settings'
                )
              }
              activeOpacity={0.7}
            >
              <Text style={styles.settingsSectionTitle}>Match Settings</Text>
              {scoring.expandedSection === 'Match Settings' ? (
                <ChevronDown size={20} color={Colors.gray400} />
              ) : (
                <ChevronRight size={20} color={Colors.gray400} />
              )}
            </TouchableOpacity>
            {scoring.expandedSection === 'Match Settings' && (
              <View style={styles.settingsSectionContent}>
                {[
                  'Edit Scorecard',
                  'Change Match Overs',
                  'Match Rules (WD, NB, WW)',
                  'Revise Target (DLS/VJD)',
                  'Add Bonus Runs',
                  'Give Penalty Runs',
                  'End / Declare Innings',
                ].map((item) => (
                  <TouchableOpacity key={item} style={styles.settingsItem} activeOpacity={0.7}>
                    <Text style={styles.settingsItemText}>{item}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={styles.settingsItem}
                  activeOpacity={0.7}
                  onPress={scoring.handleEndMatch}
                >
                  <Text style={[styles.settingsItemText, { color: Colors.error }]}>
                    {scoring.isLiveMode ? 'End Match' : 'Abandon Match'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Players Settings */}
            <TouchableOpacity
              style={styles.settingsSectionHeader}
              onPress={() =>
                scoring.setExpandedSection(
                  scoring.expandedSection === 'Players Settings' ? null : 'Players Settings'
                )
              }
              activeOpacity={0.7}
            >
              <Text style={styles.settingsSectionTitle}>Players Settings</Text>
              {scoring.expandedSection === 'Players Settings' ? (
                <ChevronDown size={20} color={Colors.gray400} />
              ) : (
                <ChevronRight size={20} color={Colors.gray400} />
              )}
            </TouchableOpacity>
            {scoring.expandedSection === 'Players Settings' && (
              <View style={styles.settingsSectionContent}>
                {[
                  'Change Playing Squad',
                  'Change Bowler',
                  'Replace Batters',
                  'Retired Hurt (Batter)',
                ].map((item) => (
                  <TouchableOpacity key={item} style={styles.settingsItem} activeOpacity={0.7}>
                    <Text style={styles.settingsItemText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Scorer Settings */}
            <TouchableOpacity
              style={styles.settingsSectionHeader}
              onPress={() =>
                scoring.setExpandedSection(
                  scoring.expandedSection === 'Scorer Settings' ? null : 'Scorer Settings'
                )
              }
              activeOpacity={0.7}
            >
              <Text style={styles.settingsSectionTitle}>Scorer Settings</Text>
              {scoring.expandedSection === 'Scorer Settings' ? (
                <ChevronDown size={20} color={Colors.gray400} />
              ) : (
                <ChevronRight size={20} color={Colors.gray400} />
              )}
            </TouchableOpacity>
            {scoring.expandedSection === 'Scorer Settings' && (
              <View style={styles.settingsSectionContent}>
                {[
                  'Change Scorer',
                  'Add Match Officials/Streamer',
                  'Select Power Play Overs',
                  'Set Match Breaks (Lunch, Drinks, etc.)',
                  'Add Scorer Notes',
                ].map((item) => (
                  <TouchableOpacity key={item} style={styles.settingsItem} activeOpacity={0.7}>
                    <Text style={styles.settingsItemText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.deepNavy,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  syncBanner: {
    backgroundColor: Colors.error + '1A',
    borderWidth: 1,
    borderColor: Colors.error + '4D',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
  },
  syncError: {
    fontSize: Typography.fontSize.xs,
    color: Colors.error,
  },
  scoringPad: {
    backgroundColor: Colors.gray800,
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  scoringPadDisabled: {
    opacity: 0.5,
  },
  cardsContent: {
    backgroundColor: Colors.gray800,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.gray500,
    fontStyle: 'italic',
    paddingVertical: Spacing.md,
  },
  // Settings Modal
  settingsContainer: {
    flex: 1,
    backgroundColor: Colors.deepNavy,
  },
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settingsTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
  },
  settingsCloseBtn: {
    padding: Spacing.xs,
  },
  settingsScroll: {
    flex: 1,
  },
  settingsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.gray800,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginTop: Spacing.md,
  },
  settingsSectionTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.gray300,
    letterSpacing: 1,
  },
  settingsSectionContent: {
    backgroundColor: Colors.deepNavy,
  },
  reviewOverPrompt: {
    marginBottom: Spacing.md,
  },
  reviewOverButton: {
    backgroundColor: Colors.electricGreen,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewOverButtonText: {
    color: Colors.deepNavy,
    fontWeight: '900',
    fontSize: Typography.fontSize.base,
    letterSpacing: 0.5,
  },
  settingsItem: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settingsItemText: {
    fontSize: Typography.fontSize.base,
    color: Colors.white,
  },
});
