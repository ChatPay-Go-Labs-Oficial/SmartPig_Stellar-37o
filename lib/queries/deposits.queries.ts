import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createDeposit,
  submitSignedDeposit,
  getDeposit,
  listDeposits,
} from '@/lib/api/deposits';
import { useAuthStore } from '@/lib/stores/auth.store';

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
    // Poll until confirmed
    refetchInterval: (query) =>
      query.state.data?.status === 'PENDING' ? 5_000 : false,
  });

export const useCreateDeposit = () => {
  const qc = useQueryClient();
  const contractId = useAuthStore((s) => s.contractId);
  return useMutation({
    mutationFn: ({ vaultId, amount }: { vaultId: string; amount: number }) =>
      createDeposit(vaultId, amount),
    onSuccess: () => qc.invalidateQueries({ queryKey: depositKeys.all(contractId ?? '') }),
  });
};

export const useSubmitDeposit = () =>
  useMutation({
    mutationFn: ({ depositId, signedXdr }: { depositId: string; signedXdr: string }) =>
      submitSignedDeposit(depositId, signedXdr),
  });
