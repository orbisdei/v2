// Mobile counterpart of the web InterestFilter segmented control.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../constants/theme';
import type { InterestLevel } from '../lib/interestFilter';

const LABELS: Record<InterestLevel, string> = {
  global: 'Global',
  regional: 'Regional',
  local: 'Local',
  personal: 'Personal',
};

interface InterestFilterProps {
  availableLevels: InterestLevel[];
  activeLevels: Set<InterestLevel>;
  onToggle: (level: InterestLevel) => void;
}

export function InterestFilter({ availableLevels, activeLevels, onToggle }: InterestFilterProps) {
  return (
    <View style={styles.row}>
      {availableLevels.map((level) => {
        const active = activeLevels.has(level);
        return (
          <Pressable
            key={level}
            onPress={() => onToggle(level)}
            style={[styles.segment, active && styles.segmentActive]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{LABELS[level]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 999,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  segment: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: Colors.background },
  segmentActive: { backgroundColor: Colors.navy },
  label: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  labelActive: { color: '#fff' },
});
