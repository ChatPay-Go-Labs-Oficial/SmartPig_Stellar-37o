import { apiClient } from './client';

export interface Deposit {
  id: string;
  vaultId: string;
  amount: number;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
  unsignedXdr?: string;
  createdAt: string;
}

export interface CreateDepositParams {
  idempotencyKey: string;
  userId: string;
  walletAccountId: string;
  vaultId: string;
  amount: string;
  assetSymbol: string;
}

export const createDeposit = async (params: CreateDepositParams): Promise<Deposit> => {
  const { data } = await apiClient.post('/deposits', params);
  return data;
};

export const submitSignedDeposit = async (depositId: string, signedXdr: string): Promise<Deposit> => {
  const { data } = await apiClient.post(`/deposits/${depositId}/signed-xdr`, { signedXdr });
  return data;
};

export const getDeposit = async (id: string): Promise<Deposit> => {
  const { data } = await apiClient.get(`/deposits/${id}`);
  return data;
};

export const listDeposits = async (userId: string): Promise<Deposit[]> => {
  const { data } = await apiClient.get('/deposits', { params: { userId } });
  return data;
};
