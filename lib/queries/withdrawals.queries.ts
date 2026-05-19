import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createWithdrawal,
  submitSignedWithdrawal,
  getWithdrawal,
  listWithdrawals,
  type CreateWithdrawalParams,
} from '@/lib/api/withdrawals';
import { useAuthStore } from '@/lib/stores/auth.store';

export const withdrawalKeys = {
  all: (userId: string) => ['withdrawals', userId] as const,
  detail: (id: string) => ['withdrawals', 'detail', id] as const,
};

export const useWithdrawals = () => {
  const userId = useAuthStore((s) => s.userId);
  return useQuery({
    queryKey: withdrawalKeys.all(userId ?? ''),
    queryFn: () => listWithdrawals(userId!),
    enabled: !!userId,
  });
};

export const useWithdrawal = (id: string) =>
  useQuery({
    queryKey: withdrawalKeys.detail(id),
    queryFn: () => getWithdrawal(id),
    enabled: !!id,
    refetchInterval: (query) =>
      query.state.data?.status === 'XDR_GENERATED' ? 5_000 : false,
  });

export const useCreateWithdrawal = () => {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.userId);
  return useMutation({
    mutationFn: (params: CreateWithdrawalParams) => createWithdrawal(params),
    onSuccess: () => qc.invalidateQueries({ queryKey: withdrawalKeys.all(userId ?? '') }),
  });
};

export const useSubmitWithdrawal = () =>
  useMutation({
    mutationFn: ({ withdrawalId, signedXdr }: { withdrawalId: string; signedXdr: string }) =>
      submitSignedWithdrawal(withdrawalId, signedXdr),
  });
