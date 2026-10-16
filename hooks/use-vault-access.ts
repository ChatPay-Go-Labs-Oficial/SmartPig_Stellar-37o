import { useCallback } from 'react';
import { featureFlags } from '@/lib/config/features';
import { useAppModeReady, useIsPro } from '@/hooks/use-app-mode';

export function useVaultAccess() {
  const isPro = useIsPro();
  const appModeReady = useAppModeReady();
  const restricted = featureFlags.multiAssetVaultsProOnly;
  const canAccessVaultAsset = useCallback(
    (assetSymbol: string) =>
      !restricted || isPro || assetSymbol.toUpperCase() === 'USDC',
    [isPro, restricted],
  );

  return {
    canAccessMultiAssetVaults: !restricted || isPro,
    canAccessVaultAsset,
    isVaultAccessReady: !restricted || appModeReady,
  };
}
