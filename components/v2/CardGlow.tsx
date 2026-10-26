import { StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useAccent } from '@/hooks/use-accent';
import { RADIAL_MASK } from './ScreenGlow';

/**
 * Brilho de cartão (Figma: módulo e Dicionário da Trilha, cartões de valor da
 * lição): radial do destaque a 24%, centrado no alto do cartão, mais largo que
 * ele. O cartão precisa de `overflow: 'hidden'`.
 */
export function CardGlow() {
  const accent = useAccent();
  return (
    <Image
      source={RADIAL_MASK}
      tintColor={accent.base}
      contentFit="fill"
      pointerEvents="none"
      style={styles.glow}
    />
  );
}

const styles = StyleSheet.create({
  glow: {
    position: 'absolute',
    left: '-5.55%',
    width: '111.1%',
    top: '-7.14%',
    height: '71.43%',
    opacity: 0.24,
  },
});
