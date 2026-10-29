import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { QueryClient } from '@tanstack/react-query';
import { ANDROID_CHANNELS, isPushSupported, isTransactionPush, readPushData, type PushData } from './config';

let configured = false;
let channelsReady: Promise<void> = Promise.resolve();

/**
 * Prefixos das consultas que um evento de transação deixa velhas: saldo e
 * ativos da Carteira, transferências na rede, depósitos e saques dos
 * porquinhos, Pix (BlindPay e Etherfuse), presentes, porquinhos e o resumo da
 * Home. Prefixo e não chave completa: o push não sabe a carteira nem a conta.
 */
const TRANSACTION_QUERY_PREFIXES = [
  ['wallet-balance'],
  ['wallet-transfers'],
  ['deposits'],
  ['withdrawals'],
  ['blindpay-ramp-history'],
  ['etherfuse-orders'],
  ['gifts'],
  ['vaults'],
  ['portfolio'],
] as const;

/** KYC aprovado ou recusado muda o status da verificação, não o saldo. */
const KYC_QUERY_PREFIXES = [['blindpay-kyc-status'], ['etherfuse-kyc-status']] as const;

export function invalidateForPush(queryClient: QueryClient, data: PushData): void {
  if (!isTransactionPush(data)) return;
  const prefixes = data.type?.startsWith('KYC_') ? KYC_QUERY_PREFIXES : TRANSACTION_QUERY_PREFIXES;
  for (const queryKey of prefixes) {
    queryClient.invalidateQueries({ queryKey: [...queryKey] });
  }
}

/**
 * Canais do Android, criados no boot. Precisam existir antes de duas coisas:
 * do pedido de permissão (no Android 13+ o diálogo de POST_NOTIFICATIONS só
 * aparece com ao menos um canal criado) e do primeiro push (um push com
 * `channelId` que não existe não aparece). Recriar com os mesmos dados é
 * inofensivo; a importância que a pessoa mudou nos ajustes é preservada.
 */
export function ensureAndroidChannels(): Promise<void> {
  return channelsReady;
}

/**
 * Configura as notificações uma vez por execução, no módulo do layout raiz
 * (antes de qualquer tela): o handler precisa estar no lugar quando o
 * primeiro push chegar com o app aberto.
 */
export function configureNotifications(queryClient: QueryClient): void {
  if (!isPushSupported || configured) return;
  configured = true;

  // App aberto: mostra o banner e toca o som, como com o app em segundo plano.
  // Sem número no ícone: o app não tem central de notificações para zerá-lo.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      // No Android, sem som o banner não desce (ver a doc do handler).
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  // Push de transação com o app aberto: a tela que está à vista (Home,
  // Carteira) já reflete o novo saldo, sem esperar o staleTime.
  Notifications.addNotificationReceivedListener((notification) => {
    invalidateForPush(queryClient, readPushData(notification.request.content.data));
  });

  if (Platform.OS === 'android') {
    channelsReady = Promise.all(
      ANDROID_CHANNELS.map((channel) =>
        Notifications.setNotificationChannelAsync(channel.id, {
          name: channel.name,
          importance: Notifications.AndroidImportance[channel.importance],
        }),
      ),
    )
      .then(() => undefined)
      .catch((error) => {
        console.error('[notifications] canais do Android', error?.message);
      });
  }
}
