import { Platform } from 'react-native';

/**
 * Push só existe no iOS e no Android. Na web o expo-notifications não tem
 * token Expo nem canais, e o app roda pelo react-native-web: toda chamada ao
 * módulo passa por aqui antes.
 */
export const isPushSupported = Platform.OS === 'ios' || Platform.OS === 'android';

/**
 * Canais do Android, os mesmos `channelId` que o backend manda (contrato de
 * push, v1). O nome é o que a pessoa vê nos ajustes do sistema, onde pode
 * silenciar cada um. A importância é o nome em AndroidImportance: este
 * arquivo não importa o módulo nativo.
 */
export const ANDROID_CHANNELS = [
  { id: 'transactions', name: 'Transações', importance: 'HIGH' },
  { id: 'updates', name: 'Atualizações do app', importance: 'DEFAULT' },
  { id: 'marketing', name: 'Novidades', importance: 'DEFAULT' },
] as const;

/** Tipos do enum NotificationType do backend que não são de transação. */
const NON_TRANSACTION_TYPES: ReadonlySet<string> = new Set(['APP_UPDATE_AVAILABLE', 'ANNOUNCEMENT']);

/** Dados que o backend manda em `content.data`. Tudo opcional: vem de fora. */
export interface PushData {
  type?: string;
  url?: string;
  notificationId?: string;
}

export function readPushData(raw: unknown): PushData {
  if (!raw || typeof raw !== 'object') return {};
  const data = raw as Record<string, unknown>;
  return {
    type: typeof data.type === 'string' ? data.type : undefined,
    url: typeof data.url === 'string' ? data.url : undefined,
    notificationId: typeof data.notificationId === 'string' ? data.notificationId : undefined,
  };
}

export function isTransactionPush(data: PushData): boolean {
  return Boolean(data.type) && !NON_TRANSACTION_TYPES.has(data.type!);
}

/**
 * Só rotas internas do expo-router. Nada de URL externa nem `//host` (que o
 * roteador leria como outro domínio), e "/" não leva a lugar nenhum: o toque
 * já abriu o app.
 */
export function safeInternalUrl(url: string | undefined): string | null {
  if (!url || url.length > 200) return null;
  if (!url.startsWith('/') || url.startsWith('//') || url === '/') return null;
  return url;
}
