import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/stores/auth.store';
import { signXdr } from '@/lib/stellar/kit';
import * as rampApi from '@/lib/api/etherfuse-ramp';
import type {
  GetQuoteRequest,
  CreateOnrampRequest,
  CreateOfframpRequest,
  SubmitOfframpRequest,
} from '@/lib/api/etherfuse-ramp';

export const rampKeys = {
  quote: (userId: string) => ['etherfuse-quote', userId] as const,
  order: (id: string) => ['etherfuse-order', id] as const,
  orders: (userId: string) => ['etherfuse-orders', userId] as const,
  bankAccounts: (userId: string) => ['etherfuse-bank-accounts', userId] as const,
};

export function useEtherfuseQuote() {
  return useMutation({
    mutationFn: (dto: GetQuoteRequest) => rampApi.getQuote(dto),
  });
}

export function useCreateOnramp() {
  return useMutation({
    mutationFn: (dto: CreateOnrampRequest) => rampApi.createOnramp(dto),
  });
}

export function useCreateOfframp() {
  return useMutation({
    mutationFn: (dto: CreateOfframpRequest) => rampApi.createOfframp(dto),
  });
}

export function useSubmitOfframp() {
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: SubmitOfframpRequest }) =>
      rampApi.submitOfframp(id, dto),
  });
}

export function useRefreshOfframpXdr() {
  return useMutation({
    mutationFn: ({ id, userId }: { id: string; userId: string }) =>
      rampApi.refreshOfframpXdr(id, userId),
  });
}

export function useEtherfuseOrder(id: string | null) {
  const contractId = useAuthStore((s) => s.contractId);
  return useQuery({
    queryKey: rampKeys.order(id ?? ''),
    queryFn: () => rampApi.getOrder(id!, contractId!),
    enabled: !!id && !!contractId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'COMPLETED' || status === 'FAILED' || status === 'REFUNDED') return false;
      return 5000;
    },
  });
}

export function useSandboxSimulatePayment() {
  return useMutation({
    mutationFn: ({ id, userId }: { id: string; userId: string }) =>
      rampApi.sandboxSimulatePayment(id, userId),
  });
}

export function useEtherfuseBankAccounts(userId: string | null) {
  return useQuery({
    queryKey: rampKeys.bankAccounts(userId ?? ''),
    queryFn: () => rampApi.getEtherfuseBankAccounts(userId!),
    enabled: !!userId,
  });
}

export async function signOfframpBurnXdr(unsignedBurnXdr: string): Promise<string> {
  return signXdr(unsignedBurnXdr);
}

export function useEtherfuseAssets(currency: string, wallet?: string | null) {
  return useQuery({
    queryKey: ['etherfuse-assets', currency, wallet],
    queryFn: () => rampApi.getEtherfuseAssets(currency, wallet ?? undefined),
    staleTime: 1000 * 60 * 5,
  });
}

// ─── Trustline ────────────────────────────────────────────────────────────────

export function useBuildTrustlineXdr() {
  return useMutation({
    mutationFn: (stellarAddress: string) => rampApi.buildTrustlineXdr(stellarAddress),
  });
}

export function useSubmitTrustlineXdr() {
  return useMutation({
    mutationFn: ({ signedXdr, stellarAddress }: { signedXdr: string; stellarAddress: string }) =>
      rampApi.submitTrustlineXdr(signedXdr, stellarAddress),
  });
}
