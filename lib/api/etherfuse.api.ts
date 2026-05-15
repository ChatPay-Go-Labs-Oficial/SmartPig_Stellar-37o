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
}

export interface PresignedUrlResponse {
  presignedUrl: string;
  bankAccountId: string;
}

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
};
