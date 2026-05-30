import { apiClient } from './client';

export interface WalletBalance {
  asset: string;
  balance: string;
}

export async function getWalletBalance(stellarAddress: string): Promise<WalletBalance[]> {
  const { data } = await apiClient.get(`/wallets/${stellarAddress}/balance`);
  return data.balances;
}

export function findUsdcBalance(balances: WalletBalance[]): string {
  const usdc = balances.find((b) => b.asset.startsWith('USDC:'));
  return usdc?.balance ?? '0';
}
