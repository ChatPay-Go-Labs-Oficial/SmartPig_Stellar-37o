import { apiClient } from './client';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface BlindPayBankAccountRecord {
  id: string;
  receiverId: string;
  blindpayBankAccountId: string;
  type: string;
  pixKey: string | null;
  isDefault: boolean;
  createdAt: string;
}

export interface BlindPayBlockchainWalletRecord {
  id: string;
  receiverId: string;
  blindpayWalletId: string;
  network: string;
  address: string;
  createdAt: string;
}

export interface BlindPayReceiverRecord {
  id: string;
  userId: string;
  blindpayReceiverId: string;
  name: string;
  taxId: string | null;
  createdAt: string;
  updatedAt: string;
  bankAccounts?: BlindPayBankAccountRecord[];
  blockchainWallets?: BlindPayBlockchainWalletRecord[];
}

export interface CreateReceiverRequest {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  taxId?: string;
  country?: string;
  type?: 'individual' | 'business';
  kycType?: 'light' | 'standard' | 'enhanced';
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  stateProvinceRegion?: string;
  postalCode?: string;
  dateOfBirth?: string;
  idDocCountry?: string;
  idDocType?: 'PASSPORT' | 'ID_CARD' | 'DRIVERS';
  selfieFileUrl?: string;
  idDocFrontUrl?: string;
  idDocBackUrl?: string;
  tosId?: string;
}

export interface CreateBankAccountRequest {
  userId: string;
  name: string;
  pixKey?: string;
}

export interface CreateBlockchainWalletRequest {
  userId: string;
  stellarAddress: string;
  name?: string;
}

export interface CreateBlockchainWalletResponse extends BlindPayBlockchainWalletRecord {
  /** Presente quando a conta ainda precisa de uma etapa de preparo antes de receber via PIX. */
  trustlineXdr?: string | null;
}

// ─── API functions ────────────────────────────────────────────────────────

export async function initiateTos(
  userId: string,
  redirectUrl?: string,
): Promise<{ tosUrl: string }> {
  const { data } = await apiClient.post('/ramp/tos', { userId, redirectUrl });
  return data;
}

export async function uploadKycFile(
  fileBlob: Blob,
  fileName: string,
  mimeType: string,
): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('file', fileBlob as any, fileName);
  const { data } = await apiClient.post('/ramp/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function createReceiver(
  dto: CreateReceiverRequest,
): Promise<BlindPayReceiverRecord> {
  const { data } = await apiClient.post('/ramp/receiver', dto);
  return data;
}

/**
 * O backend lê `userId` do corpo da requisição mesmo em GET (`@Body('userId')`,
 * não `@Query('userId')`). A sintaxe `{ data: {...} }` funciona normalmente
 * com o adapter XHR usado pelo axios em React Native — não trocar por
 * `params` achando que é engano, é proposital.
 */
export async function getReceiver(userId: string): Promise<BlindPayReceiverRecord> {
  const { data } = await apiClient.get('/ramp/receiver', { data: { userId } });
  return data;
}

export async function createBankAccount(
  dto: CreateBankAccountRequest,
): Promise<BlindPayBankAccountRecord> {
  const { data } = await apiClient.post('/ramp/receiver/bank-accounts', dto);
  return data;
}

/** Ver nota em `getReceiver` sobre `userId` no corpo do GET. */
export async function listBankAccounts(userId: string): Promise<BlindPayBankAccountRecord[]> {
  const { data } = await apiClient.get('/ramp/receiver/bank-accounts', { data: { userId } });
  return data;
}

export async function createBlockchainWallet(
  dto: CreateBlockchainWalletRequest,
): Promise<CreateBlockchainWalletResponse> {
  const { data } = await apiClient.post('/ramp/receiver/wallets', dto);
  return data;
}
