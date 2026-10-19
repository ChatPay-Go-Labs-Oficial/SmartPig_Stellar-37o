/**
 * Feature flags públicas são incorporadas ao bundle pelo Expo durante o build.
 * Elas controlam exposição de interface, não substituem autorização no backend.
 */
export const featureFlags = {
  multiAssetVaultsProOnly:
    process.env.EXPO_PUBLIC_MULTI_ASSET_VAULTS_PRO_ONLY === 'true',
} as const;
