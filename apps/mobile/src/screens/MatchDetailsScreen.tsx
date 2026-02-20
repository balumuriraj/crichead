import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, BorderRadius, Typography } from '@crichead/ui/mobile';
import type { MatchFormat, MatchConfig } from '@crichead/core';

const FORMAT_OPTIONS: {
  key: MatchFormat;
  label: string;
  icon: string;
  defaultOvers: number;
}[] = [
  { key: 't20', label: 'T20', icon: '\u26A1', defaultOvers: 20 },
  { key: 'odi', label: 'ODI', icon: '\u23F0', defaultOvers: 50 },
  { key: 'test', label: 'Test', icon: '\uD83C\uDFDB\uFE0F', defaultOvers: 0 },
  { key: 'custom', label: 'Custom', icon: '\u2699\uFE0F', defaultOvers: 20 },
];

const QUICK_VENUES = ['Oval', 'Riverside'];

interface Props {
  onNext: (config: MatchConfig) => void;
  onCancel: () => void;
}

export default function MatchDetailsScreen({ onNext, onCancel }: Props) {
  const [format, setFormat] = useState<MatchFormat>('t20');
  const [overs, setOvers] = useState(20);
  const [venue, setVenue] = useState('');
  const [tournament, setTournament] = useState('');
  const [scheduledDate] = useState(() => new Date().toISOString());
  const [wickets, setWickets] = useState(10);

  function handleFormatSelect(f: MatchFormat) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFormat(f);
    const opt = FORMAT_OPTIONS.find((o) => o.key === f);
    if (opt) setOvers(opt.defaultOvers);
  }

  function handleOversChange(delta: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setOvers((prev) => Math.max(1, Math.min(100, prev + delta)));
  }

  function handleWicketsChange(delta: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setWickets((prev) => Math.max(1, Math.min(100, prev + delta)));
  }

  function handleNext() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onNext({
      format,
      oversPerInnings: format === 'test' ? 0 : overs,
      wicketsPerInnings: wickets,
      venue: venue.trim(),
      scheduledDate,
      tournament: tournament.trim(),
    });
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onCancel();
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Match</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Step Indicator */}
      <View style={styles.stepRow}>
        <Text style={styles.stepLabelActive}>STEP 1</Text>
        <View style={styles.stepBarContainer}>
          <View style={[styles.stepBar, styles.stepBarActive]} />
          <View style={styles.stepBar} />
          <View style={styles.stepBar} />
          <View style={styles.stepBar} />
        </View>
        <Text style={styles.stepLabel}>STEP 4</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title */}
        <Text style={styles.title}>Match Details</Text>
        <Text style={styles.subtitle}>Configure the format and venue.</Text>

        {/* Tournament / Series */}
        <Text style={styles.sectionLabel}>TOURNAMENT / SERIES</Text>
        <View style={styles.dropdownContainer}>
          <Text style={styles.dropdownIcon}>{'\uD83C\uDFC6'}</Text>
          <TextInput
            style={styles.dropdownInput}
            placeholder="Select tournament or 'Friendly'"
            placeholderTextColor={Colors.gray500}
            value={tournament}
            onChangeText={setTournament}
          />
        </View>

        {/* Match Type */}
        <Text style={styles.sectionLabel}>MATCH TYPE</Text>
        <View style={styles.formatGrid}>
          {FORMAT_OPTIONS.map((opt) => {
            const isActive = format === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[styles.formatCard, isActive && styles.formatCardActive]}
                onPress={() => handleFormatSelect(opt.key)}
                activeOpacity={0.7}
              >
                {isActive && (
                  <View style={styles.checkBadge}>
                    <Text style={styles.checkText}>{'\u2713'}</Text>
                  </View>
                )}
                <Text style={styles.formatIcon}>{opt.icon}</Text>
                <Text style={[styles.formatLabel, isActive && styles.formatLabelActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Overs per Innings */}
        {format !== 'test' && (
          <View style={styles.oversRow}>
            <Text style={styles.oversLabel}>Overs per Innings</Text>
            <View style={styles.stepper}>
              <TouchableOpacity
                style={styles.stepperButton}
                onPress={() => handleOversChange(-1)}
                activeOpacity={0.7}
              >
                <Text style={styles.stepperButtonText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.oversValue}>{overs}</Text>
              <TouchableOpacity
                style={styles.stepperButton}
                onPress={() => handleOversChange(1)}
                activeOpacity={0.7}
              >
                <Text style={styles.stepperButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Wickets per Innings */}
        <View style={styles.oversRow}>
          <Text style={styles.oversLabel}>Wickets per Innings</Text>
          <View style={styles.stepper}>
            <TouchableOpacity
              style={styles.stepperButton}
              onPress={() => handleWicketsChange(-1)}
              activeOpacity={0.7}
            >
              <Text style={styles.stepperButtonText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.oversValue}>{wickets}</Text>
            <TouchableOpacity
              style={styles.stepperButton}
              onPress={() => handleWicketsChange(1)}
              activeOpacity={0.7}
            >
              <Text style={styles.stepperButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Venue */}
        <Text style={styles.sectionLabel}>VENUE</Text>
        <View style={styles.venueInputRow}>
          <Text style={styles.venueIcon}>{'\uD83D\uDCCD'}</Text>
          <TextInput
            style={styles.venueInput}
            placeholder="e.g. Lord's Cricket Ground"
            placeholderTextColor={Colors.gray500}
            value={venue}
            onChangeText={setVenue}
          />
        </View>
        <View style={styles.chipRow}>
          {QUICK_VENUES.map((v) => (
            <TouchableOpacity
              key={v}
              style={[styles.chip, venue === v && styles.chipActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setVenue(v);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, venue === v && styles.chipTextActive]}>{v}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <Text style={styles.nextButtonText}>Next: Select Teams  {'\u2192'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.deepNavy,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  cancelText: {
    fontSize: Typography.fontSize.base,
    color: Colors.white,
  },
  headerTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  stepLabelActive: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.electricGreen,
  },
  stepLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.gray500,
  },
  stepBarContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  stepBar: {
    flex: 1,
    height: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray700,
  },
  stepBarActive: {
    backgroundColor: Colors.electricGreen,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  title: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.gray500,
    marginBottom: Spacing.xl,
  },
  sectionLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.gray400,
    letterSpacing: 1.5,
    marginBottom: Spacing.sm,
    marginTop: Spacing.lg,
  },
  dropdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray800,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dropdownIcon: {
    fontSize: Typography.fontSize.lg,
    marginRight: Spacing.sm,
  },
  dropdownInput: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    color: Colors.white,
    padding: 0,
  },
  formatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  formatCard: {
    flexGrow: 1,
    flexBasis: '45%',
    backgroundColor: Colors.gray800,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    position: 'relative',
  },
  formatCardActive: {
    borderColor: Colors.electricGreen,
    backgroundColor: Colors.electricGreen + '0D',
  },
  checkBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.electricGreen,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkText: {
    fontSize: 12,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.deepNavy,
  },
  formatIcon: {
    fontSize: Typography.fontSize['2xl'],
    marginBottom: Spacing.sm,
  },
  formatLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
  },
  formatLabelActive: {
    color: Colors.electricGreen,
  },
  oversRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.gray800,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  oversLabel: {
    fontSize: Typography.fontSize.base,
    color: Colors.white,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  stepperButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.gray700,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperButtonText: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
  },
  oversValue: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
    minWidth: 32,
    textAlign: 'center',
  },
  venueInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray800,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? Spacing.md : Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  venueIcon: {
    fontSize: Typography.fontSize.lg,
    marginRight: Spacing.sm,
  },
  venueInput: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    color: Colors.white,
    padding: 0,
  },
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray800,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    borderColor: Colors.electricGreen,
    backgroundColor: Colors.electricGreen + '1A',
  },
  chipText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.gray400,
  },
  chipTextActive: {
    color: Colors.electricGreen,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  nextButton: {
    backgroundColor: Colors.electricGreen,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.deepNavy,
  },
});
