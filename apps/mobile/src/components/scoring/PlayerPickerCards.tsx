import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography, BorderRadius } from '@crichead/ui/mobile';
import { Plus } from 'lucide-react-native';

export interface PlayerPickerCardsProps {
  strikerId: string | null;
  nonStrikerId: string | null;
  bowlerId: string | null;
  onPickStriker: () => void;
  onPickNonStriker: () => void;
  onPickBowler: () => void;
}

export function PlayerPickerCards({
  strikerId,
  nonStrikerId,
  bowlerId,
  onPickStriker,
  onPickNonStriker,
  onPickBowler,
}: PlayerPickerCardsProps) {
  return (
    <View style={styles.container}>
      {!strikerId && (
        <TouchableOpacity style={styles.card} onPress={onPickStriker} activeOpacity={0.7}>
          <View style={styles.avatar}>
            <Plus size={22} color={Colors.gray500} strokeWidth={1.5} />
          </View>
          <View style={styles.info}>
            <Text style={styles.role}>STRIKER (ON-STRIKE)</Text>
            <Text style={styles.name}>Pick Striker</Text>
          </View>
        </TouchableOpacity>
      )}
      {!nonStrikerId && (
        <TouchableOpacity style={styles.card} onPress={onPickNonStriker} activeOpacity={0.7}>
          <View style={styles.avatar}>
            <Plus size={22} color={Colors.gray500} strokeWidth={1.5} />
          </View>
          <View style={styles.info}>
            <Text style={styles.role}>NON-STRIKER</Text>
            <Text style={styles.name}>Pick Non-Striker</Text>
          </View>
        </TouchableOpacity>
      )}
      {!bowlerId && (
        <TouchableOpacity style={styles.card} onPress={onPickBowler} activeOpacity={0.7}>
          <View style={styles.avatar}>
            <Plus size={22} color={Colors.gray500} strokeWidth={1.5} />
          </View>
          <View style={styles.info}>
            <Text style={styles.role}>BOWLER</Text>
            <Text style={styles.name}>Pick Bowler</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray900,
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
    borderColor: Colors.electricGreen + '4D',
    borderStyle: 'dashed',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.gray700,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
  },
  role: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
    letterSpacing: 1,
    marginBottom: 4,
  },
  name: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.electricGreen,
  },
});
