import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createDeposit,
  submitSignedDeposit,
  getDeposit,
  listDeposits,
  type CreateDepositParams,
} from '@/lib/api/deposits';
import { useAuthStore } from '@/lib/stores/auth.store';

export const depositKeys = {
  all: (userId: string) => ['deposits', userId] as const,
  detail: (id: string) => ['deposits', 'detail', id] as const,
};

export const useDeposits = () => {
  const userId = useAuthStore((s) => s.userId);
  return useQuery({
    queryKey: depositKeys.all(userId ?? ''),
    queryFn: () => listDeposits(userId!),
    enabled: !!userId,
  });
};

export const useDeposit = (id: string) =>
  useQuery({
    queryKey: depositKeys.detail(id),
    queryFn: () => getDeposit(id),
    enabled: !!id,
    refetchInterval: (query) =>
      query.state.data?.status === 'XDR_GENERATED' ? 5_000 : false,
  });

export const useCreateDeposit = () => {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.userId);
  return useMutation({
    mutationFn: (params: CreateDepositParams) => createDeposit(params),
    onSuccess: () => qc.invalidateQueries({ queryKey: depositKeys.all(userId ?? '') }),
  });
};

export const useSubmitDeposit = () =>
  useMutation({
    mutationFn: ({ depositId, signedXdr }: { depositId: string; signedXdr: string }) =>
      submitSignedDeposit(depositId, signedXdr),
  });
