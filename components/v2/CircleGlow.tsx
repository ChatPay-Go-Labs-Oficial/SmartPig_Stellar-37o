import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { useAccent } from '@/hooks/use-accent';
import { RADIAL_MASK } from './ScreenGlow';

// Paradas do Figma: 32% no centro, 6% a 60% do raio, 0 na borda. Duas
// camadas da máscara linear compõem as três paradas (ver ScreenGlow).
const MID_STOP = 0.6;
const OUTER = 0.06 / (1 - MID_STOP);
const INNER = (0.32 - OUTER) / (1 - OUTER);

interface CircleGlowProps {
  /** Diâmetro do círculo que recorta o brilho. */
  size: number;
  /** Opacidade do círculo inteiro no Figma (ex.: 0,85 na conclusão da trilha). */
  opacity?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Brilho redondo do destaque (Figma "brilho" do Seu nível, da conclusão e do
 * fundo da Trilha): radial com centro no meio da borda de cima, raios de 90% e
 * 80% do diâmetro, recortado pelo círculo.
 */
export function CircleGlow({ size, opacity = 1, style }: CircleGlowProps) {
  const accent = useAccent();
  const rx = size * 0.9;
  const ry = size * 0.8;
  return (
    <View
      pointerEvents="none"
      style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }, style]}
    >
      <Image
        source={RADIAL_MASK}
        tintColor={accent.base}
        contentFit="fill"
        style={[styles.layer, ellipse(size, rx, ry), { opacity: OUTER * opacity }]}
      />
      <Image
        source={RADIAL_MASK}
        tintColor={accent.base}
        contentFit="fill"
        style={[styles.layer, ellipse(size, rx * MID_STOP, ry * MID_STOP), { opacity: INNER * opacity }]}
      />
    </View>
  );
}

/** Elipse com centro no meio da borda de cima do círculo. */
function ellipse(size: number, rx: number, ry: number) {
  return { left: size / 2 - rx, top: -ry, width: rx * 2, height: ry * 2 };
}

const styles = StyleSheet.create({
  circle: {
    overflow: 'hidden',
  },
  layer: {
    position: 'absolute',
  },
});
