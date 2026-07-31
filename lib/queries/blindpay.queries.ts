import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateBankAccountRequest,
  CreateBlockchainWalletRequest,
  CreateReceiverRequest,
} from '@/lib/api/blindpay';
import {
  createBankAccount,
  createBlockchainWallet,
  createReceiver,
  getReceiver,
  initiateTos,
  listBankAccounts,
  uploadKycFile,
} from '@/lib/api/blindpay';

export const blindpayKeys = {
  receiver: (userId: string) => ['blindpay-receiver', userId] as const,
  bankAccounts: (userId: string) => ['blindpay-bank-accounts', userId] as const,
};

/** Trata 404 (ainda sem cadastro na BlindPay) como `null`, não como erro. */
export function useBlindPayReceiver(userId: string | null) {
  return useQuery({
    queryKey: blindpayKeys.receiver(userId ?? ''),
    queryFn: async () => {
      try {
        return await getReceiver(userId!);
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

export function useInitiateTos() {
  return useMutation({
    mutationFn: ({ userId, redirectUrl }: { userId: string; redirectUrl?: string }) =>
      initiateTos(userId, redirectUrl),
  });
}

export function useUploadKycFile() {
  return useMutation({
    mutationFn: ({
      fileUri,
      fileName,
      mimeType,
    }: {
      fileUri: string;
      fileName: string;
      mimeType: string;
    }) => uploadKycFile(fileUri, fileName, mimeType),
  });
}

export function useCreateBlindPayReceiver() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateReceiverRequest) => createReceiver(dto),
    onSuccess: (data) => {
      queryClient.setQueryData(blindpayKeys.receiver(data.userId), data);
    },
  });
}

export function useCreateBankAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateBankAccountRequest) => createBankAccount(dto),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: blindpayKeys.receiver(variables.userId) });
      queryClient.invalidateQueries({ queryKey: blindpayKeys.bankAccounts(variables.userId) });
    },
  });
}

export function useCreateBlockchainWallet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateBlockchainWalletRequest) => createBlockchainWallet(dto),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: blindpayKeys.receiver(variables.userId) });
    },
  });
}

export function useBlindPayBankAccounts(userId: string | null) {
  return useQuery({
    queryKey: blindpayKeys.bankAccounts(userId ?? ''),
    queryFn: () => listBankAccounts(userId!),
    enabled: !!userId,
  });
}
