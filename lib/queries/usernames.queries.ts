import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { hasApiErrorCode, retryUnlessClientError } from '@/lib/api/errors';
import {
  checkUsernameAvailability,
  createUsername,
  isValidUsername,
  resolveUsername,
} from '@/lib/api/usernames';
import { userKeys } from '@/lib/queries/users.queries';
import { useAuthStore } from '@/lib/stores/auth.store';

export const usernameKeys = {
  availability: (username: string) => ['usernames', 'availability', username] as const,
  resolve: (username: string) => ['usernames', 'resolve', username] as const,
};

/**
 * Disponibilidade de um nome já normalizado (normalizeUsername). Formato
 * inválido não vai ao backend. Sem cache: outra pessoa pode criar o mesmo
 * nome a qualquer momento.
 */
export function useUsernameAvailability(username: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: usernameKeys.availability(username),
    queryFn: ({ signal }) => checkUsernameAvailability(username, signal),
    enabled: isAuthenticated && isValidUsername(username),
    staleTime: 0,
    retry: retryUnlessClientError,
  });
}

/**
 * Resolve o @ para a transferência. Sem cache: o destino precisa estar
 * atual, e o envio ainda confere a conta na rede antes de assinar.
 */
export function useResolveUsername(username: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: usernameKeys.resolve(username),
    queryFn: () => resolveUsername(username),
    enabled: isAuthenticated && isValidUsername(username),
    staleTime: 0,
    retry: retryUnlessClientError,
  });
}

/**
 * Cria o @ da pessoa, que é permanente. Já criado em outro aparelho
 * (409 USERNAME_ALREADY_SET): o perfil é relido e mostra o @ que existe.
 */
export function useCreateUsername() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.contractId) ?? '';
  return useMutation({
    mutationKey: ['usernames', 'create'],
    mutationFn: (username: string) => createUsername(username),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.me(userId) }),
    onError: (error) => {
      if (hasApiErrorCode(error, 'USERNAME_ALREADY_SET')) {
        qc.invalidateQueries({ queryKey: userKeys.me(userId) });
      }
    },
  });
}
