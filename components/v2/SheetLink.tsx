import { Pressable, StyleSheet, Text } from 'react-native';
import { V2Colors, V2Font } from '@/constants/theme-v2';

interface SheetLinkProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

/** Ação secundária em texto, sob o botão de um sheet (Figma "link": "Cancelar"). */
export function SheetLink({ label, onPress, disabled = false }: SheetLinkProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.link, (pressed || disabled) && styles.dimmed]}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      hitSlop={8}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  dimmed: {
    opacity: 0.5,
  },
  label: {
    fontFamily: V2Font.bold,
    fontSize: 14,
    color: V2Colors.textSecondary,
  },
});
