import { useEffect } from 'react';
import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { retryUnlessClientError } from '@/lib/api/errors';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences,
} from '@/lib/api/notifications';
import { isPushSupported } from '@/lib/notifications/config';
import { useAuthStore } from '@/lib/stores/auth.store';

export const notificationKeys = {
  all: ['notifications'] as const,
  preferences: (userId: string) => ['notifications', 'preferences', userId] as const,
};

/** A mesma busca para a tela e para a busca antecipada: chave, função e regra de nova tentativa. */
function preferencesQueryOptions(userId: string) {
  return queryOptions({
    queryKey: notificationKeys.preferences(userId),
    queryFn: getNotificationPreferences,
    retry: retryUnlessClientError,
  });
}

/** Preferências de notificação da conta da sessão (Perfil > Preferências). */
export function useNotificationPreferences() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userId = useAuthStore((s) => s.contractId);
  return useQuery({
    ...preferencesQueryOptions(userId ?? ''),
    enabled: isAuthenticated && !!userId,
  });
}

/**
 * Busca as preferências antes de a tela Notificações abrir (chamado nas
 * Preferências): sem isso ela entrava com o carregando, e o conteúdo pulava
 * para o lugar no meio da animação de entrada. Onde não há push (web), a
 * tela não existe e a busca não sai.
 */
export function usePrefetchNotificationPreferences() {
  const qc = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userId = useAuthStore((s) => s.contractId);
  useEffect(() => {
    if (!isPushSupported || !isAuthenticated || !userId) return;
    qc.prefetchQuery({ ...preferencesQueryOptions(userId), staleTime: 60_000 });
  }, [isAuthenticated, qc, userId]);
}

/**
 * Troca uma ou mais preferências com atualização otimista: o interruptor muda
 * na hora, e volta se o backend recusar.
 *
 * Os envios saem em fila (`scope`): com toques seguidos no mesmo interruptor,
 * o PATCH de "desligar" não pode chegar depois do de "ligar". A resposta de
 * cada um é o objeto completo, que vira o cache.
 */
export function useUpdateNotificationPreferences() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.contractId) ?? '';
  const key = notificationKeys.preferences(userId);

  return useMutation({
    mutationKey: ['notifications', 'preferences', 'update'],
    scope: { id: 'notification-preferences' },
    mutationFn: (changes: Partial<NotificationPreferences>) => updateNotificationPreferences(changes),
    onMutate: async (changes) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<NotificationPreferences>(key);
      if (previous) qc.setQueryData<NotificationPreferences>(key, { ...previous, ...changes });
      return { previous };
    },
    onError: (_error, _changes, context) => {
      if (context?.previous) qc.setQueryData(key, context.previous);
    },
    onSuccess: (preferences) => {
      qc.setQueryData(key, preferences);
    },
  });
}
