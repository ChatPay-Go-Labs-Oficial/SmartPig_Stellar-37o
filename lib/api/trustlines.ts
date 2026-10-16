import { apiClient } from './client';

export interface TrustlineSubmitResult {
  required: false;
  assetSymbol: string;
  txHash?: string;
}

export async function submitSignedTrustline(params: {
  walletAccountId: string;
  assetSymbol: string;
  signedXdr: string;
}): Promise<TrustlineSubmitResult> {
  const { walletAccountId, ...body } = params;
  const { data } = await apiClient.post<TrustlineSubmitResult>(
    `/wallets/${walletAccountId}/trustlines/submit`,
    body,
  );
  return data;
}
