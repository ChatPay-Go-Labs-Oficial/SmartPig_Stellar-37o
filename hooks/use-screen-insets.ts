import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { V2Layout } from '@/constants/theme-v2';

/**
 * Espaçamentos verticais das telas V2 que convivem com a tab bar flutuante.
 *
 * - `top`: altura da safe area (a rolagem começa abaixo dela, para o conteúdo
 *   não passar por baixo dos ícones da barra de status).
 * - `topGap`: respiro até o título. Com entalhe/ilha/furo (inset alto) o
 *   próprio inset já folga, então o respiro é menor.
 * - `bottom`: folga no fim da rolagem para nada ficar atrás da tab bar.
 */
export function useScreenInsets() {
  const insets = useSafeAreaInsets();
  return {
    top: insets.top,
    topGap: insets.top > 24 ? V2Layout.screenTopCutout : V2Layout.screenTop,
    bottom:
      V2Layout.tabBarHeight +
      Math.max(insets.bottom, V2Layout.tabBarBottomMin) +
      V2Layout.tabBarGap,
  };
}
