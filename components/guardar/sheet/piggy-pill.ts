import type { useTerms } from '@/hooks/use-terms';
import type { TermKey } from '@/lib/copy/terms';
import { formatApy, formatVaultNameForMode } from '@/lib/utils/format';
import type { Piggy } from '@/lib/utils/piggy';

type Terms = ReturnType<typeof useTerms>;

/**
 * Pílula do cabeçalho dos sheets ("Porquinho Poupador · 7,1% ao ano"). O
 * ponto é sempre o destaque, nos três porquinhos (Figma 08k, 16a, 16p).
 */
export function piggyPill(piggy: Piggy, terms: Terms, dotColor: string) {
  const { t, p, isPro, mode } = terms;
  const name = piggy.asset
    ? t(`guardar.piggy.${piggy.asset}.name` as TermKey)
    : formatVaultNameForMode(piggy.vault.name, mode);
  const apy = piggy.vault.apy != null ? formatApy(piggy.vault.apy) : null;
  const rate = apy
    ? p('guardar.rate', { apy })
    : piggy.asset === 'XLM'
      ? isPro
        ? 'APY muito baixo'
        : 'taxa muito baixa hoje'
      : null;
  return { label: rate ? `${name} · ${rate}` : name, dotColor };
}
