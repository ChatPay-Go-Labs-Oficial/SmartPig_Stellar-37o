import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  CreateCustomerRequest,
  SubmitKycRequest,
  UploadKycDocumentRequest,
  GetKycStatusRequest,
  GeneratePresignedUrlRequest,
  AcceptAgreementRequest,
} from '@/lib/api/etherfuse';
import {
  getEtherfuseCustomer,
  createEtherfuseCustomer,
  submitKyc,
  uploadKycDocument,
  getKycStatus,
  generatePresignedUrl,
  acceptEsign,
  acceptTerms,
  acceptCustomerAgreement,
  listBankAccounts,
  syncBankAccounts,
} from '@/lib/api/etherfuse';
import { useEtherfuseStore } from '@/lib/stores/etherfuse.store';

export const etherfuseKeys = {
  customer: (userId: string) => ['etherfuse-customer', userId] as const,
  bankAccounts: (userId: string) => ['etherfuse-bank-accounts', userId] as const,
  kycStatus: (userId: string) => ['etherfuse-kyc-status', userId] as const,
};

export function useEtherfuseCustomer(userId: string | null) {
  return useQuery({
    queryKey: etherfuseKeys.customer(userId ?? ''),
    queryFn: async () => {
      try {
        return await getEtherfuseCustomer(userId!);
      } catch (err: any) {
        if (err?.response?.status === 404) {
          return null;
        }
        throw err;
      }
    },
    enabled: !!userId,
    retry: 2,
    staleTime: 1000 * 30,
    meta: { skipErrorToast: true },
  });
}

export function useCreateEtherfuseCustomer() {
  const queryClient = useQueryClient();
  const setCustomer = useEtherfuseStore((s) => s.setCustomer);

  return useMutation({
    mutationFn: (dto: CreateCustomerRequest) => createEtherfuseCustomer(dto),
    onSuccess: (data) => {
      setCustomer(data.id, data.etherfuseOrgId);
      queryClient.setQueryData(etherfuseKeys.customer(data.userId), data);
    },
  });
}

export function useSubmitKyc() {
  return useMutation({
    mutationFn: (dto: SubmitKycRequest) => submitKyc(dto),
  });
}

export function useUploadKycDocument() {
  return useMutation({
    mutationFn: ({
      dto,
      fileBuffer,
      fileName,
      mimeType,
    }: {
      dto: UploadKycDocumentRequest;
      fileBuffer: Blob | Uint8Array;
      fileName: string;
      mimeType: string;
    }) => uploadKycDocument(dto, fileBuffer, fileName, mimeType),
  });
}

export function useGetKycStatus() {
  return useMutation({
    mutationFn: (dto: GetKycStatusRequest) => getKycStatus(dto),
  });
}

export function useGeneratePresignedUrl() {
  return useMutation({
    mutationFn: (dto: GeneratePresignedUrlRequest) => generatePresignedUrl(dto),
  });
}

export function useAcceptEsign() {
  return useMutation({
    mutationFn: (dto: AcceptAgreementRequest) => acceptEsign(dto),
  });
}

export function useAcceptTerms() {
  return useMutation({
    mutationFn: (dto: AcceptAgreementRequest) => acceptTerms(dto),
  });
}

export function useAcceptCustomerAgreement() {
  return useMutation({
    mutationFn: (dto: AcceptAgreementRequest) => acceptCustomerAgreement(dto),
  });
}

export function useListBankAccounts(userId: string | null) {
  return useQuery({
    queryKey: etherfuseKeys.bankAccounts(userId ?? ''),
    queryFn: () => listBankAccounts(userId!),
    enabled: !!userId,
  });
}

export function useSyncBankAccounts() {
  return useMutation({
    mutationFn: (userId: string) => syncBankAccounts(userId),
  });
}
