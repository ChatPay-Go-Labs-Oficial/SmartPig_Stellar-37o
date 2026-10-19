import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { V2Colors, V2Font } from '@/constants/theme-v2';
import { useAccent } from '@/hooks/use-accent';
import { V2Icon } from './V2Icon';

interface V2CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  accessibilityHint?: string;
}

/**
 * Caixa de seleção V2 (Figma 13a/13b): 24×24, raio 8. Desmarcada só com a
 * borda; marcada no destaque, com o check branco. A linha inteira é o alvo
 * do toque, e tocar de novo desmarca.
 */
export function V2Checkbox({ checked, onChange, label, disabled = false, accessibilityHint }: V2CheckboxProps) {
  const accent = useAccent();

  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onChange(!checked);
      }}
      disabled={disabled}
      style={({ pressed }) => [styles.row, pressed && styles.pressed, disabled && styles.disabled]}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ checked, disabled }}
      hitSlop={6}
    >
      <View
        style={[
          styles.box,
          checked ? { backgroundColor: accent.base, borderColor: accent.base } : styles.boxIdle,
        ]}
      >
        {checked && <V2Icon name="check" size={14} color={V2Colors.onPrimary} />}
      </View>
      <Text style={styles.label} maxFontSizeMultiplier={1.3}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.5,
  },
  box: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxIdle: {
    borderColor: 'rgba(255,255,255,0.35)',
  },
  label: {
    flex: 1,
    fontFamily: V2Font.semiBold,
    fontSize: 14,
    color: V2Colors.onPrimary,
  },
});
