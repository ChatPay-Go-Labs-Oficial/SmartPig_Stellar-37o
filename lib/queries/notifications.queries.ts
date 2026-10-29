import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { retryUnlessClientError } from '@/lib/api/errors';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences,
} from '@/lib/api/notifications';
import { useAuthStore } from '@/lib/stores/auth.store';

export const notificationKeys = {
  all: ['notifications'] as const,
  preferences: (userId: string) => ['notifications', 'preferences', userId] as const,
};

/** Preferências de notificação da conta da sessão (Perfil > Preferências). */
export function useNotificationPreferences() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userId = useAuthStore((s) => s.contractId);
  return useQuery({
    queryKey: notificationKeys.preferences(userId ?? ''),
    queryFn: getNotificationPreferences,
    enabled: isAuthenticated && !!userId,
    retry: retryUnlessClientError,
  });
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
