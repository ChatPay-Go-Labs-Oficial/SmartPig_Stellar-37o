import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Font, FontSize, Gradients, Radius } from '@/constants/theme';
import { PressableScale } from './PressableScale';
import type { AppMode } from '@/lib/stores/app-mode.store';

interface ModeSwitchProps {
  mode: AppMode;
  onSelect: (mode: AppMode) => void;
  disabled?: boolean;
}

const SEGMENTS: readonly { value: AppMode; label: string }[] = [
  { value: 'lite', label: 'Lite' },
  { value: 'pro', label: 'Pro' },
];

/**
 * Seletor de dois segmentos para o modo do app. Não usa Switch nativo porque o
 * app não usa Switch em lugar nenhum — todos os toggles são Pressable (ver o
 * botão de mudo em app/(tabs)/index.tsx).
 *
 * O segmento ativo usa Gradients.primary nos dois modos: a decisão de produto
 * é que o Pro se diferencia por densidade e precisão, não por paleta.
 */
export function ModeSwitch({ mode, onSelect, disabled = false }: ModeSwitchProps) {
  return (
    <View
      style={[styles.track, disabled && styles.trackDisabled]}
      accessibilityRole="radiogroup"
      accessibilityLabel="Modo do app"
    >
      {SEGMENTS.map((segment) => {
        const isActive = segment.value === mode;

        return (
          <PressableScale
            key={segment.value}
            scale={0.97}
            disabled={disabled}
            onPress={() => onSelect(segment.value)}
            style={styles.segmentPressable}
            accessibilityRole="radio"
            accessibilityState={{ selected: isActive, disabled }}
            accessibilityLabel={`Modo ${segment.label}`}
          >
            {isActive ? (
              <LinearGradient
                colors={Gradients.primary as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.segment}
              >
                <Text style={styles.segmentTextActive}>{segment.label}</Text>
              </LinearGradient>
            ) : (
              <View style={styles.segment}>
                <Text style={styles.segmentText}>{segment.label}</Text>
              </View>
            )}
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: Colors.muted,
    borderRadius: Radius.full,
    padding: 3,
    gap: 3,
  },
  trackDisabled: {
    opacity: 0.5,
  },
  segmentPressable: {
    flex: 1,
  },
  segment: {
    height: 38,
    borderRadius: Radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  segmentText: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.bold,
    color: Colors.mutedForeground,
  },
  segmentTextActive: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.black,
    color: '#fff',
  },
});
