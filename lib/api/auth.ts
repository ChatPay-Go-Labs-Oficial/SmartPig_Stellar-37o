import { apiClient } from './client';

export interface WalletLoginResponse {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    avatarUrl: string | null;
    createdAt: string;
  };
  wallet: {
    id: string;
    stellarAddress: string;
    label: string | null;
    isActive: boolean;
  };
  isNewUser: boolean;
}

export async function walletLogin(stellarAddress: string, label?: string): Promise<WalletLoginResponse> {
  const { data } = await apiClient.post('/auth/wallet', { stellarAddress, label });
  return data;
}
