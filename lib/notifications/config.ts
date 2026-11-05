import { Platform } from 'react-native';

/**
 * Push só existe no iOS e no Android. Na web o expo-notifications não tem
 * token Expo nem canais, e o app roda pelo react-native-web: toda chamada ao
 * módulo passa por aqui antes.
 */
export const isPushSupported = Platform.OS === 'ios' || Platform.OS === 'android';

/**
 * Canais do Android (Figma, "Notificações push · Especificação"). O backend
 * escolhe o canal de cada envio pelo `id`; o push sem canal cai no
 * `defaultChannel` do app.json ("movimentacoes"). Nome e descrição são o que a
 * pessoa vê nos ajustes do sistema, onde pode silenciar cada um. A importância
 * é o nome em AndroidImportance: este arquivo não importa o módulo nativo.
 */
export const ANDROID_CHANNELS = [
  {
    id: 'movimentacoes',
    name: 'Movimentações',
    description: 'Depósitos, saques, envios, recebimentos e presentes',
    importance: 'HIGH',
  },
  {
    id: 'conta',
    name: 'Conta e segurança',
    description: 'Verificação de identidade e mudanças na conta',
    importance: 'HIGH',
  },
  {
    id: 'chama-trilha',
    name: 'Chama e Trilha',
    description: 'Lembretes da Chama, lições e níveis',
    importance: 'DEFAULT',
  },
  {
    id: 'novidades',
    name: 'Novidades',
    description: 'Lançamentos e dicas do PigFi',
    importance: 'LOW',
  },
] as const;

/** Identificador do botão das notificações: abre a mesma rota do toque. */
export const PUSH_OPEN_ACTION = 'abrir';

/**
 * Botões das notificações (Figma, "v2/Notificação/Android": ações em texto).
 * O backend escolhe a categoria em cada envio (`categoryId`). No Android o
 * botão fica embaixo do texto; no iOS aparece ao tocar e segurar.
 */
export const NOTIFICATION_CATEGORIES = [
  { id: 'ver-carteira', buttonTitle: 'Ver carteira' },
  { id: 'ver-historico', buttonTitle: 'Ver no histórico' },
  { id: 'ver-o-que-houve', buttonTitle: 'Ver o que houve' },
  { id: 'resgatar', buttonTitle: 'Resgatar' },
  { id: 'ver-presentes', buttonTitle: 'Ver presentes' },
  { id: 'depositar', buttonTitle: 'Depositar' },
  { id: 'enviar-de-novo', buttonTitle: 'Enviar de novo' },
  { id: 'abrir-trilha', buttonTitle: 'Abrir a Trilha' },
  { id: 'ver-cores', buttonTitle: 'Ver cores' },
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
