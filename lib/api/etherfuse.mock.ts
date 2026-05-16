import type { BankAccount, QuoteResponse, OnrampOrder } from './etherfuse.api';

function mockUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function mockCUID(): string {
  return 'mock' + Math.random().toString(36).slice(2, 18).padEnd(16, '0');
}

// ─── Bank Accounts ────────────────────────────────────────────────────────────

export const MOCK_BANK_ACCOUNT: BankAccount = {
  id: 'mock-bank-account-local-id',
  etherfuseBankId: mockUUID(),
  pixKey: null,
  pixKeyType: null,
  rail: 'pix',
  isCompliant: true,
  createdAt: new Date().toISOString(),
};

// ─── Quote ────────────────────────────────────────────────────────────────────

export function mockGetQuote(sourceAmount: string): QuoteResponse {
  const src = parseFloat(sourceAmount) || 0;
  const rate = 0.19682;
  const feeBps = 20;
  const destination = src * rate;
  const fee = (destination * feeBps) / 10000;
  const destinationAfterFee = destination - fee;

  return {
    quoteId: mockUUID(),
    blockchain: 'stellar',
    sourceAmount: src.toFixed(2),
    destinationAmount: destination.toFixed(6),
    exchangeRate: rate.toFixed(10),
    expiresAt: new Date(Date.now() + 120_000).toISOString(),
    feeBps: String(feeBps),
    feeAmount: fee.toFixed(6),
    destinationAmountAfterFee: destinationAfterFee.toFixed(6),
  };
}

// ─── Onramp Order ─────────────────────────────────────────────────────────────

export function mockCreateOnramp(params: {
  sourceAmount: string;
  destinationAmount: string;
  walletAddress: string;
  sourceAsset: string;
  targetAsset: string;
}): OnrampOrder {
  const orderId = mockCUID();
  const pixKey = mockUUID();

  return {
    id: orderId,
    etherfuseOrderId: `ef-${mockUUID()}`,
    status: 'processing',
    sourceAmount: params.sourceAmount,
    destinationAmount: params.destinationAmount,
    sourceAsset: params.sourceAsset,
    targetAsset: params.targetAsset,
    walletAddress: params.walletAddress,
    depositInstructions: {
      pixKey,
      pixKeyType: 'evp',
      amount: parseFloat(params.sourceAmount),
      currency: 'BRL',
      bankName: 'PigFi Pagamentos',
      beneficiaryName: 'PigFi Tecnologia',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ─── Simulate Payment ─────────────────────────────────────────────────────────

export function mockSimulatePayment(): { simulated: boolean } {
  return { simulated: true };
}
