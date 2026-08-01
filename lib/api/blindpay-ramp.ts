import { apiClient } from './client';

export type RampStatus =
  | 'PENDING'
  | 'AWAITING_PAYMENT'
  | 'PROCESSING'
  | 'DELEGATION_NEEDED'
  | 'COMPLETED'
  | 'FAILED'
  | 'REFUNDED';

// ─── Quotes ─────────────────────────────────────────────────────────────────

export interface OnrampQuote {
  id: string;
  receiver_amount: number;
  sender_amount: number;
  commercial_quotation: number;
  blindpay_quotation: number;
  flat_fee: number;
  partner_fee_amount: number;
  billing_fee_amount: number;
  expires_at: number;
}

export interface OfframpQuote extends OnrampQuote {
  contract: { address: string; network: { chainId: number; name: string } } | null;
}

// ─── On-ramp ────────────────────────────────────────────────────────────────

export interface OnrampTransaction {
  id: string;
  userId: string;
  receiverId: string;
  blockchainWalletId: string;
  blindpayPayinId: string | null;
  blindpayQuoteId: string | null;
  amountBrl: string;
  amountUsdc: string | null;
  pixCode: string | null;
  status: RampStatus;
  errorMessage: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OnrampQuoteRequest {
  userId: string;
  blockchainWalletId: string;
  /** Valor em centavos de BRL — R$ 10,00 = 1000 */
  amountBrl: number;
}

export async function getOnrampQuote(dto: OnrampQuoteRequest): Promise<OnrampQuote> {
  const { data } = await apiClient.post('/ramp/onramp/quote', dto);
  return data;
}

export async function createOnramp(dto: OnrampQuoteRequest): Promise<OnrampTransaction> {
  const { data } = await apiClient.post('/ramp/onramp', dto);
  return data;
}

export async function getOnramp(id: string, userId: string): Promise<OnrampTransaction> {
  const { data } = await apiClient.get(`/ramp/onramp/${id}`);
  return data;
}

// ─── Off-ramp ───────────────────────────────────────────────────────────────

export interface OfframpTransaction {
  id: string;
  userId: string;
  receiverId: string;
  bankAccountId: string;
  blindpayPayoutId: string | null;
  blindpayQuoteId: string | null;
  amountUsdc: string;
  amountBrl: string | null;
  senderWalletAddress: string;
  unsignedDelegationXdr: string | null;
  signedDelegationHash: string | null;
  status: RampStatus;
  errorMessage: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OfframpQuoteRequest {
  userId: string;
  bankAccountId: string;
  /** Valor em micro-USDC — 1 USDC = 1_000_000 */
  amountUsdc: number;
  coverFees?: boolean;
}

export interface CreateOfframpRequest extends OfframpQuoteRequest {
  senderWalletAddress: string;
}

export interface CreateOfframpResponse {
  id: string;
  status: RampStatus;
  amountUsdc: number;
  amountBrl: number;
  unsignedDelegationXdr: string;
  /** Presente quando a conta ainda precisa de uma etapa de preparo antes do saque. */
  trustlineXdr?: string;
}

export async function getOfframpQuote(dto: OfframpQuoteRequest): Promise<OfframpQuote> {
  const { data } = await apiClient.post('/ramp/offramp/quote', dto);
  return data;
}

export async function createOfframp(dto: CreateOfframpRequest): Promise<CreateOfframpResponse> {
  const { data } = await apiClient.post('/ramp/offramp', dto);
  return data;
}

export async function refreshOfframpDelegation(
  id: string,
  userId: string,
): Promise<CreateOfframpResponse> {
  const { data } = await apiClient.post(`/ramp/offramp/${id}/delegation`, { userId });
  return data;
}

export async function submitOfframp(
  id: string,
  dto: { userId: string; signedDelegationHash: string },
): Promise<OfframpTransaction> {
  const { data } = await apiClient.post(`/ramp/offramp/${id}/submit`, dto);
  return data;
}

export async function getOfframp(id: string, userId: string): Promise<OfframpTransaction> {
  const { data } = await apiClient.get(`/ramp/offramp/${id}`);
  return data;
}
