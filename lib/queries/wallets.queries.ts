import { useQuery } from '@tanstack/react-query';
import * as walletsApi from '@/lib/api/wallets';
import { listUsdcTransfers } from '@/lib/stellar/transfers';
import { getUsdcPrice, loadWalletAssets } from '@/lib/stellar/balances';
import type { WalletAssetId } from '@/lib/stellar/assets';

export const walletKeys = {
  balance: (address: string) => ['wallet-balance', address] as const,
  // Prefixo de `balance` de propósito: os modais que invalidam o saldo depois
  // de um depósito, saque ou envio atualizam a Carteira junto, sem conhecê-la.
  assets: (address: string) => ['wallet-balance', address, 'assets'] as const,
  transfers: (address: string) => ['wallet-transfers', address] as const,
  usdcPrice: (assetId: WalletAssetId) => ['asset-usdc-price', assetId] as const,
};

export function useWalletBalance(address: string | null) {
  return useQuery({
    queryKey: walletKeys.balance(address ?? ''),
    queryFn: () => walletsApi.getWalletBalance(address!),
    enabled: !!address,
    refetchInterval: 1000 * 30,
  });
}

export function useUsdcTransfers(address: string | null) {
  return useQuery({
    queryKey: walletKeys.transfers(address ?? ''),
    queryFn: () => listUsdcTransfers(address!, 20),
    enabled: !!address,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}

/** Saldos da Carteira direto do Horizon (zeros e trustline incluídos). */
export function useWalletAssets(address: string | null) {
  return useQuery({
    queryKey: walletKeys.assets(address ?? ''),
    queryFn: () => loadWalletAssets(address!),
    enabled: !!address,
    refetchInterval: 1000 * 30,
  });
}

/** Cotação estimada em USDC; `null` quando a rede não tem rota. */
export function useUsdcPrice(assetId: WalletAssetId, enabled = true) {
  return useQuery({
    queryKey: walletKeys.usdcPrice(assetId),
    queryFn: () => getUsdcPrice(assetId),
    enabled,
    staleTime: 60_000,
    refetchInterval: 60_000,
    // Sem cotação a tela só omite a estimativa; não vale insistir.
    retry: 1,
  });
}
