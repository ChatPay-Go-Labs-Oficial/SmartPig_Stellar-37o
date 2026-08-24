import { useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/auth.store';
import { attemptActivation } from '@/lib/api/wallets';

// Module-level, not persisted: resets on every cold start / JS reload, so a
// failed attempt gets retried on the next app open, but a successful mount
// doesn't retry mid-session (e.g. tab navigation remounts).
let attemptedThisSession = false;

/**
 * On app open, if the wallet is marked not-activated locally, re-checks with
 * the backend and retries activation once. Mirrors profile.tsx's manual
 * "ativar conta" retry, but runs silently — failures only surface via the
 * existing "Conta não ativada" chip in Profile, no alert.
 */
export function useAutoWalletActivation() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isActivated = useAuthStore((s) => s.isActivated);
  const walletAddress = useAuthStore((s) => s.walletAddress);
  const walletAccountId = useAuthStore((s) => s.walletAccountId);
  const contractId = useAuthStore((s) => s.contractId);
  const setIsActivated = useAuthStore((s) => s.setIsActivated);

  useEffect(() => {
    if (attemptedThisSession) return;
    if (!isAuthenticated || isActivated) return;
    if (!walletAddress || !walletAccountId || !contractId) return;

    attemptedThisSession = true;

    attemptActivation({
      userId: contractId,
      walletAccountId,
      stellarAddress: walletAddress,
    })
      .then((result) => {
        if (result.success) setIsActivated(true);
      })
      .catch(() => {
        // Silent — chip in Profile still reflects the pending state.
      });
  }, [contractId, isActivated, isAuthenticated, setIsActivated, walletAccountId, walletAddress]);
}
