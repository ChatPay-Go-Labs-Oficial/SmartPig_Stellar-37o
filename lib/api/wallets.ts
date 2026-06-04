import { apiClient } from './client';

export interface WalletBalance {
  asset: string;
  balance: string;
}

export interface ActivationXdrResponse {
  unsignedXdr: string;
}

export interface ActivationSubmitResponse {
  success: boolean;
  txHash: string;
}

export async function getWalletBalance(stellarAddress: string): Promise<WalletBalance[]> {
  const { data } = await apiClient.get(`/wallets/${stellarAddress}/balance`);
  return data.balances;
}

export function findUsdcBalance(balances: WalletBalance[]): string {
  const usdc = balances.find((b) => b.asset.startsWith('USDC:'));
  return usdc?.balance ?? '0';
}

export async function getActivationXdr(params: {
  userId: string;
  walletAccountId: string;
  stellarAddress: string;
}): Promise<ActivationXdrResponse> {
  const { data } = await apiClient.post('/wallets/activate', params);
  return data;
}

export async function submitActivation(params: {
  walletAccountId: string;
  signedXdr: string;
}): Promise<ActivationSubmitResponse> {
  const { data } = await apiClient.post('/wallets/activate/submit', params);
  return data;
}
