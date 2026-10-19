import { apiClient } from './client';

export interface Withdrawal {
  id: string;
  vaultId: string;
  /** Quantidade de cotas do vault, em unidades inteiras. */
  shareAmount: string;
  /** Valor do ativo solicitado pelo usuário; ausente em saques antigos. */
  requestedAmount?: string | null;
  /** Compatibilidade defensiva com respostas antigas que usavam outro nome. */
  shares?: number | string;
  status:
    | 'CREATED'
    | 'XDR_GENERATED'
    | 'SIGNED_XDR_RECEIVED'
    | 'SUBMITTED'
    | 'CONFIRMED'
    | 'FAILED';
  unsignedXdr?: string;
  createdAt: string;
}

export interface CreateWithdrawalParams {
  idempotencyKey: string;
  userId: string;
  walletAccountId: string;
  vaultId: string;
  shareAmount: string;
  requestedAmount: string;
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
