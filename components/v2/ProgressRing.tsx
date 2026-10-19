import { memo } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

interface ProgressRingProps {
  size: number;
  thickness: number;
  /** 0–1, a partir do topo, no sentido horário. */
  progress: number;
  color: string;
  trackColor: string;
}

/**
 * Anel de progresso (Figma: elipse com arco, ponta reta), sem SVG.
 *
 * Um anel com só as bordas de cima e da direita coloridas desenha meia volta
 * (de −45° a 135°); girado, a meia volta começa no ângulo que se quiser. Cada
 * metade da tela (direita, 0–180°; esquerda, 180–360°) recorta uma meia volta
 * girada até o fim do progresso, e juntas formam o arco.
 */
function ProgressRingView({ size, thickness, progress, color, trackColor }: ProgressRingProps) {
  const angle = Math.min(1, Math.max(0, progress)) * 360;
  const half = size / 2;

  const halfRing = (rotation: number): ViewStyle => ({
    position: 'absolute',
    width: size,
    height: size,
    borderRadius: half,
    borderWidth: thickness,
    borderTopColor: color,
    borderRightColor: color,
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
    transform: [{ rotate: `${rotation + 45}deg` }],
  });

  return (
    <View style={{ width: size, height: size }} pointerEvents="none">
      <View
        style={[
          StyleSheet.absoluteFill,
          { borderRadius: half, borderWidth: thickness, borderColor: trackColor },
        ]}
      />
      {angle > 0 ? (
        <View style={[styles.window, { left: half, width: half, height: size }]}>
          <View style={[halfRing(Math.min(angle, 180) - 180), { left: -half }]} />
        </View>
      ) : null}
      {angle > 180 ? (
        <View style={[styles.window, { left: 0, width: half, height: size }]}>
          <View style={[halfRing(angle - 180), { left: 0 }]} />
        </View>
      ) : null}
    </View>
  );
}

export const ProgressRing = memo(ProgressRingView);

const styles = StyleSheet.create({
  window: {
    position: 'absolute',
    top: 0,
    overflow: 'hidden',
  },
});
