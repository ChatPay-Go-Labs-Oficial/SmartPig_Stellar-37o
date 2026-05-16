import { apiClient } from './client';

export interface CreateOrganizationDto {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface OrganizationResponse {
  id: string;
  userId: string;
  etherfuseOrgId: string;
  kycStatus: string;
  createdAt: string;
  updatedAt: string;
  bankAccounts?: BankAccount[];
}

export interface PresignedUrlResponse {
  presignedUrl: string;
  bankAccountId: string;
}

// ─── Quote ────────────────────────────────────────────────────────────────────

export interface GetQuoteDto {
  userId: string;
  direction: 'onramp' | 'offramp';
  sourceAsset: string;
  targetAsset: string;
  sourceAmount: string;
  walletAddress?: string;
}

export interface QuoteResponse {
  quoteId: string;
  blockchain: string;
  sourceAmount: string;
  destinationAmount: string;
  exchangeRate: string;
  expiresAt: string;
  feeBps?: string | null;
  feeAmount?: string | null;
  destinationAmountAfterFee?: string | null;
}

// ─── Onramp ───────────────────────────────────────────────────────────────────

export interface CreateOnrampDto {
  userId: string;
  bankAccountId: string;
  quoteId: string;
  walletAddress: string;
  sourceAsset: string;
  targetAsset: string;
  sourceAmount: string;
  destinationAmount: string;
}

export interface OnrampOrder {
  id: string;
  etherfuseOrderId?: string | null;
  status: string;
  sourceAmount: string;
  destinationAmount: string;
  sourceAsset: string;
  targetAsset: string;
  walletAddress: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Bank Accounts ────────────────────────────────────────────────────────────

export interface BankAccount {
  id: string;
  etherfuseBankId: string;
  clabe?: string | null;
  pixKey?: string | null;
  pixKeyType?: string | null;
  rail: string;
  isCompliant: boolean;
  createdAt: string;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const EtherfuseApi = {
  createOrganization: (data: CreateOrganizationDto): Promise<OrganizationResponse> =>
    apiClient
      .post<OrganizationResponse>('/etherfuse/onboarding/organization', data)
      .then((r) => r.data),

  getOrganization: (): Promise<OrganizationResponse> =>
    apiClient
      .get<OrganizationResponse>('/etherfuse/onboarding/organization')
      .then((r) => r.data),

  getPresignedUrl: (userId: string, pubkey: string): Promise<PresignedUrlResponse> =>
    apiClient
      .post<PresignedUrlResponse>('/etherfuse/onboarding/presigned-url', { userId, pubkey })
      .then((r) => r.data),

  syncBankAccounts: (userId: string): Promise<void> =>
    apiClient
      .post('/etherfuse/onboarding/bank-accounts/sync', { userId })
      .then(() => undefined),

  // Accepts all 3 Etherfuse agreements that are required before creating orders.
  // Must be called with the presignedUrl returned by getPresignedUrl.
  acceptAgreements: async (userId: string, presignedUrl: string): Promise<void> => {
    await apiClient.post('/etherfuse/onboarding/agreements/esign', { userId, presignedUrl });
    await apiClient.post('/etherfuse/onboarding/agreements/terms', { userId, presignedUrl });
    await apiClient.post('/etherfuse/onboarding/agreements/customer', { userId, presignedUrl });
  },

  listBankAccounts: (): Promise<BankAccount[]> =>
    apiClient
      .get<BankAccount[]>('/etherfuse/onboarding/bank-accounts')
      .then((r) => r.data),

  getQuote: (data: GetQuoteDto): Promise<QuoteResponse> =>
    apiClient
      .post<QuoteResponse>('/etherfuse/quote', data)
      .then((r) => r.data),

  createOnramp: (data: CreateOnrampDto): Promise<OnrampOrder> =>
    apiClient
      .post<OnrampOrder>('/etherfuse/onramp', data)
      .then((r) => r.data),

  getOrder: (id: string, userId: string): Promise<OnrampOrder> =>
    apiClient
      .get<OnrampOrder>(`/etherfuse/orders/${id}`, { params: { userId } })
      .then((r) => r.data),

  sandboxSimulatePayment: (orderId: string, userId: string): Promise<{ simulated: boolean }> =>
    apiClient
      .post<{ simulated: boolean }>(`/etherfuse/sandbox/onramp/${orderId}/simulate-payment`, { userId })
      .then((r) => r.data),
};
