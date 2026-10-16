import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { signXdr } from '@/lib/stellar/kit';
import * as rampApi from '@/lib/api/blindpay-ramp';
import type {
  CreateOfframpRequest,
  OfframpQuoteRequest,
  OnrampQuoteRequest,
} from '@/lib/api/blindpay-ramp';

export const blindpayRampKeys = {
  history: (userId: string) => ['blindpay-ramp-history', userId] as const,
  onrampOrder: (id: string) => ['blindpay-onramp-order', id] as const,
  offrampOrder: (id: string) => ['blindpay-offramp-order', id] as const,
};

const TERMINAL_STATUSES = new Set(['COMPLETED', 'FAILED', 'REFUNDED']);

export function useRampTransactions(userId: string | null) {
  return useQuery({
    queryKey: blindpayRampKeys.history(userId ?? ''),
    queryFn: rampApi.listRampTransactions,
    enabled: !!userId,
    staleTime: 30_000,
    refetchInterval: (query) =>
      query.state.data?.some((transaction) => !TERMINAL_STATUSES.has(transaction.status))
        ? 5_000
        : false,
  });
}

// ─── On-ramp ────────────────────────────────────────────────────────────────

export function useOnrampQuote() {
  return useMutation({
    mutationFn: (dto: OnrampQuoteRequest) => rampApi.getOnrampQuote(dto),
  });
}

export function useCreateOnramp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: OnrampQuoteRequest) => rampApi.createOnramp(dto),
    onSuccess: (_, dto) => {
      queryClient.invalidateQueries({ queryKey: blindpayRampKeys.history(dto.userId) });
    },
  });
}

export function useOnrampOrder(id: string | null, userId: string | null) {
  return useQuery({
    queryKey: blindpayRampKeys.onrampOrder(id ?? ''),
    queryFn: () => rampApi.getOnramp(id!, userId!),
    enabled: !!id && !!userId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && TERMINAL_STATUSES.has(status) ? false : 4000;
    },
  });
}

// ─── Off-ramp ───────────────────────────────────────────────────────────────

export function useOfframpQuote() {
  return useMutation({
    mutationFn: (dto: OfframpQuoteRequest) => rampApi.getOfframpQuote(dto),
  });
}

export function useCreateOfframp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateOfframpRequest) => rampApi.createOfframp(dto),
    onSuccess: (_, dto) => {
      queryClient.invalidateQueries({ queryKey: blindpayRampKeys.history(dto.userId) });
    },
  });
}

export function useRefreshOfframpDelegation() {
  return useMutation({
    mutationFn: ({ id, userId }: { id: string; userId: string }) =>
      rampApi.refreshOfframpDelegation(id, userId),
  });
}

export function useSubmitOfframp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      dto,
    }: {
      id: string;
      dto: { userId: string; signedDelegationHash: string };
    }) => rampApi.submitOfframp(id, dto),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: blindpayRampKeys.history(variables.dto.userId),
      });
    },
  });
}

export function useOfframpOrder(id: string | null, userId: string | null) {
  return useQuery({
    queryKey: blindpayRampKeys.offrampOrder(id ?? ''),
    queryFn: () => rampApi.getOfframp(id!, userId!),
    enabled: !!id && !!userId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && TERMINAL_STATUSES.has(status) ? false : 4000;
    },
  });
}

/** Assina qualquer XDR retornado pelo backend (delegação de saque ou trustline). */
export async function signBlindPayXdr(unsignedXdr: string): Promise<string> {
  return signXdr(unsignedXdr);
}
