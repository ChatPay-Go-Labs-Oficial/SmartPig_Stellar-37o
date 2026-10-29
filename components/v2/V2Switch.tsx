import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { V2Colors, V2Font, V2Radius } from '@/constants/theme-v2';
import { useAccent } from '@/hooks/use-accent';

const TRACK_WIDTH = 46;
const TRACK_HEIGHT = 28;
const THUMB = 22;
const INSET = (TRACK_HEIGHT - THUMB) / 2;
const TRAVEL = TRACK_WIDTH - THUMB - INSET * 2;

interface V2SwitchProps {
  value: boolean;
  onChange: (value: boolean) => void;
  label: string;
  /** Linha de apoio abaixo do rótulo. */
  description?: string;
  disabled?: boolean;
}

/**
 * Interruptor V2: linha com rótulo à esquerda e a chave à direita. Não usa o
 * Switch nativo, que tem desenho e cores diferentes em cada sistema: o app não
 * usa Switch em lugar nenhum (ver components/ui/ModeSwitch.tsx). A linha
 * inteira é o alvo do toque. Ligado no destaque do tema; desligado em vidro.
 */
export function V2Switch({ value, onChange, label, description, disabled = false }: V2SwitchProps) {
  const accent = useAccent();
  const progress = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(value ? 1 : 0, { duration: 160 });
  }, [progress, value]);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * TRAVEL }],
  }));

  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onChange(!value);
      }}
      disabled={disabled}
      style={({ pressed }) => [styles.row, pressed && styles.pressed, disabled && styles.disabled]}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={description}
      accessibilityState={{ checked: value, disabled }}
    >
      <View style={styles.texts}>
        <Text style={styles.label} maxFontSizeMultiplier={1.3}>
          {label}
        </Text>
        {description ? (
          <Text style={styles.description} maxFontSizeMultiplier={1.3}>
            {description}
          </Text>
        ) : null}
      </View>
      <View
        style={[
          styles.track,
          value
            ? { backgroundColor: accent.base, borderColor: accent.base }
            : styles.trackOff,
        ]}
      >
        <Animated.View style={[styles.thumb, thumbStyle]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.5,
  },
  texts: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontFamily: V2Font.semiBold,
    fontSize: 14,
    color: V2Colors.text,
  },
  description: {
    fontFamily: V2Font.medium,
    fontSize: 12.5,
    lineHeight: 17,
    color: V2Colors.textSecondary,
  },
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: V2Radius.full,
    borderWidth: 1,
    padding: INSET - 1,
    justifyContent: 'center',
  },
  trackOff: {
    backgroundColor: V2Colors.chip,
    borderColor: V2Colors.chipBorder,
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: V2Colors.onPrimary,
  },
});
