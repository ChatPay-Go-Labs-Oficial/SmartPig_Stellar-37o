import { useQuery } from '@tanstack/react-query';
import { getAccountDeletionEligibility } from '@/lib/api/account-deletion';

export const accountDeletionKeys = {
  eligibility: ['account-deletion', 'eligibility'] as const,
};

/**
 * Eligibility for deleting the account.
 *
 * Never cached: the answer depends on balances and on operations in flight, and a
 * stale "you can delete" is the one wrong answer that costs the user money. It also
 * does not poll — each call reaches Horizon and DeFindex once per vault, so the
 * screen refetches on mount and offers the user a manual re-check instead.
 */
export const useAccountDeletionEligibility = (enabled = true) =>
  useQuery({
    queryKey: accountDeletionKeys.eligibility,
    queryFn: getAccountDeletionEligibility,
    enabled,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    retry: false,
  });
