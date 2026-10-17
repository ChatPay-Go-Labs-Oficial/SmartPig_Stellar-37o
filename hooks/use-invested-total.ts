import { useMemo } from 'react';
import { useAuthStore } from '@/lib/stores/auth.store';
import { usePortfolioSummary } from '@/lib/queries/portfolio.queries';
import { useVaults } from '@/lib/queries/vaults.queries';
import { useVaultAccess } from '@/hooks/use-vault-access';
import { apyNumber } from '@/lib/utils/live-amount';
import { portfolioPositionUsdValue, positionUsesMarketPrice } from '@/lib/utils/portfolio';

/**
 * Total guardado nos porquinhos que a pessoa vê, em dólar: é o número do
 * topo da Home e o que decide o nível do porquinho (Home, Evolução, Perfil).
 *
 * - `ready` só fica true com uma leitura completa do portfólio: o hook
 *   compartilhado não troca a última fotografia completa por uma parcial, e
 *   se a primeira leitura da sessão já falhar ainda não há número confiável.
 * - `valuationUnavailable`: algum porquinho visível não pôde ser cotado.
 * - `usesMarketPricing`: há moeda cotada (euro, cripto); o total é estimativa.
 * - `apy`: média das taxas pesada pelo valor de cada porquinho (sem taxa conta
 *   zero), arredondada para que um porquinho só dê exatamente a taxa dele.
 */
export function useInvestedTotal() {
  const walletAddress = useAuthStore((s) => s.walletAddress);
  const portfolioQuery = usePortfolioSummary(!!walletAddress);
  const vaultsQuery = useVaults();
  const { canAccessVaultAsset } = useVaultAccess();

  const summary = portfolioQuery.data;
  const complete = summary?.totalUsd !== null ? summary : undefined;

  const positions = useMemo(
    () => (complete?.positions ?? []).filter((p) => canAccessVaultAsset(p.assetSymbol)),
    [canAccessVaultAsset, complete],
  );

  const totalUsd = useMemo(
    () =>
      positions.reduce((total, position) => {
        const value = portfolioPositionUsdValue(position);
        return value === null ? total : total + value;
      }, 0),
    [positions],
  );

  const vaults = vaultsQuery.data;
  const apy = useMemo(() => {
    const apyByVault = new Map((vaults ?? []).map((vault) => [vault.id, apyNumber(vault.apy)]));
    let weighted = 0;
    let sum = 0;
    for (const position of positions) {
      const value = portfolioPositionUsdValue(position);
      if (value === null || value <= 0) continue;
      weighted += value * (apyByVault.get(position.vaultId) ?? 0);
      sum += value;
    }
    return sum > 0 ? Math.round((weighted / sum) * 1e6) / 1e6 : null;
  }, [vaults, positions]);

  return {
    portfolioQuery,
    vaultsQuery,
    /** Leitura completa do portfólio (undefined enquanto não houver). */
    summary: complete,
    ready: !!complete,
    totalUsd,
    apy,
    valuationUnavailable:
      !complete || positions.some((position) => portfolioPositionUsdValue(position) === null),
    usesMarketPricing: positions.some(positionUsesMarketPrice),
  };
}
