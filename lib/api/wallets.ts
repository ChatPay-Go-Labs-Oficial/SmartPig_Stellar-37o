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

export interface WalletDetails {
  id: string;
  userId: string;
  stellarAddress: string;
  isActivated: boolean;
}

const ACTIVATION_TIMEOUT_MS = 35_000;

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
  const { data } = await apiClient.post('/wallets/activate', params, {
    timeout: ACTIVATION_TIMEOUT_MS,
  });
  return data;
}

export async function submitActivation(params: {
  walletAccountId: string;
  signedXdr: string;
}): Promise<ActivationSubmitResponse> {
  const { data } = await apiClient.post('/wallets/activate/submit', params, {
    timeout: ACTIVATION_TIMEOUT_MS,
  });
  return data;
}

export async function getWallet(walletAccountId: string): Promise<WalletDetails> {
  const { data } = await apiClient.get(`/wallets/${walletAccountId}`);
  return data;
}
