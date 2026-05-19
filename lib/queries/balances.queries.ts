import { useQuery } from '@tanstack/react-query';
import { getAccountBalances, findUsdcBalance, findTotalBalance } from '@/lib/api/balances';

export const balanceKeys = {
  wallet: (address: string) => ['wallet-balance', address] as const,
};

export interface WalletBalances {
  usdc: number;
  total: number;
}

export const useWalletBalances = (walletAddress: string | null) =>
  useQuery({
    queryKey: balanceKeys.wallet(walletAddress ?? ''),
    queryFn: async (): Promise<WalletBalances> => {
      const balances = await getAccountBalances(walletAddress!);
      return {
        usdc: findUsdcBalance(balances),
        total: findTotalBalance(balances),
      };
    },
    enabled: !!walletAddress,
    refetchInterval: 1000 * 30,
  });

// Keep for backwards compat
export const useUsdcBalance = (walletAddress: string | null) =>
  useQuery({
    queryKey: balanceKeys.wallet(walletAddress ?? ''),
    queryFn: async () => {
      const balances = await getAccountBalances(walletAddress!);
      return findUsdcBalance(balances);
    },
    enabled: !!walletAddress,
    refetchInterval: 1000 * 30,
  });
