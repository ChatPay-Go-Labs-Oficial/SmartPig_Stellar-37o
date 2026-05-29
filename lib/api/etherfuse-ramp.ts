import { apiClient } from './client';
import type { EtherfuseBankAccount } from './etherfuse';

export interface EtherfuseAsset {
  symbol: string;
  identifier: string;
  name: string;
  currency: string;
  balance: string | null;
  image: string | null;
}

export interface EtherfuseQuote {
  quoteId: string;
  blockchain: string;
  quoteAssets: {
    type: 'onramp' | 'offramp';
    sourceAsset: string;
    targetAsset: string;
  };
  sourceAmount: string;
  destinationAmount: string;
  destinationAmountAfterFee: string | null;
  exchangeRate: string;
  feeBps: string | null;
  feeAmount: string | null;
  partnerFeeBps: number | null;
  partnerFeeAmount: string | null;
  etherfuseMidMarketRate: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export type EtherfuseOrderStatus =
  | 'CREATED'
  | 'PENDING_SIGNATURE'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'REFUNDED';

export interface EtherfuseOrder {
  id: string;
  idempotencyKey: string;
  customerId: string;
  bankAccountId: string;
  etherfuseOrderId: string | null;
  etherfuseQuoteId: string;
  direction: 'ONRAMP' | 'OFFRAMP';
  status: EtherfuseOrderStatus;
  sourceAsset: string;
  targetAsset: string;
  sourceAmount: string;
  destinationAmount: string;
  walletAddress: string;
  unsignedBurnXdr: string | null;
  signedBurnXdr: string | null;
  errorMessage: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOnrampResponse {
  id: string;
  status: EtherfuseOrderStatus;
  sourceAmount: string;
  destinationAmount: string;
  walletAddress: string;
  etherfuseOrderId: string | null;
  depositInstructions?: Record<string, unknown>;
}

export interface CreateOfframpResponse {
  id: string;
  status: EtherfuseOrderStatus;
  sourceAmount: string;
  destinationAmount: string;
  unsignedBurnXdr?: string;
}

export interface SubmitOfframpResponse {
  id: string;
  status: EtherfuseOrderStatus;
  signedBurnXdr: string;
}

export interface GetQuoteRequest {
  userId: string;
  direction: 'onramp' | 'offramp';
  sourceAsset: string;
  targetAsset: string;
  sourceAmount: string;
  walletAddress?: string;
}

export interface CreateOnrampRequest {
  userId: string;
  bankAccountId: string;
  quoteId: string;
  walletAddress: string;
  sourceAsset: string;
  targetAsset: string;
  sourceAmount: string;
  destinationAmount: string;
}

export interface CreateOfframpRequest {
  userId: string;
  bankAccountId: string;
  quoteId: string;
  walletAddress: string;
  sourceAsset: string;
  targetAsset: string;
  sourceAmount: string;
  destinationAmount: string;
}

export interface SubmitOfframpRequest {
  signedBurnXdr: string;
  userId: string;
}

export async function getQuote(dto: GetQuoteRequest): Promise<EtherfuseQuote> {
  const { data } = await apiClient.post('/etherfuse/quote', dto);
  return data;
}

export async function createOnramp(dto: CreateOnrampRequest): Promise<CreateOnrampResponse> {
  const { data } = await apiClient.post('/etherfuse/onramp', dto);
  return data;
}

export async function createOfframp(dto: CreateOfframpRequest): Promise<CreateOfframpResponse> {
  const { data } = await apiClient.post('/etherfuse/offramp', dto);
  return data;
}

export async function submitOfframp(
  id: string,
  dto: SubmitOfframpRequest,
): Promise<SubmitOfframpResponse> {
  const { data } = await apiClient.post(`/etherfuse/offramp/${id}/submit`, dto);
  return data;
}

export async function refreshOfframpXdr(
  id: string,
  userId: string,
): Promise<CreateOfframpResponse> {
  const { data } = await apiClient.post(`/etherfuse/offramp/${id}/refresh-xdr`, { userId });
  return data;
}

export async function getOrder(
  id: string,
  userId: string,
): Promise<EtherfuseOrder> {
  const { data } = await apiClient.get(`/etherfuse/orders/${id}`, {
    params: { userId },
  });
  return data;
}

export async function sandboxSimulatePayment(
  id: string,
  userId: string,
): Promise<{ simulated: boolean; orderId: string; etherfuseOrderId: string }> {
  const { data } = await apiClient.post(
    `/etherfuse/sandbox/onramp/${id}/simulate-payment`,
    { userId },
  );
  return data;
}

export async function getEtherfuseBankAccounts(userId: string): Promise<EtherfuseBankAccount[]> {
  const { data } = await apiClient.get('/etherfuse/onboarding/bank-accounts', {
    params: { userId },
  });
  return data;
}

export async function getEtherfuseAssets(
  currency: string,
  wallet?: string,
): Promise<EtherfuseAsset[]> {
  const params: Record<string, string> = { currency };
  if (wallet) params.wallet = wallet;
  const { data } = await apiClient.get('/etherfuse/assets', { params });
  return data;
}
