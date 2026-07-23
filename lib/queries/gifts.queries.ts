import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import {
  claimGift,
  createGift,
  getGiftEligibility,
  getGiftPreview,
  listGifts,
} from '@/lib/api/gifts';
import { useAuthStore } from '@/lib/stores/auth.store';

export const giftKeys = {
  all: (userId: string) => ['gifts', userId] as const,
  preview: (code: string) => ['gifts', 'preview', code] as const,
  eligibility: (userId: string) => ['gifts', 'eligibility', userId] as const,
};

export const useGiftEligibility = () => {
  const contractId = useAuthStore((s) => s.contractId);
  return useQuery({
    queryKey: giftKeys.eligibility(contractId ?? ''),
    queryFn: () => getGiftEligibility(contractId!),
    enabled: !!contractId,
    staleTime: 5 * 60_000,
  });
};

export const useGifts = () => {
  const contractId = useAuthStore((s) => s.contractId);
  return useQuery({
    queryKey: giftKeys.all(contractId ?? ''),
    queryFn: () => listGifts(contractId!),
    enabled: !!contractId,
    // Poll while a funding or a claim is still being reconciled on-chain
    refetchInterval: (query) =>
      query.state.data?.some((gift) =>
        ['CREATED', 'CLAIMING'].includes(gift.status),
      )
        ? 5_000
        : false,
  });
};

export const useGiftPreview = (code: string) =>
  useQuery({
    queryKey: giftKeys.preview(code),
    queryFn: () => getGiftPreview(code),
    enabled: !!code,
    // Poll while the funding is being reconciled so the claim button
    // enables itself as soon as the gift turns FUNDED
    refetchInterval: (query) =>
      ['CREATED', 'CLAIMING'].includes(query.state.data?.status ?? '')
        ? 5_000
        : false,
  });

export const useCreateGift = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ amount }: { amount: string }) => {
      const { contractId, walletAccountId } = useAuthStore.getState();
      if (!contractId || !walletAccountId) {
        throw new Error('Usuário não autenticado. Faça login novamente.');
      }
      return createGift({
        idempotencyKey: randomUUID(),
        userId: contractId,
        walletAccountId,
        amount,
      });
    },
    onSuccess: () => {
      const { contractId } = useAuthStore.getState();
      qc.invalidateQueries({ queryKey: giftKeys.all(contractId ?? '') });
    },
  });
};

export const useClaimGift = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ code }: { code: string }) => {
      const { contractId, walletAccountId, walletAddress } = useAuthStore.getState();
      if (!contractId || !walletAccountId || !walletAddress) {
        throw new Error('Usuário não autenticado. Faça login novamente.');
      }
      return claimGift({
        code,
        userId: contractId,
        walletAccountId,
        stellarAddress: walletAddress,
      });
    },
    onSuccess: () => {
      const { contractId } = useAuthStore.getState();
      qc.invalidateQueries({ queryKey: giftKeys.all(contractId ?? '') });
    },
  });
};
