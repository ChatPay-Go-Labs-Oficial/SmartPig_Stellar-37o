import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAccent } from '@/hooks/use-accent';

/**
 * Brilho do destaque no topo das telas V2 (Figma "brilho": radial de 32% a 0%).
 *
 * O React Native não tem gradiente radial sem SVG; o degradê vertical com as
 * mesmas paradas reproduz o efeito, que já se espalha quase na largura toda.
 */
export function ScreenGlow() {
  const accent = useAccent();
  return (
    <LinearGradient
      pointerEvents="none"
      colors={[accent.alpha(0.32), accent.alpha(0.06), accent.alpha(0)]}
      locations={[0, 0.6, 1]}
      style={styles.glow}
    />
  );
}

const styles = StyleSheet.create({
  glow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 520,
  },
});
