import { useCallback } from 'react';
import { featureFlags } from '@/lib/config/features';
import { useIsPro } from '@/hooks/use-app-mode';
import { useVaults } from '@/lib/queries/vaults.queries';

/**
 * Quais porquinhos aparecem (E6, plano 5.4).
 *
 * Com o PigFi Experience, o backend manda o `access` de cada vault e todos
 * aparecem: no Lite, o bloqueio pelas lições vale só para guardar e é mostrado
 * no próprio porquinho (lib/utils/vault-access.ts). Um backend sem o `access`
 * mantém a regra antiga da flag EXPO_PUBLIC_MULTI_ASSET_VAULTS_PRO_ONLY: no
 * Lite, só o dólar aparece.
 */
export function useVaultAccess() {
  const isPro = useIsPro();
  const vaults = useVaults().data;
  const fromBackend = !!vaults?.some((vault) => vault.access);
  const restricted = featureFlags.multiAssetVaultsProOnly && !fromBackend;

  const canAccessVaultAsset = useCallback(
    (assetSymbol: string) => !restricted || isPro || assetSymbol.toUpperCase() === 'USDC',
    [isPro, restricted],
  );

  return { canAccessVaultAsset };
}
