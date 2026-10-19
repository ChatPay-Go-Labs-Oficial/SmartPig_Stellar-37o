import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { useAccent } from '@/hooks/use-accent';

/** Máscara radial branca (alfa = 1 − r), tingida pelo app. Ver RadialAura. */
export const RADIAL_MASK = require('@/assets/images/v2/aura-radial.png');

// Parada do meio do Figma: 6% de destaque a 60% do raio, igual nas telas.
const MID_STOP = 0.6;
const MID_ALPHA = 0.06;

interface ScreenGlowProps {
  /** Opacidade do destaque no centro (Figma: Carteira 32%, Guardar 40%). */
  peak?: number;
  /** Altura do quadro "brilho" no Figma; o raio vertical é 80% dela. */
  height?: number;
}

/**
 * Brilho do destaque no topo das telas V2 (Figma "brilho"): radial elíptico
 * com centro no meio da borda de cima, raio horizontal de 90% da largura, e
 * paradas `peak` → 6% (em 60% do raio) → 0.
 *
 * Sem react-native-svg, o radial é feito com a mesma máscara linear (1 − r)
 * em duas camadas tingidas: uma no raio inteiro (leva os 6% até a borda) e
 * outra em 60% do raio (sobe o centro até `peak`). A opacidade da camada de
 * dentro compensa a composição das duas.
 */
export function ScreenGlow({ peak = 0.32, height = 520 }: ScreenGlowProps) {
  const accent = useAccent();
  const { width } = useWindowDimensions();

  const rx = width * 0.9;
  const ry = height * 0.8;
  const outer = MID_ALPHA / (1 - MID_STOP);
  const inner = (peak - outer) / (1 - outer);

  return (
    <View pointerEvents="none" style={[styles.glow, { height }]}>
      <Image
        source={RADIAL_MASK}
        tintColor={accent.base}
        contentFit="fill"
        style={[styles.layer, ellipse(width / 2, rx, ry), { opacity: outer }]}
      />
      <Image
        source={RADIAL_MASK}
        tintColor={accent.base}
        contentFit="fill"
        style={[styles.layer, ellipse(width / 2, rx * MID_STOP, ry * MID_STOP), { opacity: inner }]}
      />
    </View>
  );
}

/** Caixa da elipse com centro em (cx, 0): a metade de cima fica fora da tela. */
function ellipse(cx: number, rx: number, ry: number) {
  return { left: cx - rx, top: -ry, width: rx * 2, height: ry * 2 };
}

const styles = StyleSheet.create({
  glow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  layer: {
    position: 'absolute',
  },
});
