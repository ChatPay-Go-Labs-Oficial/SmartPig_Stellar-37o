import * as Notifications from 'expo-notifications';
import type { QueryClient } from '@tanstack/react-query';
import { useNotificationsStore } from '@/lib/stores/notifications.store';
import { readPushData, safeInternalUrl } from './config';
import { invalidateForPush } from './setup';

/**
 * Respostas já tratadas nesta execução. O mesmo toque pode chegar duas vezes:
 * pela resposta que abriu o app (getLastNotificationResponse) e pelo
 * listener, e o NotificationsGate pode remontar. Sem isto, a rota abria de
 * novo por cima dela mesma.
 */
const handled = new Set<string>();

function responseKey(response: Notifications.NotificationResponse): string {
  return `${response.notification.request.identifier}:${response.actionIdentifier}`;
}

/**
 * Trata o toque numa notificação: atualiza as consultas da transação e guarda
 * a rota para quando a sessão estiver pronta. Não navega: com o app fechado
 * ou voltando do segundo plano, a abertura, o cadeado e os gates ainda estão
 * na frente (ver NotificationsGate).
 */
export function handleNotificationResponse(
  response: Notifications.NotificationResponse,
  queryClient: QueryClient,
): void {
  const key = responseKey(response);
  if (handled.has(key)) return;
  handled.add(key);

  // Só o toque na própria notificação; o app não define ações extras.
  if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;

  const data = readPushData(response.notification.request.content.data);
  // Com o app em segundo plano o listener de recebimento não roda: o toque
  // é o primeiro sinal de que o saldo mudou.
  invalidateForPush(queryClient, data);

  const url = safeInternalUrl(data.url);
  if (url) useNotificationsStore.getState().setPendingUrl(url);
}

/**
 * A resposta que abriu o app fechado. Depois de lida, é apagada no lado
 * nativo: uma remontagem, ou a próxima abertura sem toque, não a repete.
 */
export function consumeLaunchResponse(queryClient: QueryClient): void {
  const response = Notifications.getLastNotificationResponse();
  if (!response) return;
  handleNotificationResponse(response, queryClient);
  Notifications.clearLastNotificationResponse();
}
