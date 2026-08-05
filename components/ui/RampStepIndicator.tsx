import { View, Text, StyleSheet } from 'react-native';
import { Colors, Accent, Font, FontSize, Spacing } from '@/constants/theme';

interface RampStepIndicatorProps {
  /** 1-indexed passo atual */
  step: number;
  total: number;
  /** Nome curto do passo, ex.: "Confirmar" */
  label: string;
  accentColor?: string;
}

export function RampStepIndicator({ step, total, label, accentColor }: RampStepIndicatorProps) {
  const color = accentColor ?? Accent.primary;
  return (
    <View style={styles.container}>
      <View style={styles.track}>
        {Array.from({ length: total }).map((_, i) => (
          <View
            key={i}
            style={[styles.segment, i < step && { backgroundColor: color }]}
          />
        ))}
      </View>
      <Text style={styles.label}>
        Passo {step} de {total} · {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 6,
    marginBottom: Spacing[4],
  },
  track: {
    flexDirection: 'row',
    gap: 5,
  },
  segment: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.muted,
  },
  label: {
    fontSize: FontSize.label,
    fontFamily: Font.bold,
    color: Colors.mutedForeground,
  },
});
