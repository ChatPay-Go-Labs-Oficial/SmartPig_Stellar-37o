import { useQuery } from '@tanstack/react-query';
import * as walletsApi from '@/lib/api/wallets';

export const walletKeys = {
  balance: (address: string) => ['wallet-balance', address] as const,
};

export function useWalletBalance(address: string | null) {
  return useQuery({
    queryKey: walletKeys.balance(address ?? ''),
    queryFn: () => walletsApi.getWalletBalance(address!),
    enabled: !!address,
    refetchInterval: 1000 * 30,
  });
}
