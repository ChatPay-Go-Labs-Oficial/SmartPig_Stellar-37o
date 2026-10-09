import { StyleSheet, Text, View } from 'react-native';
import { V2Colors, V2Font } from '@/constants/theme-v2';
import { useAccent, type Accent } from '@/hooks/use-accent';
import { useTerms } from '@/hooks/use-terms';
import { V2Icon, type V2IconName } from '@/components/v2';
import type { TermKey } from '@/lib/copy/terms';
import {
  formatHistoryDate,
  isIncoming,
  type HistoryItem,
  type HistoryKind,
  type HistoryStatus,
} from '@/lib/wallet/history';
import { formatUsdV2, truncateDecimalString } from '@/lib/utils/format';

const TITLE_KEY: Record<HistoryKind, TermKey> = {
  'vault-deposit': 'history.deposit',
  'vault-withdrawal': 'history.withdrawal',
  'transfer-sent': 'history.sent',
  'transfer-received': 'history.received',
  'gift-sent': 'history.gift.sent',
  'gift-received': 'history.gift.received',
};

const ICON: Record<HistoryKind, V2IconName> = {
  'vault-deposit': 'piggy',
  'vault-withdrawal': 'piggy',
  'transfer-sent': 'arrow-up',
  'transfer-received': 'arrow-down',
  'gift-sent': 'gift',
  'gift-received': 'gift',
};

const STATUS_LABEL: Partial<Record<HistoryStatus, string>> = {
  pending: 'Pendente',
  failed: 'Falhou',
  refunded: 'Devolvido',
  expired: 'Expirado',
};

function statusColor(status: HistoryStatus): string {
  if (status === 'pending') return V2Colors.warning;
  if (status === 'failed') return V2Colors.error;
  return V2Colors.textTertiary;
}

function iconColors(kind: HistoryKind, accent: Accent) {
  // Guardar no porquinho é o gesto principal do app: ícone cheio no destaque.
  if (kind === 'vault-deposit') return { bg: accent.base, fg: V2Colors.onPrimary };
  if (kind === 'vault-withdrawal') return { bg: accent.alpha(0.14), fg: accent.base };
  return { bg: V2Colors.chip, fg: V2Colors.text };
}

function amountColor(kind: HistoryKind, accent: Accent): string {
  // Movimento entre carteira e porquinho não é ganho nem perda: fica no destaque.
  if (kind === 'vault-deposit' || kind === 'vault-withdrawal') return accent.light;
  return isIncoming(kind) ? V2Colors.success : V2Colors.error;
}

interface HistoryRowProps {
  item: HistoryItem;
  vaultName?: string;
}

/** Movimentação do Histórico (Figma 25a / 25i). */
export function HistoryRow({ item, vaultName }: HistoryRowProps) {
  const accent = useAccent();
  const { t, isPro } = useTerms();

  const sign = isIncoming(item.kind) ? '+' : '-';
  const amount = isPro
    ? `${sign}${truncateDecimalString(item.amount.toFixed(7), 2)} ${item.assetCode}`
    : `${sign}${formatUsdV2(item.amount)}`;

  const date = formatHistoryDate(item.createdAt);
  const isTransfer = item.kind === 'transfer-sent' || item.kind === 'transfer-received';
  const subtitleParts = [
    vaultName,
    // Endereço e hash só dizem algo a quem reconhece um endereço Stellar.
    isPro && isTransfer && item.counterparty
      ? `${item.counterparty.slice(0, 6)}…${item.counterparty.slice(-6)}`
      : undefined,
    date,
  ].filter(Boolean);
  const statusLabel = STATUS_LABEL[item.status];
  const icon = iconColors(item.kind, accent);

  return (
    <View style={styles.row}>
      <View style={[styles.iconBox, { backgroundColor: icon.bg }]}>
        <V2Icon name={ICON[item.kind]} size={19} color={icon.fg} />
      </View>

      <View style={styles.texts}>
        <View style={styles.line}>
          <Text style={styles.title} numberOfLines={1}>{t(TITLE_KEY[item.kind])}</Text>
          <Text style={[styles.amount, { color: amountColor(item.kind, accent) }]}>{amount}</Text>
        </View>
        <View style={styles.line}>
          <Text style={styles.subtitle} numberOfLines={1}>{subtitleParts.join(' · ')}</Text>
          {statusLabel && (
            <Text style={[styles.status, { color: statusColor(item.status) }]}>{statusLabel}</Text>
          )}
        </View>
        {isPro && isTransfer && item.hash && (
          <Text style={styles.hash} numberOfLines={1}>
            Tx {item.hash.slice(0, 8)}…{item.hash.slice(-6)}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    flex: 1,
    gap: 3,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    flex: 1,
    fontFamily: V2Font.bold,
    fontSize: 14.5,
    letterSpacing: -0.145,
    color: V2Colors.text,
  },
  amount: {
    fontFamily: V2Font.extraBold,
    fontSize: 14.5,
    letterSpacing: -0.145,
  },
  subtitle: {
    flex: 1,
    fontFamily: V2Font.medium,
    fontSize: 12,
    color: V2Colors.textTertiary,
  },
  status: {
    fontFamily: V2Font.bold,
    fontSize: 11.5,
  },
  hash: {
    fontFamily: V2Font.medium,
    fontSize: 11.5,
    color: V2Colors.textTertiary,
  },
});
