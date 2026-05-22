import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createDeposit,
  submitSignedDeposit,
  getDeposit,
  listDeposits,
} from '@/lib/api/deposits';
import { useAuthStore } from '@/lib/stores/auth.store';
import { randomUUID } from 'expo-crypto';

export const depositKeys = {
  all: (userId: string) => ['deposits', userId] as const,
  detail: (id: string) => ['deposits', 'detail', id] as const,
};

export const useDeposits = () => {
  const contractId = useAuthStore((s) => s.contractId);
  return useQuery({
    queryKey: depositKeys.all(contractId ?? ''),
    queryFn: () => listDeposits(contractId!),
    enabled: !!contractId,
  });
};

export const useDeposit = (id: string) =>
  useQuery({
    queryKey: depositKeys.detail(id),
    queryFn: () => getDeposit(id),
    enabled: !!id,
    refetchInterval: (query) =>
      query.state.data?.status === 'PENDING' ? 5_000 : false,
  });

export const useCreateDeposit = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ vaultId, amount, assetSymbol }: { vaultId: string; amount: number; assetSymbol: string }) => {
      const { contractId, walletAccountId } = useAuthStore.getState();
      if (!contractId || !walletAccountId) {
        throw new Error('Usuário não autenticado. Faça login novamente.');
      }
      return createDeposit({
        idempotencyKey: randomUUID(),
        userId: contractId,
        walletAccountId,
        vaultId,
        amount: String(amount),
        assetSymbol,
      });
    },
    onSuccess: () => {
      const { contractId } = useAuthStore.getState();
      qc.invalidateQueries({ queryKey: depositKeys.all(contractId ?? '') });
    },
  });
};

export const useSubmitDeposit = () =>
  useMutation({
    mutationFn: ({ depositId, signedXdr }: { depositId: string; signedXdr: string }) =>
      submitSignedDeposit(depositId, signedXdr),
  });
