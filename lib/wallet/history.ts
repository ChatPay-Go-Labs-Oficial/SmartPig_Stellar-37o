import type { Deposit } from '@/lib/api/deposits';
import type { Withdrawal } from '@/lib/api/withdrawals';
import type { GiftListItem } from '@/lib/api/gifts';
import type { UsdcTransferRecord } from '@/lib/stellar/transfers';

/**
 * Histórico da Carteira: junta o que já existe hoje, sem endpoint novo.
 *
 * - Porquinhos (vault): GET /deposits e GET /withdrawals do backend.
 * - Transferências: pagamentos USDC lidos do Horizon + presentes (GET /gifts).
 *
 * Fora por enquanto: Pix (falta listagem no backend — no testnet o ramp ainda
 * movimenta USDB, que nem aparece como USDC) e trocas (o swap não existe).
 */

export type HistoryKind =
  | 'vault-deposit'
  | 'vault-withdrawal'
  | 'transfer-sent'
  | 'transfer-received'
  | 'gift-sent'
  | 'gift-received';

export type HistoryFilter = 'all' | 'vaults' | 'transfers';

export type HistoryStatus = 'done' | 'pending' | 'failed' | 'refunded' | 'expired';

export interface HistoryItem {
  key: string;
  kind: HistoryKind;
  /** Valor sempre positivo; o sinal vem do tipo. */
  amount: number;
  /** Código do ativo, para o modo Pro. */
  assetCode: string;
  status: HistoryStatus;
  createdAt: string;
  vaultId?: string;
  counterparty?: string;
  hash?: string;
}

export interface HistoryGroup {
  /** "OUTUBRO DE 2026" */
  title: string;
  items: HistoryItem[];
}

const FILTER_KINDS: Record<Exclude<HistoryFilter, 'all'>, HistoryKind[]> = {
  vaults: ['vault-deposit', 'vault-withdrawal'],
  transfers: ['transfer-sent', 'transfer-received', 'gift-sent', 'gift-received'],
};

/** Entra na carteira (+) ou sai dela (-). */
export function isIncoming(kind: HistoryKind): boolean {
  return kind === 'vault-withdrawal' || kind === 'transfer-received' || kind === 'gift-received';
}

function vaultStatus(status: Deposit['status']): HistoryStatus {
  if (status === 'CONFIRMED') return 'done';
  if (status === 'FAILED') return 'failed';
  return 'pending';
}

function giftStatus(gift: GiftListItem): HistoryStatus {
  switch (gift.status) {
    case 'CLAIMED':
      return 'done';
    case 'REFUNDED':
      return 'refunded';
    case 'EXPIRED':
      return 'expired';
    case 'FUNDED':
      // Para quem enviou, o dinheiro já saiu; para quem recebe, só existe
      // depois do resgate (e aí o status é CLAIMED).
      return 'done';
    default:
      return 'pending';
  }
}

function toNumber(value: number | string | null | undefined): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? 0));
  return Number.isFinite(n) ? Math.abs(n) : 0;
}

export function buildHistory(sources: {
  deposits?: Deposit[];
  withdrawals?: Withdrawal[];
  transfers?: UsdcTransferRecord[];
  gifts?: GiftListItem[];
}): HistoryItem[] {
  const items: HistoryItem[] = [
    ...(sources.deposits ?? []).map((d) => ({
      key: `vault-deposit-${d.id}`,
      kind: 'vault-deposit' as const,
      amount: toNumber(d.amount),
      assetCode: 'USDC',
      status: vaultStatus(d.status),
      createdAt: d.createdAt,
      vaultId: d.vaultId,
    })),
    // `shares` são cotas do vault, não USDC: com a cota perto de 1 o número
    // bate, mas não é o valor resgatado. Mesmo comportamento do histórico
    // anterior — corrigir pede o valor em USDC vindo do backend.
    ...(sources.withdrawals ?? []).map((w) => ({
      key: `vault-withdrawal-${w.id}`,
      kind: 'vault-withdrawal' as const,
      amount: toNumber(w.shares),
      assetCode: 'USDC',
      status: vaultStatus(w.status),
      createdAt: w.createdAt,
      vaultId: w.vaultId,
    })),
    ...(sources.transfers ?? []).map((t) => ({
      key: `transfer-${t.id}`,
      kind: (t.direction === 'sent' ? 'transfer-sent' : 'transfer-received') as HistoryKind,
      amount: toNumber(t.amount),
      assetCode: 'USDC',
      status: 'done' as const,
      createdAt: t.createdAt,
      counterparty: t.counterparty,
      hash: t.hash,
    })),
    ...(sources.gifts ?? [])
      // Presente criado e nunca financiado não movimentou dinheiro.
      .filter((g) => g.status !== 'CREATED')
      .map((g) => ({
        key: `gift-${g.id}`,
        kind: (g.direction === 'sent' ? 'gift-sent' : 'gift-received') as HistoryKind,
        amount: toNumber(g.amount),
        assetCode: g.assetSymbol || 'USDC',
        status: giftStatus(g),
        createdAt: g.createdAt,
        hash: g.claimTxHash ?? undefined,
      })),
  ];

  return items.sort((a, b) => timeOf(b.createdAt) - timeOf(a.createdAt));
}

function timeOf(iso: string): number {
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
}

export function filterHistory(items: HistoryItem[], filter: HistoryFilter): HistoryItem[] {
  if (filter === 'all') return items;
  const kinds = FILTER_KINDS[filter];
  return items.filter((item) => kinds.includes(item.kind));
}

const MONTHS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

/** Agrupa por mês, na ordem em que os itens chegam (já ordenados). */
export function groupByMonth(items: HistoryItem[]): HistoryGroup[] {
  const groups: HistoryGroup[] = [];
  for (const item of items) {
    const date = new Date(item.createdAt);
    const title = Number.isNaN(date.getTime())
      ? 'SEM DATA'
      : `${MONTHS[date.getMonth()]} de ${date.getFullYear()}`.toUpperCase();
    const last = groups[groups.length - 1];
    if (last?.title === title) last.items.push(item);
    else groups.push({ title, items: [item] });
  }
  return groups;
}

/** "08 out., 10:30" — montado à mão: o Intl do Hermes varia entre versões. */
export function formatHistoryDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = MONTHS[date.getMonth()].slice(0, 3);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day} ${month}., ${hours}:${minutes}`;
}
