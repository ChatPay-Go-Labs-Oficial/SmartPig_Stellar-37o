import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { V2Colors } from '@/constants/theme-v2';
// Direto do arquivo, não do índice: a abertura usa este fundo e não deve
// carregar todos os componentes V2 antes do primeiro quadro.
import { ScreenGlow } from '@/components/v2/ScreenGlow';

const STARS = require('@/assets/images/v2/estrelas.png');

/**
 * Fundo das telas de entrada (Figma "Entrada"): o fundo V2, o brilho do
 * destaque no topo (40% → 6% → 0, raio vertical de 477) e as estrelas.
 * Mesmo fundo na abertura, no login, no "Entrando..." e nos bloqueios, para a
 * passagem entre eles parecer uma tela só.
 */
export function EntryBackdrop({ stars = true }: { stars?: boolean }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[StyleSheet.absoluteFill, styles.base]} />
      <ScreenGlow peak={0.4} height={596} />
      {stars && <Image source={STARS} contentFit="cover" style={StyleSheet.absoluteFill} />}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: V2Colors.background,
  },
});
