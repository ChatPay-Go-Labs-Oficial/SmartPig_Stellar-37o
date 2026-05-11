import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Font, FontSize, Radius } from '@/constants/theme';

type Variant = 'destaque' | 'conquista' | 'sucesso' | 'erro' | 'info' | 'muted';

interface BadgeProps {
  label: string;
  variant?: Variant;
  style?: ViewStyle;
}

const variantConfig: Record<Variant, { bg: string; text: string; border: string }> = {
  destaque:  { bg: 'rgba(244, 52, 180, 0.18)',  text: 'hsl(320, 90%, 75%)',  border: 'rgba(244, 52, 180, 0.28)' },
  conquista: { bg: 'rgba(247, 185, 0, 0.18)',   text: 'hsl(42, 100%, 75%)',  border: 'rgba(247, 185, 0, 0.28)' },
  sucesso:   { bg: 'rgba(25, 213, 96, 0.18)',   text: 'hsl(145, 80%, 68%)',  border: 'rgba(25, 213, 96, 0.28)' },
  erro:      { bg: 'rgba(239, 68, 68, 0.18)',   text: 'hsl(0, 84%, 78%)',    border: 'rgba(239, 68, 68, 0.28)' },
  info:      { bg: 'rgba(139, 92, 246, 0.18)',  text: 'hsl(270, 80%, 78%)',  border: 'rgba(139, 92, 246, 0.28)' },
  muted:     { bg: 'rgba(120, 113, 140, 0.18)', text: 'hsl(260, 10%, 65%)',  border: 'rgba(120, 113, 140, 0.28)' },
};

export function Badge({ label, variant = 'muted', style }: BadgeProps) {
  const { bg, text, border } = variantConfig[variant];

  return (
    <View style={[styles.base, { backgroundColor: bg, borderColor: border }, style]}>
      <Text style={[styles.text, { color: text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: FontSize.label,
    fontFamily: Font.bold,
    fontWeight: '700',
  },
});
