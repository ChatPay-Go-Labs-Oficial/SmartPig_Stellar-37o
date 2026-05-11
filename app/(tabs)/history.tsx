import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable } from 'react-native';
import { ScreenContainer } from '@/components/layout';
import { Card, Badge, GradientText } from '@/components/ui';
import { Colors, Font, FontSize, Spacing, Accent } from '@/constants/theme';
import { useDeposits } from '@/lib/queries/deposits.queries';
import { useWithdrawals } from '@/lib/queries/withdrawals.queries';

type TxType = 'deposit' | 'withdrawal';

interface TxItem {
  id: string;
  type: TxType;
  vaultId: string;
  amount: string;
  status: string;
  createdAt: string;
}

function statusVariant(status: string): 'sucesso' | 'conquista' | 'erro' | 'muted' {
  if (status === 'CONFIRMED') return 'sucesso';
  if (status === 'PENDING') return 'conquista';
  if (status === 'FAILED') return 'erro';
  return 'muted';
}

function statusLabel(status: string): string {
  if (status === 'CONFIRMED') return 'Confirmado';
  if (status === 'PENDING') return 'Pendente';
  if (status === 'FAILED') return 'Falhou';
  return status;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function TxRow({ item }: { item: TxItem }) {
  const isDeposit = item.type === 'deposit';
  return (
    <View style={styles.txRow}>
      <View style={[styles.txIcon, { backgroundColor: isDeposit ? 'rgba(25,213,96,0.15)' : 'rgba(244,52,180,0.15)' }]}>
        <Text style={[styles.txIconText, { color: isDeposit ? Accent.success : Accent.primary }]}>
          {isDeposit ? '↓' : '↑'}
        </Text>
      </View>
      <View style={styles.txInfo}>
        <Text style={styles.txType}>{isDeposit ? 'Depósito' : 'Saque'}</Text>
        <Text style={styles.txDate}>{formatDate(item.createdAt)}</Text>
      </View>
      <View style={styles.txRight}>
        <Text style={[styles.txAmount, { color: isDeposit ? Accent.success : Colors.foreground }]}>
          {isDeposit ? '+' : '-'}{parseFloat(item.amount).toFixed(4)}
        </Text>
        <Badge label={statusLabel(item.status)} variant={statusVariant(item.status)} />
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
      vaultId: d.vaultId,
      amount: String(d.amount),
      status: d.status,
      createdAt: d.createdAt,
    })),
    ...(withdrawals ?? []).map((w) => ({
      id: w.id,
      type: 'withdrawal' as TxType,
      vaultId: w.vaultId,
      amount: String(w.shares),
      status: w.status,
      createdAt: w.createdAt,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <ScreenContainer scrollable={false} contentStyle={{ padding: 0 }}>
      <View style={styles.header}>
        <GradientText style={styles.title}>Histórico</GradientText>
        <Text style={styles.subtitle}>Depósitos e saques</Text>
      </View>

      {isLoading && (
        <View style={styles.centered}>
          <ActivityIndicator color={Accent.primary} size="large" />
        </View>
      )}

      {!isLoading && txList.length === 0 && (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Nenhuma transação ainda.</Text>
        </View>
      )}

      {!isLoading && txList.length > 0 && (
        <FlatList
          data={txList}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          renderItem={({ item }) => <TxRow item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing[6],
    paddingTop: Spacing[6],
    paddingBottom: Spacing[4],
  },
  title: { fontSize: FontSize.displaySm, fontFamily: Font.extraBold },
  subtitle: {
    fontSize: FontSize.body,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
    marginTop: Spacing[1],
  },
  list: {
    paddingHorizontal: Spacing[6],
    paddingBottom: Spacing[8],
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing[3],
    gap: Spacing[3],
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txIconText: {
    fontSize: 20,
    fontFamily: Font.extraBold,
  },
  txInfo: { flex: 1, gap: 2 },
  txType: {
    fontSize: FontSize.body,
    fontFamily: Font.bold,
    color: Colors.foreground,
  },
  txDate: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
  },
  txRight: { alignItems: 'flex-end', gap: 4 },
  txAmount: {
    fontSize: FontSize.body,
    fontFamily: Font.extraBold,
  },
  separator: { height: 1, backgroundColor: Colors.border },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: {
    fontSize: FontSize.body,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
  },
});
