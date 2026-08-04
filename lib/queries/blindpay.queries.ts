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
  getKycStatus,
  getReceiver,
  initiateTos,
  listBankAccounts,
  resubmitReceiver,
  uploadKycFile,
} from '@/lib/api/blindpay';

export const blindpayKeys = {
  receiver: (userId: string) => ['blindpay-receiver', userId] as const,
  bankAccounts: (userId: string) => ['blindpay-bank-accounts', userId] as const,
  kycStatus: (userId: string) => ['blindpay-kyc-status', userId] as const,
};

/** Intervalo de poll enquanto o KYC ainda não fechou. */
const KYC_POLL_MS = 10_000;

/**
 * Status do KYC, com poll enquanto está em análise.
 *
 * O webhook `customer.update` é o aviso principal, mas ele chega no backend —
 * o app só descobre olhando. Enquanto o status é terminal (aprovado ou
 * rejeitado) o poll para, porque não há mais o que esperar.
 */
export function useKycStatus(userId: string | null) {
  return useQuery({
    queryKey: blindpayKeys.kycStatus(userId ?? ''),
    queryFn: async () => {
      try {
        return await getKycStatus();
      } catch (err: any) {
        // 404 = ainda não existe receiver. É estado normal de quem não começou
        // o onboarding, não erro — devolver null deixa a UI decidir.
        if (err?.response?.status === 404) return null;
        throw err;
      }
    },
    enabled: !!userId,
    refetchInterval: (query) => {
      const status = query.state.data?.kycStatus;
      if (!status) return false;
      return status === 'APPROVED' || status === 'REJECTED'
        ? false
        : KYC_POLL_MS;
    },
    staleTime: 1000 * 15,
    meta: { skipErrorToast: true },
  });
}

export function useResubmitKyc() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['blindpay-resubmit-kyc'],
    mutationFn: (dto: CreateReceiverRequest) => resubmitReceiver(dto),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: blindpayKeys.kycStatus(variables.userId),
      });
      queryClient.invalidateQueries({
        queryKey: blindpayKeys.receiver(variables.userId),
      });
    },
  });
}

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
