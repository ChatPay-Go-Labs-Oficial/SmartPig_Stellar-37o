import { Pressable, StyleSheet, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import { V2Colors, V2Font, V2Radius } from '@/constants/theme-v2';
import { useAccent } from '@/hooks/use-accent';

interface FilterChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

/** Pílula de filtro V2 (Histórico). */
export function FilterChip({ label, selected, onPress }: FilterChipProps) {
  const accent = useAccent();
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[
        styles.chip,
        selected
          ? { backgroundColor: accent.base, borderColor: accent.base }
          : { backgroundColor: V2Colors.chip, borderColor: V2Colors.surfaceBorderStrong },
      ]}
    >
      <Text style={[styles.label, { color: selected ? V2Colors.onPrimary : V2Colors.textSecondary }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: V2Radius.full,
    borderWidth: 1,
  },
  label: {
    fontFamily: V2Font.bold,
    fontSize: 13,
  },
});
