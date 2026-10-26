import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { retryUnlessClientError } from '@/lib/api/errors';
import { getCurrentUser, updateExperienceMode } from '@/lib/api/users';
import { learningKeys } from '@/lib/queries/learning.queries';
import { refreshVaultAccess } from '@/lib/queries/vaults.queries';
import { useAppModeStore } from '@/lib/stores/app-mode.store';
import { useAuthStore } from '@/lib/stores/auth.store';
import { toExperienceMode } from '@/lib/utils/experience-mode';

export const userKeys = {
  all: ['users'] as const,
  me: (userId: string) => ['users', 'me', userId] as const,
};

/** Perfil da conta da sessão: modo Lite/Pro e nome de usuário. */
export function useCurrentUser() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userId = useAuthStore((s) => s.contractId);
  return useQuery({
    queryKey: userKeys.me(userId ?? ''),
    queryFn: getCurrentUser,
    enabled: isAuthenticated && !!userId,
    retry: retryUnlessClientError,
  });
}

/**
 * Grava no backend o modo que o aparelho tem na hora do envio, não o da troca:
 * com toques seguidos (Lite, Pro, Lite), os envios saem em fila (`scope`) e o
 * último leva o valor final.
 *
 * O modo muda o `access` dos vaults e o vocabulário das lições; as duas
 * leituras são refeitas.
 */
export function usePushExperienceMode() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['users', 'me', 'experience-mode'],
    scope: { id: 'experience-mode' },
    mutationFn: () => updateExperienceMode(toExperienceMode(useAppModeStore.getState().mode)),
    retry: retryUnlessClientError,
    onSuccess: (user) => {
      qc.setQueryData(userKeys.me(user.id), user);
      refreshVaultAccess(qc);
      qc.invalidateQueries({ queryKey: learningKeys.all });
    },
  });
}
