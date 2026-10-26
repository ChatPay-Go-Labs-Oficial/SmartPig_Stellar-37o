import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { hasApiErrorCode, retryUnlessClientError } from '@/lib/api/errors';
import { claimDailyReward, getExperienceProfile } from '@/lib/api/experience';
import { useAuthStore } from '@/lib/stores/auth.store';

export const experienceKeys = {
  all: ['experience'] as const,
  profile: (userId: string) => ['experience', 'profile', userId] as const,
};

/** Nível, régua e recompensa do dia da conta da sessão. */
export function useExperienceProfile() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userId = useAuthStore((s) => s.contractId);
  return useQuery({
    queryKey: experienceKeys.profile(userId ?? ''),
    queryFn: getExperienceProfile,
    enabled: isAuthenticated && !!userId,
    retry: retryUnlessClientError,
  });
}

/**
 * Pega a recompensa do dia. Já pega no dia (409 DAILY_REWARD_ALREADY_CLAIMED:
 * outro aparelho ou toque repetido) não é erro para a pessoa: o perfil é
 * relido e mostra a recompensa recebida.
 *
 * Nos dois casos a mutação só termina depois da releitura: o botão segue
 * carregando até o perfil novo chegar, sem voltar ao "+3 XP" por um instante.
 */
export function useClaimDailyReward() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.contractId) ?? '';
  return useMutation({
    mutationKey: ['experience', 'daily-reward'],
    mutationFn: claimDailyReward,
    onSuccess: () => qc.invalidateQueries({ queryKey: experienceKeys.profile(userId) }),
    onError: (error) =>
      hasApiErrorCode(error, 'DAILY_REWARD_ALREADY_CLAIMED')
        ? qc.invalidateQueries({ queryKey: experienceKeys.profile(userId) })
        : undefined,
  });
}
