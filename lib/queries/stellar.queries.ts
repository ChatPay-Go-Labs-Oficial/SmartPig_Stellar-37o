import { useQuery } from '@tanstack/react-query';
import { StellarApi } from '@/lib/api/stellar';
import { useWalletStore } from '@/lib/stores/wallet.store';

const isTestnet = (process.env.EXPO_PUBLIC_STELLAR_NETWORK_PASSPHRASE ?? '').includes('Test');

const USDC_ISSUER = isTestnet
  ? 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5'
  : 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';

export const useWalletBalance = () => {
  const walletAddress = useWalletStore((s) => s.walletAddress);
  return useQuery({
    queryKey: ['stellar-balance', walletAddress],
    queryFn: () => StellarApi.getAccountBalances(walletAddress!),
    enabled: !!walletAddress,
    refetchInterval: 30_000,
    select: (balances) => {
      const xlm = balances.find((b) => b.asset_type === 'native');
      const usdc = balances.find(
        (b) => 'asset_code' in b && b.asset_code === 'USDC' && b.asset_issuer === USDC_ISSUER,
      );
      return {
        xlm: xlm ? parseFloat(xlm.balance) : 0,
        usdc: usdc ? parseFloat(usdc.balance) : 0,
      };
    },
  });
};
