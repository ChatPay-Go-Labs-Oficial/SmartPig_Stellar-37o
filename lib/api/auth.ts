import { apiClient } from './client';

export interface AuthResponse {
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

export const walletLogin = async (stellarAddress: string): Promise<AuthResponse> => {
  const { data } = await apiClient.post('/auth/wallet', { stellarAddress });
  return data;
};
