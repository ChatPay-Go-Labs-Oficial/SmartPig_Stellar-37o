import { useMutation, useQuery } from '@tanstack/react-query';
import {
  confirmAccountDeletion,
  getAccountDeletionEligibility,
  requestAccountDeletion,
} from '@/lib/api/account-deletion';

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

/**
 * Opens the deletion request.
 *
 * No retry: a failed attempt must surface to the user rather than silently open a
 * second request behind their back. The idempotency key protects the server, but
 * the decision to try again is the user's.
 */
export const useRequestAccountDeletion = () =>
  useMutation({
    mutationFn: (idempotencyKey: string) =>
      requestAccountDeletion(idempotencyKey),
    retry: false,
  });

/** Executes the deletion. Never retried automatically — this one is irreversible. */
export const useConfirmAccountDeletion = () =>
  useMutation({
    mutationFn: confirmAccountDeletion,
    retry: false,
  });
