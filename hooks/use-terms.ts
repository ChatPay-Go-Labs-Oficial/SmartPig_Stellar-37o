import { useMemo } from 'react';
import { useAppMode } from './use-app-mode';
import {
  TERMS,
  PHRASES,
  type TermKey,
  type PhraseKey,
} from '@/lib/copy/terms';

/**
 * Resolve os termos que mudam entre Lite e Pro.
 *
 * Uso:
 *   const { t, p, isPro } = useTerms();
 *   <Text>{t('wallet.address.label')}</Text>
 *   {isPro && <Text>{p('tx.hash.short', { hash })}</Text>}
 */
export function useTerms() {
  const mode = useAppMode();

  return useMemo(
    () => ({
      mode,
      isPro: mode === 'pro',
      /** Termo simples. */
      t: (key: TermKey): string => TERMS[key][mode],
      /** Termo com interpolação. */
      p: <K extends PhraseKey>(
        key: K,
        vars: Parameters<(typeof PHRASES)[K]['lite']>[0],
      ): string => (PHRASES[key][mode] as (v: unknown) => string)(vars),
    }),
    [mode],
  );
}
