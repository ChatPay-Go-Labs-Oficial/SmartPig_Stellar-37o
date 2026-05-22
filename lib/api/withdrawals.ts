import { apiClient } from './client';

export interface Withdrawal {
  id: string;
  vaultId: string;
  shares: number;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
  unsignedXdr?: string;
  createdAt: string;
}

export interface CreateWithdrawalParams {
  idempotencyKey: string;
  userId: string;
  walletAccountId: string;
  vaultId: string;
  shareAmount: string;
}

export const createWithdrawal = async (params: CreateWithdrawalParams): Promise<Withdrawal> => {
  const { data } = await apiClient.post('/withdrawals', params);
  return data;
};

export const submitSignedWithdrawal = async (
  withdrawalId: string,
  signedXdr: string,
): Promise<Withdrawal> => {
  const { data } = await apiClient.post(`/withdrawals/${withdrawalId}/signed-xdr`, { signedXdr });
  return data;
};

export const getWithdrawal = async (id: string): Promise<Withdrawal> => {
  const { data } = await apiClient.get(`/withdrawals/${id}`);
  return data;
};

export const listWithdrawals = async (userId: string): Promise<Withdrawal[]> => {
  const { data } = await apiClient.get('/withdrawals', { params: { userId } });
  return data;
};
