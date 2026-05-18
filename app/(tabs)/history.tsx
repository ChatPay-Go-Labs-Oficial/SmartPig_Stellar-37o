import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Accent, Font, FontSize, Radius, Spacing } from '@/constants/theme';
import { useDeposits } from '@/lib/queries/deposits.queries';
import { useWithdrawals } from '@/lib/queries/withdrawals.queries';

type TxType = 'deposit' | 'withdrawal';

interface TxItem {
  id: string;
  type: TxType;
  amount: string;
  status: string;
  createdAt: string;
}

function iconConfig(type: TxType) {
  if (type === 'deposit') {
    return { icon: '↓', color: Accent.success, bg: 'rgba(25,213,96,0.15)', label: 'Depósito' };
  }
  return { icon: '↑', color: Accent.destructive, bg: 'rgba(239,68,68,0.15)', label: 'Saque' };
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function statusText(status: string): string {
  if (status === 'CONFIRMED') return '✓ Concluído';
  if (status === 'PENDING') return '⏳ Pendente';
  if (status === 'FAILED') return '✗ Falhou';
  return status;
}

function TxRow({ item }: { item: TxItem }) {
  const cfg = iconConfig(item.type);
  return (
    <View style={styles.txCard}>
      <View style={styles.txRow}>
        <View style={[styles.txIcon, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.txIconText, { color: cfg.color }]}>{cfg.icon}</Text>
        </View>
        <View style={styles.txInfo}>
          <Text style={styles.txType}>{cfg.label}</Text>
          <Text style={styles.txDate}>{formatDate(item.createdAt)}</Text>
        </View>
        <View style={styles.txRight}>
          <Text style={[styles.txAmount, { color: item.type === 'withdrawal' ? Accent.destructive : Accent.success }]}>
            {item.type === 'withdrawal' ? '-' : '+'}R$ {parseFloat(item.amount || '0').toFixed(2)}
          </Text>
          <Text style={styles.txStatus}>{statusText(item.status)}</Text>
        </View>
      </View>
    </View>
  );
}

export default function HistoryScreen() {
  const { data: deposits, isLoading: dLoading } = useDeposits();
  const { data: withdrawals, isLoading: wLoading } = useWithdrawals();

  const isLoading = dLoading || wLoading;

  const txList: TxItem[] = [
    ...(deposits ?? []).map((d) => ({
      id: d.id,
      type: 'deposit' as TxType,
      amount: String(d.amount),
      status: d.status,
      createdAt: d.createdAt,
    })),
    ...(withdrawals ?? []).map((w) => ({
      id: w.id,
      type: 'withdrawal' as TxType,
      amount: String(w.shares),
      status: w.status,
      createdAt: w.createdAt,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <View style={styles.screen}>
      {/* Header */}
      <LinearGradient
        colors={['hsla(320, 90%, 58%, 0.2)', 'hsla(270, 80%, 60%, 0.2)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <Text style={styles.headerIcon}>🕐</Text>
          <Text style={styles.headerTitle}>Histórico</Text>
        </View>
        <Text style={styles.headerSub}>Suas transações recentes</Text>
      </LinearGradient>

      {/* Content */}
      <View style={styles.body}>
        {isLoading && (
          <View style={styles.centered}>
            <ActivityIndicator color={Accent.primary} size="large" />
          </View>
        )}

        {!isLoading && txList.length === 0 && (
          <View style={styles.centered}>
            <Text style={styles.emptyTitle}>Nenhuma transação ainda</Text>
            <Text style={styles.emptySub}>Faça seu primeiro depósito!</Text>
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
  header: {
    paddingHorizontal: Spacing[6],
    paddingTop: 56,
    paddingBottom: Spacing[6],
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIcon: {
    fontSize: 24,
  },
  headerTitle: {
    fontSize: FontSize.heading,
    fontFamily: Font.black,
    color: Colors.foreground,
  },
  headerSub: {
    fontSize: FontSize.bodySmall,
    color: Colors.mutedForeground,
    fontFamily: Font.semiBold,
    marginTop: 4,
  },
  body: {
    flex: 1,
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[4],
  },
  list: {
    gap: 10,
    paddingBottom: 100,
  },
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
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txIconText: {
    fontSize: 20,
    fontFamily: Font.black,
  },
  txInfo: {
    flex: 1,
    gap: 2,
  },
  txType: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.bold,
    color: Colors.foreground,
  },
  txDate: {
    fontSize: FontSize.label,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
  },
  txRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  txAmount: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.black,
  },
  txStatus: {
    fontSize: 10,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: {
    fontSize: FontSize.body,
    fontFamily: Font.bold,
    color: Colors.mutedForeground,
  },
  emptySub: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
  },
});
