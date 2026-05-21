import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createWithdrawal,
  submitSignedWithdrawal,
  getWithdrawal,
  listWithdrawals,
} from '@/lib/api/withdrawals';
import { useAuthStore } from '@/lib/stores/auth.store';

export const withdrawalKeys = {
  all: (userId: string) => ['withdrawals', userId] as const,
  detail: (id: string) => ['withdrawals', 'detail', id] as const,
};

export const useWithdrawals = () => {
  const contractId = useAuthStore((s) => s.contractId);
  return useQuery({
    queryKey: withdrawalKeys.all(contractId ?? ''),
    queryFn: () => listWithdrawals(contractId!),
    enabled: !!contractId,
  });
};

export const useWithdrawal = (id: string) =>
  useQuery({
    queryKey: withdrawalKeys.detail(id),
    queryFn: () => getWithdrawal(id),
    enabled: !!id,
    refetchInterval: (query) =>
      query.state.data?.status === 'PENDING' ? 5_000 : false,
  });

export const useCreateWithdrawal = () => {
  const qc = useQueryClient();
  const contractId = useAuthStore((s) => s.contractId);
  return useMutation({
    mutationFn: ({ vaultId, shares }: { vaultId: string; shares: number }) =>
      createWithdrawal(vaultId, shares),
    onSuccess: () => qc.invalidateQueries({ queryKey: withdrawalKeys.all(contractId ?? '') }),
  });
};

export const useSubmitWithdrawal = () =>
  useMutation({
    mutationFn: ({ withdrawalId, signedXdr }: { withdrawalId: string; signedXdr: string }) =>
      submitSignedWithdrawal(withdrawalId, signedXdr),
  });
