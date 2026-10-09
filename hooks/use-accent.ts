import { useMemo } from 'react';
import {
  AccentPalettes,
  DEFAULT_ACCENT,
  withAlpha,
  type AccentPalette,
} from '@/constants/theme-v2';

export interface Accent extends AccentPalette {
  /** Variação "Primária N%" do Figma, ex.: `alpha(0.14)`. */
  alpha: (opacity: number) => string;
}

/**
 * Cor de destaque das telas V2.
 *
 * Hoje sempre devolve a paleta padrão. Quando a preferência "Cor do app"
 * existir, ela passa a ser lida aqui — e toda tela V2 muda de cor sem ser
 * tocada. Por isso nenhum componente V2 deve importar AccentPalettes direto.
 */
export function useAccent(): Accent {
  const palette = AccentPalettes[DEFAULT_ACCENT];

  return useMemo(
    () => ({ ...palette, alpha: (opacity: number) => withAlpha(palette.base, opacity) }),
    [palette],
  );
}
