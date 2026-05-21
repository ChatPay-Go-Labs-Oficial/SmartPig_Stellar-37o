import { apiClient } from './client';

export interface Deposit {
  id: string;
  vaultId: string;
  amount: number;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
  unsignedXdr?: string;
  createdAt: string;
}

export const createDeposit = async (vaultId: string, amount: number): Promise<Deposit> => {
  const { data } = await apiClient.post('/deposits', { vaultId, amount });
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
