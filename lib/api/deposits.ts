import { apiClient } from './client';

export type DepositStatus = 'CREATED' | 'XDR_READY' | 'SUBMITTED' | 'CONFIRMED' | 'FAILED' | 'EXPIRED';

export interface DepositIntent {
  id: string;
  idempotencyKey: string;
  userId: string;
  walletAccountId: string;
  vaultId: string;
  amount: string;
  assetSymbol: string;
  status: DepositStatus;
  unsignedXdr?: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDepositParams {
  idempotencyKey: string;
  userId: string;
  walletAccountId: string;
  vaultId: string;
  amount: string;
  assetSymbol: string;
}

export interface SubmitDepositResult {
  id: string;
  txHash: string;
  status: string;
}

const IS_MOCK = process.env.EXPO_PUBLIC_MOCK_ETHERFUSE === 'true';

function mockCreateDeposit(params: CreateDepositParams): DepositIntent {
  return {
    id: `mock-intent-${Date.now()}`,
    idempotencyKey: params.idempotencyKey,
    userId: params.userId,
    walletAccountId: params.walletAccountId,
    vaultId: params.vaultId,
    amount: params.amount,
    assetSymbol: params.assetSymbol,
    status: 'XDR_READY',
    unsignedXdr: 'AAAAAQAAAAC3G4C5Yf2n6w9oKBg3nMockXDRTransactionBase64EncodedStellarpigfi==',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export const DepositsApi = {
  createDeposit: (params: CreateDepositParams): Promise<DepositIntent> => {
    if (IS_MOCK) return new Promise((res) => setTimeout(() => res(mockCreateDeposit(params)), 800));
    return apiClient.post<DepositIntent>('/deposits', params).then((r) => r.data);
  },

  submitSignedXdr: (id: string, signedXdr: string): Promise<SubmitDepositResult> => {
    if (IS_MOCK) {
      const txHash = `mock_tx_${Math.random().toString(36).substring(2, 18)}`;
      return new Promise((res) => setTimeout(() => res({ id, txHash, status: 'SUBMITTED' }), 1000));
    }
    return apiClient
      .post<SubmitDepositResult>(`/deposits/${id}/signed-xdr`, { signedXdr })
      .then((r) => r.data);
  },

  getDeposit: (id: string): Promise<DepositIntent> =>
    apiClient.get<DepositIntent>(`/deposits/${id}`).then((r) => r.data),

  listDeposits: (userId: string): Promise<DepositIntent[]> =>
    apiClient.get<DepositIntent[]>('/deposits', { params: { userId } }).then((r) => r.data),
};
