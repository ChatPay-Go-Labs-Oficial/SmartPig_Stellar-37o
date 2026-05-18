import { useQuery } from '@tanstack/react-query';
import { getAccountBalances, findUsdcBalance } from '@/lib/api/balances';

export const balanceKeys = {
  wallet: (address: string) => ['wallet-balance', address] as const,
};

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
