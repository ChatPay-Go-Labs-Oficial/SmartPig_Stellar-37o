import { View, Text, StyleSheet } from 'react-native';
import { Colors, Accent, Font, FontSize, Spacing } from '@/constants/theme';

interface OnboardingProgressProps {
  /** 1-indexed passo atual */
  step: number;
  total: number;
}

export function OnboardingProgress({ step, total }: OnboardingProgressProps) {
  return (
    <View style={styles.container}>
      <View style={styles.track}>
        {Array.from({ length: total }).map((_, i) => (
          <View
            key={i}
            style={[styles.segment, i < step && styles.segmentActive]}
          />
        ))}
      </View>
      <Text style={styles.label}>
        Passo {step} de {total}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
    marginBottom: Spacing[6],
  },
  track: {
    flexDirection: 'row',
    gap: 6,
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.muted,
  },
  segmentActive: {
    backgroundColor: Accent.primary,
  },
  label: {
    fontSize: FontSize.label,
    fontFamily: Font.bold,
    color: Colors.mutedForeground,
  },
});
