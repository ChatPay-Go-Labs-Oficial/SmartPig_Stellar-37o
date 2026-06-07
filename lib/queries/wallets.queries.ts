import { useQuery } from '@tanstack/react-query';
import * as walletsApi from '@/lib/api/wallets';
import { listUsdcTransfers } from '@/lib/stellar/transfers';

export const walletKeys = {
  balance: (address: string) => ['wallet-balance', address] as const,
  transfers: (address: string) => ['wallet-transfers', address] as const,
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
