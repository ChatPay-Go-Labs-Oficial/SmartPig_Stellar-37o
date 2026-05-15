import { apiClient } from './client';

export interface WalletLoginResponse {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    createdAt: string;
  };
  wallet: {
    id: string;
    stellarAddress: string;
    label: string | null;
  };
  isNewUser: boolean;
}

export const AuthApi = {
  walletLogin: (stellarAddress: string): Promise<WalletLoginResponse> =>
    apiClient
      .post<WalletLoginResponse>('/auth/wallet', { stellarAddress, label: 'My main wallet' })
      .then((r) => r.data),
};
