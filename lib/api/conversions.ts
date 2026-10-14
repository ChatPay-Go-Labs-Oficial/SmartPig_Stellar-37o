import { apiClient } from './client';

export interface ConversionIntent {
  id: string;
  sourceSymbol: string;
  targetSymbol: string;
  sendAmount: string;
  quotedDestAmount: string;
  destMin: string;
  slippageBps: number;
  status: string;
  unsignedXdr: string;
  expiresAt: string;
}

export interface SubmittedConversion {
  id: string;
  status: 'CONFIRMED';
  txHash: string;
  receivedAmount?: string | null;
}

export interface PendingConversion {
  id: string;
  targetSymbol: string;
  receivedAmount: string | null;
  plannedDeposit: { vaultId?: string; assetSymbol?: string } | null;
}

export async function createConversion(params: {
  idempotencyKey: string;
  walletAccountId: string;
  from: string;
  to: string;
  amount: string;
}): Promise<ConversionIntent> {
  const { data } = await apiClient.post<ConversionIntent>('/conversions', params);
  return data;
}

export async function submitSignedConversion(
  conversionId: string,
  signedXdr: string,
): Promise<SubmittedConversion> {
  const { data } = await apiClient.post<SubmittedConversion>(
    `/conversions/${conversionId}/signed-xdr`,
    { signedXdr },
  );
  return data;
}

export async function listPendingConversions(): Promise<PendingConversion[]> {
  const { data } = await apiClient.get<PendingConversion[]>('/conversions/pending');
  return data;
}
