import { apiClient } from './client';

// ─── Response types ───────────────────────────────────────────────────────────

export interface EtherfuseCustomer {
  id: string;
  userId: string;
  etherfuseOrgId: string;
  kycStatus: EtherfuseKycStatus;
  createdAt: string;
  updatedAt: string;
  bankAccounts?: EtherfuseBankAccount[];
  orders?: unknown[];
}

export type EtherfuseKycStatus =
  | 'NOT_STARTED'
  | 'PROPOSED'
  | 'APPROVED'
  | 'APPROVED_CHAIN_DEPLOYING'
  | 'REJECTED';

export interface EtherfuseBankAccount {
  id: string;
  customerId: string;
  etherfuseBankId: string;
  clabe: string | null;
  pixKey: string | null;
  pixKeyType: string | null;
  rail: 'spei' | 'pix';
  accountType: string;
  isCompliant: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PresignedUrlResponse {
  presignedUrl: string;
  bankAccountId: string;
}

export interface KycStatusResponse {
  customerId: string;
  walletPublicKey: string;
  status: string;
  onChainMarked: boolean;
  currentRejectionReason: string | null;
  approvedAt: string | null;
  currentKycInfo: Record<string, unknown>;
}

// ─── Request types ────────────────────────────────────────────────────────────

export interface CreateCustomerRequest {
  userId: string;
  displayName?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
}

export interface NameDto {
  givenName: string;
  familyName: string;
}

export interface AddressDto {
  street: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
}

export interface IdNumberDto {
  type: 'CPF' | 'CURP' | 'RFC';
  value: string;
}

export interface SubmitKycRequest {
  userId: string;
  pubkey: string;
  email: string;
  phoneNumber: string;
  name: NameDto;
  address: AddressDto;
  occupation: string;
  dateOfBirth?: string;
  idNumbers?: IdNumberDto[];
}

export interface UploadKycDocumentRequest {
  userId: string;
  pubkey: string;
  documentType: 'selfie' | 'id_front' | 'id_back';
}

export interface GetKycStatusRequest {
  userId: string;
  pubkey: string;
}

export interface GeneratePresignedUrlRequest {
  userId: string;
  pubkey: string;
}

export interface AcceptAgreementRequest {
  userId: string;
  presignedUrl: string;
}

// ─── API Functions ────────────────────────────────────────────────────────────

export async function getEtherfuseCustomer(userId: string): Promise<EtherfuseCustomer> {
  const { data } = await apiClient.get('/etherfuse/onboarding/organization', {
    params: { userId },
  });
  return data;
}

export async function createEtherfuseCustomer(dto: CreateCustomerRequest): Promise<EtherfuseCustomer> {
  const { data } = await apiClient.post('/etherfuse/onboarding/organization', dto);
  return data;
}

export async function submitKyc(dto: SubmitKycRequest): Promise<{ id: string; kycStatus: string; updatedAt: string }> {
  const { data } = await apiClient.post('/etherfuse/onboarding/kyc', dto);
  return data;
}

export async function uploadKycDocument(
  dto: UploadKycDocumentRequest,
  fileBuffer: Blob | Uint8Array,
  fileName: string,
  mimeType: string,
): Promise<{ success: boolean }> {
  const formData = new FormData();
  formData.append('file', fileBuffer as any, fileName);
  formData.append('userId', dto.userId);
  formData.append('pubkey', dto.pubkey);
  formData.append('documentType', dto.documentType);

  const { data } = await apiClient.post('/etherfuse/onboarding/kyc/documents', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function getKycStatus(dto: GetKycStatusRequest): Promise<KycStatusResponse> {
  const { data } = await apiClient.post('/etherfuse/onboarding/kyc/status', dto);
  return data;
}

export async function generatePresignedUrl(
  dto: GeneratePresignedUrlRequest,
): Promise<PresignedUrlResponse> {
  const { data } = await apiClient.post('/etherfuse/onboarding/presigned-url', dto);
  return data;
}

export async function acceptEsign(dto: AcceptAgreementRequest): Promise<{ accepted: boolean }> {
  const { data } = await apiClient.post('/etherfuse/onboarding/agreements/esign', dto);
  return data;
}

export async function acceptTerms(dto: AcceptAgreementRequest): Promise<{ accepted: boolean }> {
  const { data } = await apiClient.post('/etherfuse/onboarding/agreements/terms', dto);
  return data;
}

export async function acceptCustomerAgreement(dto: AcceptAgreementRequest): Promise<{ accepted: boolean }> {
  const { data } = await apiClient.post('/etherfuse/onboarding/agreements/customer', dto);
  return data;
}

export async function listBankAccounts(userId: string): Promise<EtherfuseBankAccount[]> {
  const { data } = await apiClient.get('/etherfuse/onboarding/bank-accounts', {
    params: { userId },
  });
  return data;
}

export async function syncBankAccounts(userId: string): Promise<EtherfuseBankAccount[]> {
  const { data } = await apiClient.post('/etherfuse/onboarding/bank-accounts/sync', { userId });
  return data;
}
