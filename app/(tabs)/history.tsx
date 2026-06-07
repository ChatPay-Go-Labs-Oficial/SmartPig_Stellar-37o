import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors, Accent, Font, FontSize, Gradients, Radius, Spacing } from '@/constants/theme';
import { useDeposits } from '@/lib/queries/deposits.queries';
import { useWithdrawals } from '@/lib/queries/withdrawals.queries';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useUsdcTransfers } from '@/lib/queries/wallets.queries';

type TxType = 'deposit' | 'withdrawal' | 'transfer-sent' | 'transfer-received';

interface TxItem {
  id: string;
  type: TxType;
  amount: number;
  status: string;
  createdAt: string;
  counterparty?: string;
  hash?: string;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusConfig(status: string) {
  const s = (status ?? '').toUpperCase();
  if (s === 'CONFIRMED' || s === 'COMPLETED' || s === 'SUCCESS' || s === 'APPROVED')
    return { icon: 'check-circle' as const, color: Accent.success,      label: 'Concluído' };
  if (s === 'PENDING' || s === 'PROCESSING' || s === 'IN_PROGRESS' || s === 'SUBMITTED' || s === 'XDR_GENERATED')
    return { icon: 'schedule' as const,     color: Accent.accent,        label: 'Pendente'  };
  if (s === 'FAILED' || s === 'ERROR' || s === 'CANCELLED' || s === 'CANCELED' || s === 'REJECTED')
    return { icon: 'cancel' as const,       color: Accent.destructive,   label: 'Falhou'    };
  // desconhecido — mostra o valor bruto para debug
  return   { icon: 'help-outline' as const, color: Colors.mutedForeground, label: status || '?' };
}

function TxRow({ item }: { item: TxItem }) {
  const isIncoming = item.type === 'deposit' || item.type === 'transfer-received';
  const isTransfer = item.type === 'transfer-sent' || item.type === 'transfer-received';
  const amountColor = isIncoming ? Accent.success : Accent.destructive;
  const iconBg = isIncoming ? 'rgba(25,213,96,0.12)' : 'rgba(239,68,68,0.12)';
  const iconColor = amountColor;
  const status = statusConfig(item.status);
  const amountDisplay = isFinite(item.amount) ? item.amount.toFixed(2) : '0.00';
  const title = item.type === 'deposit'
    ? 'Investimento'
    : item.type === 'withdrawal'
      ? 'Saque'
      : item.type === 'transfer-sent'
        ? 'USDC enviado'
        : 'USDC recebido';
  const subtitle = isTransfer && item.counterparty
    ? `${item.counterparty.slice(0, 6)}...${item.counterparty.slice(-6)} · ${formatDate(item.createdAt)}`
    : formatDate(item.createdAt);

  return (
    <View style={styles.txCard}>
      <View style={styles.txRow}>
        {/* Icon */}
        <View style={[styles.txIconWrap, { backgroundColor: iconBg }]}>
          <MaterialIcons
            name={isIncoming ? 'arrow-downward' : 'arrow-upward'}
            size={20}
            color={iconColor}
          />
        </View>

        {/* Info */}
        <View style={styles.txInfo}>
          <Text style={styles.txType}>{title}</Text>
          <Text style={styles.txDate} numberOfLines={1}>{subtitle}</Text>
          {isTransfer && item.hash ? (
            <Text style={styles.txHash} numberOfLines={1}>
              Tx: {item.hash.slice(0, 8)}...{item.hash.slice(-6)}
            </Text>
          ) : null}
        </View>

        {/* Amount + Status */}
        <View style={styles.txRight}>
          <Text style={[styles.txAmount, { color: amountColor }]}>
            {isIncoming ? '+' : '-'}${amountDisplay}
          </Text>
          <View style={styles.txStatusRow}>
            <MaterialIcons name={status.icon} size={11} color={status.color} />
            <Text style={[styles.txStatusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function HistoryScreen() {
  const walletAddress = useAuthStore((s) => s.walletAddress);
  const { data: deposits, isLoading: dLoading } = useDeposits();
  const { data: withdrawals, isLoading: wLoading } = useWithdrawals();
  const { data: transfers } = useUsdcTransfers(walletAddress);

  const isLoading = dLoading || wLoading;

  const txList: TxItem[] = [
    ...(deposits ?? []).map((d) => ({
      id: d.id,
      type: 'deposit' as TxType,
      amount: typeof d.amount === 'number' ? d.amount : parseFloat(String(d.amount ?? 0)),
      status: d.status,
      createdAt: d.createdAt,
    })),
    ...(withdrawals ?? []).map((w) => ({
      id: w.id,
      type: 'withdrawal' as TxType,
      amount: typeof w.shares === 'number' ? w.shares : parseFloat(String(w.shares ?? 0)),
      status: w.status,
      createdAt: w.createdAt,
    })),
    ...(transfers ?? []).map((transfer) => ({
      id: transfer.id,
      type: (transfer.direction === 'sent' ? 'transfer-sent' : 'transfer-received') as TxType,
      amount: transfer.amount,
      status: 'CONFIRMED',
      createdAt: transfer.createdAt,
      counterparty: transfer.counterparty,
      hash: transfer.hash,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <View style={styles.screen}>
      {/* Header */}
      <LinearGradient
        colors={Gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Histórico</Text>
        <Text style={styles.headerSub}>Suas transações recentes</Text>
      </LinearGradient>

      <View style={styles.body}>
        {isLoading && (
          <View style={styles.centered}>
            <ActivityIndicator color={Accent.primary} size="large" />
            <Text style={styles.loadingText}>Carregando transações...</Text>
          </View>
        )}

        {!isLoading && txList.length === 0 && (
          <View style={styles.centered}>
            <View style={styles.emptyIconWrap}>
              <MaterialIcons name="inbox" size={36} color={Colors.mutedForeground} />
            </View>
            <Text style={styles.emptyTitle}>Nenhuma transação ainda</Text>
            <Text style={styles.emptySub}>Faça seu primeiro investimento!</Text>
          </View>
        )}

        {!isLoading && txList.length > 0 && (
          <FlatList
            data={txList}
            keyExtractor={(item) => `${item.type}-${item.id}`}
            renderItem={({ item }) => <TxRow item={item} />}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Header
  header: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 32,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: Spacing[4],
  },
  headerTitle: {
    fontSize: FontSize.displaySm,
    fontFamily: Font.black,
    color: '#fff',
  },
  headerSub: {
    fontSize: FontSize.body,
    fontFamily: Font.semiBold,
    color: 'rgba(255,255,255,0.7)',
    marginTop: Spacing[1],
  },

  // Body
  body: {
    flex: 1,
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[4],
  },
  list: {
    gap: 8,
    paddingBottom: 100,
  },

  // Transaction card
  txCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing[4],
    gap: 12,
  },
  txIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  txInfo: {
    flex: 1,
    gap: 3,
  },
  txType: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.bold,
    color: Colors.foreground,
  },
  txDate: {
    fontSize: FontSize.label,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
  },
  txHash: {
    fontSize: 10,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
  },
  txRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  txAmount: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.black,
  },
  txStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  txStatusText: {
    fontSize: 10,
    fontFamily: Font.bold,
  },

  // Empty / loading states
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: FontSize.body,
    fontFamily: Font.bold,
    color: Colors.foreground,
  },
  emptySub: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
  },
});
