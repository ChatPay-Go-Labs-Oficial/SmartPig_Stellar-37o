import { apiClient } from './client';

// Push notifications (Expo Push Service). O backend guarda um aparelho por
// token e decide, pelas preferências, o que manda e com quanto detalhe.

export type PushPlatform = 'ios' | 'android';

export interface RegisterDevicePayload {
  /** "ExponentPushToken[...]". */
  token: string;
  platform: PushPlatform;
  appVersion: string;
}

/** As categorias que a pessoa liga e desliga, mais o detalhe do conteúdo. */
export interface NotificationPreferences {
  /** Depósitos, saques, envios recebidos, presentes e verificação. Padrão ligado. */
  transactions: boolean;
  /** Novas versões do app. Padrão ligado. */
  updates: boolean;
  /** Novidades e promoções. Padrão desligado (opt-in). */
  marketing: boolean;
  /** Valor e @ de quem enviou no texto do push. Padrão desligado. */
  showDetails: boolean;
}

/**
 * Registra (ou reatribui) o aparelho à conta da sessão. Idempotente no
 * backend: o mesmo token só atualiza `lastSeenAt`. Resposta 204.
 */
export const registerDevice = async (payload: RegisterDevicePayload): Promise<void> => {
  await apiClient.post('/notifications/devices', payload);
};

/** Remove o aparelho da conta. Idempotente: token que não é da conta não dá erro. */
export const unregisterDevice = async (token: string): Promise<void> => {
  await apiClient.delete(`/notifications/devices/${encodeURIComponent(token)}`);
};

/** Devolve os padrões se a pessoa nunca salvou. */
export const getNotificationPreferences = async (): Promise<NotificationPreferences> => {
  const { data } = await apiClient.get('/notifications/preferences');
  return data;
};

/** Parcial: só as chaves que mudaram. Devolve o objeto completo. */
export const updateNotificationPreferences = async (
  changes: Partial<NotificationPreferences>,
): Promise<NotificationPreferences> => {
  const { data } = await apiClient.patch('/notifications/preferences', changes);
  return data;
};
