import { useQuery } from '@tanstack/react-query';
import { getPortfolioSummary, type PortfolioSummary } from '@/lib/api/portfolio';
import { useAuthStore } from '@/lib/stores/auth.store';

export const portfolioKeys = {
  all: ['portfolio', 'summary'] as const,
  summary: (owner: string) => ['portfolio', 'summary', owner] as const,
};

// Uma resposta parcial é útil para diagnóstico, mas não deve substituir na
// interface uma fotografia completa que já vimos. O cache é compartilhado por
// todas as telas e isolado por usuário; assim, remontar uma aba não perde o
// último saldo confiável.
const reliableSummaries = new Map<string, PortfolioSummary>();

async function getReliablePortfolioSummary(owner: string): Promise<PortfolioSummary> {
  const summary = await getPortfolioSummary();
  if (summary.totalUsd !== null) {
    reliableSummaries.set(owner, summary);
    return summary;
  }
  return reliableSummaries.get(owner) ?? summary;
}

export function usePortfolioSummary(enabled = true) {
  const contractId = useAuthStore((state) => state.contractId);
  const walletAddress = useAuthStore((state) => state.walletAddress);
  const owner = contractId ?? walletAddress ?? '';

  return useQuery({
    queryKey: portfolioKeys.summary(owner),
    queryFn: () => getReliablePortfolioSummary(owner),
    enabled: enabled && !!owner,
    staleTime: 30_000,
  });
}
