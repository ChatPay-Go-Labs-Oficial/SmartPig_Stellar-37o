import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createWithdrawal,
  submitSignedWithdrawal,
  getWithdrawal,
  listWithdrawals,
} from '@/lib/api/withdrawals';
import { useAuthStore } from '@/lib/stores/auth.store';
import { randomUUID } from 'expo-crypto';

// Stellar/Soroban amounts have at most 7 decimal places (see
// STELLAR_AMOUNT_DECIMALS in lib/api/vaults.ts). `shares` here is a float
// derived from dividing/multiplying the displayed dollar amount against the
// vault's dfTokens/underlyingBalance, so it routinely lands on values like
// 12.349999999975 (float noise past 7 decimals) or, for small amounts,
// magnitudes under 1e-6 where JS's default number-to-string switches to
// scientific notation (e.g. "1.2345e-7"). Either form gets rejected by the
// backend's decimal parser. toFixed(7) always yields a plain, bounded
// decimal string, matching what the backend expects.
function toStellarAmountString(value: number): string {
  return value.toFixed(7);
}

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
    refetchInterval: (query) =>
      query.state.data?.some((withdrawal) =>
        ['CREATED', 'XDR_GENERATED', 'SIGNED_XDR_RECEIVED', 'SUBMITTED'].includes(
          withdrawal.status,
        ),
      )
        ? 5_000
        : false,
  });
};

export const useWithdrawal = (id: string) =>
  useQuery({
    queryKey: withdrawalKeys.detail(id),
    queryFn: () => getWithdrawal(id),
    enabled: !!id,
    refetchInterval: (query) =>
      query.state.data && query.state.data.status !== 'CONFIRMED' && query.state.data.status !== 'FAILED'
        ? 5_000
        : false,
  });

export const useCreateWithdrawal = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ vaultId, shares }: { vaultId: string; shares: number }) => {
      const { contractId, walletAccountId } = useAuthStore.getState();
      return createWithdrawal({
        idempotencyKey: randomUUID(),
        userId: contractId!,
        walletAccountId: walletAccountId!,
        vaultId,
        shareAmount: toStellarAmountString(shares),
      });
    },
    onSuccess: () => {
      const { contractId } = useAuthStore.getState();
      qc.invalidateQueries({ queryKey: withdrawalKeys.all(contractId ?? '') });
    },
  });
};

export const useSubmitWithdrawal = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ withdrawalId, signedXdr }: { withdrawalId: string; signedXdr: string }) =>
      submitSignedWithdrawal(withdrawalId, signedXdr),
    onSuccess: () => {
      const { contractId } = useAuthStore.getState();
      qc.invalidateQueries({ queryKey: withdrawalKeys.all(contractId ?? '') });
    },
  });
};
