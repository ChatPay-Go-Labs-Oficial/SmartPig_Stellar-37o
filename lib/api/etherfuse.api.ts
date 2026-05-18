import { apiClient } from './client';
import {
  MOCK_BANK_ACCOUNT,
  mockCreateOnramp,
  mockCreateOfframp,
  mockGetQuote,
  mockSimulatePayment,
} from './etherfuse.mock';

const IS_MOCK = process.env.EXPO_PUBLIC_MOCK_ETHERFUSE === 'true';

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

export interface DepositInstructions {
  pixKey: string;
  pixKeyType: 'evp' | 'cpf' | 'cnpj' | 'email' | 'phone';
  amount: number;
  currency: string;
  bankName?: string;
  beneficiaryName?: string;
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
  depositInstructions?: DepositInstructions | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Offramp ──────────────────────────────────────────────────────────────────

export interface CreateOfframpDto {
  userId: string;
  bankAccountId: string;
  quoteId: string;
  walletAddress: string;
  sourceAmount: string;
  destinationAmount: string;
}

export interface OfframpOrder {
  id: string;
  etherfuseOrderId?: string | null;
  status: string;
  sourceAmount: string;
  destinationAmount: string;
  sourceAsset: string;
  targetAsset: string;
  walletAddress: string;
  unsignedBurnXdr?: string;
  pixPayoutKey?: string;
  pixPayoutKeyType?: string;
  pixPayoutAmount?: string;
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

  syncBankAccounts: (userId: string): Promise<void> => {
    if (IS_MOCK) return Promise.resolve();
    return apiClient
      .post('/etherfuse/onboarding/bank-accounts/sync', { userId })
      .then(() => undefined);
  },

  acceptAgreements: async (userId: string, presignedUrl: string): Promise<void> => {
    if (IS_MOCK) return;
    await apiClient.post('/etherfuse/onboarding/agreements/esign', { userId, presignedUrl });
    await apiClient.post('/etherfuse/onboarding/agreements/terms', { userId, presignedUrl });
    await apiClient.post('/etherfuse/onboarding/agreements/customer', { userId, presignedUrl });
  },

  listBankAccounts: (): Promise<BankAccount[]> => {
    if (IS_MOCK) return Promise.resolve([MOCK_BANK_ACCOUNT]);
    return apiClient
      .get<BankAccount[]>('/etherfuse/onboarding/bank-accounts')
      .then((r) => r.data);
  },

  getQuote: (data: GetQuoteDto): Promise<QuoteResponse> => {
    if (IS_MOCK) return Promise.resolve(mockGetQuote(data.sourceAmount, data.direction));
    return apiClient
      .post<QuoteResponse>('/etherfuse/quote', data)
      .then((r) => r.data);
  },

  createOnramp: (data: CreateOnrampDto): Promise<OnrampOrder> => {
    if (IS_MOCK) {
      return Promise.resolve(
        mockCreateOnramp({
          sourceAmount: data.sourceAmount,
          destinationAmount: data.destinationAmount,
          walletAddress: data.walletAddress,
          sourceAsset: data.sourceAsset,
          targetAsset: data.targetAsset,
        }),
      );
    }
    return apiClient
      .post<OnrampOrder>('/etherfuse/onramp', data)
      .then((r) => r.data);
  },

  createOfframp: (data: CreateOfframpDto): Promise<OfframpOrder> => {
    if (IS_MOCK) {
      return new Promise((res) =>
        setTimeout(
          () =>
            res(
              mockCreateOfframp({
                sourceAmount: data.sourceAmount,
                destinationAmount: data.destinationAmount,
                walletAddress: data.walletAddress,
              }),
            ),
          800,
        ),
      );
    }
    return apiClient
      .post<OfframpOrder>('/etherfuse/offramp', data)
      .then((r) => r.data);
  },

  submitOfframpSignedXdr: (
    id: string,
    signedXdr: string,
    userId: string,
  ): Promise<{ submitted: boolean }> => {
    if (IS_MOCK) {
      return new Promise((res) => setTimeout(() => res({ submitted: true }), 800));
    }
    return apiClient
      .post<{ submitted: boolean }>(`/etherfuse/offramp/${id}/signed-xdr`, { signedXdr, userId })
      .then((r) => r.data);
  },

  getOrder: (id: string, userId: string): Promise<OnrampOrder> =>
    apiClient
      .get<OnrampOrder>(`/etherfuse/orders/${id}`, { params: { userId } })
      .then((r) => r.data),

  sandboxSimulatePayment: (orderId: string, userId: string): Promise<{ simulated: boolean }> => {
    if (IS_MOCK) return Promise.resolve(mockSimulatePayment());
    return apiClient
      .post<{ simulated: boolean }>(`/etherfuse/sandbox/onramp/${orderId}/simulate-payment`, { userId })
      .then((r) => r.data);
  },
};
