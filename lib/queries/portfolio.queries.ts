import { useQuery } from '@tanstack/react-query';
import { getPortfolioSummary } from '@/lib/api/portfolio';

export const portfolioKeys = {
  summary: ['portfolio', 'summary'] as const,
};

export function usePortfolioSummary(enabled = true) {
  return useQuery({
    queryKey: portfolioKeys.summary,
    queryFn: getPortfolioSummary,
    enabled,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}
