import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { V2Colors, V2Font, V2Layout, V2Radius } from '@/constants/theme-v2';
import { useAccent } from '@/hooks/use-accent';
import { useAppMode } from '@/hooks/use-app-mode';
import { useTerms } from '@/hooks/use-terms';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useDeposits } from '@/lib/queries/deposits.queries';
import { useWithdrawals } from '@/lib/queries/withdrawals.queries';
import { useUsdcTransfers } from '@/lib/queries/wallets.queries';
import { useGifts } from '@/lib/queries/gifts.queries';
import { useVaults } from '@/lib/queries/vaults.queries';
import { formatVaultNameForMode } from '@/lib/utils/format';
import {
  buildHistory,
  filterHistory,
  groupByMonth,
  type HistoryFilter,
} from '@/lib/wallet/history';
import { FilterChip, ListCard, ScreenGlow, V2Icon } from '@/components/v2';
import { HistoryRow } from '@/components/wallet/HistoryRow';

// Pix e Trocas (Figma) ficam de fora até existirem: falta listagem de Pix no
// backend e o swap ainda não foi construído.
const EMPTY_FILTER_TEXT: Record<Exclude<HistoryFilter, 'all'>, string> = {
  vaults: 'Você ainda não movimentou seus porquinhos.',
  transfers: 'Você ainda não enviou nem recebeu dinheiro.',
};

export default function WalletHistoryScreen() {
  const insets = useSafeAreaInsets();
  const accent = useAccent();
  const mode = useAppMode();
  const { t } = useTerms();
  const walletAddress = useAuthStore((s) => s.walletAddress);
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const [refreshing, setRefreshing] = useState(false);

  const deposits = useDeposits();
  const withdrawals = useWithdrawals();
  const transfers = useUsdcTransfers(walletAddress);
  const gifts = useGifts();
  const vaults = useVaults();
  const sources = [deposits, withdrawals, transfers, gifts];

  const items = useMemo(
    () =>
      buildHistory({
        deposits: deposits.data,
        withdrawals: withdrawals.data,
        transfers: transfers.data,
        gifts: gifts.data,
      }),
    [deposits.data, withdrawals.data, transfers.data, gifts.data],
  );
  const groups = useMemo(() => groupByMonth(filterHistory(items, filter)), [items, filter]);

  const vaultNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const vault of vaults.data ?? []) map.set(vault.id, formatVaultNameForMode(vault.name, mode));
    return map;
  }, [vaults.data, mode]);

  // Cada fonte carrega no seu tempo; o histórico aparece quando todas
  // responderam (com dado ou erro), para a lista não "pular" de ordem.
  const isLoading = sources.some((q) => q.isLoading);
  const allFailed = sources.every((q) => q.isError);

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.allSettled(sources.map((q) => q.refetch()));
    setRefreshing(false);
  }

  const filters: { id: HistoryFilter; label: string }[] = [
    { id: 'all', label: 'Tudo' },
    { id: 'vaults', label: t('history.filter.vaults') },
    { id: 'transfers', label: 'Transferências' },
  ];

  return (
    <View style={styles.screen}>
      <ScreenGlow />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 4, paddingBottom: V2Layout.tabBarClearance + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={accent.base} />
        }
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.back}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            hitSlop={8}
          >
            <V2Icon name="chevron-left" size={22} color={V2Colors.text} />
          </Pressable>
          <Text style={styles.title}>Histórico</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filters}
          contentContainerStyle={styles.filtersContent}
        >
          {filters.map((f) => (
            <FilterChip
              key={f.id}
              label={f.label}
              selected={filter === f.id}
              onPress={() => setFilter(f.id)}
            />
          ))}
        </ScrollView>

        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={accent.base} />
            <Text style={styles.mutedText}>Carregando transações...</Text>
          </View>
        ) : allFailed ? (
          <View style={styles.messageCard}>
            <Text style={styles.mutedText}>Não foi possível carregar o histórico.</Text>
            <Pressable onPress={handleRefresh} accessibilityRole="button" hitSlop={8}>
              <Text style={[styles.retry, { color: accent.base }]}>Tentar novamente</Text>
            </Pressable>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={[styles.emptyIcon, { backgroundColor: accent.alpha(0.14) }]}>
              <V2Icon name="history" size={18} color={accent.base} />
            </View>
            <Text style={styles.emptyTitle}>Nenhuma transação ainda</Text>
            <Text style={styles.emptyText}>Faça seu primeiro depósito!</Text>
          </View>
        ) : groups.length === 0 ? (
          <View style={styles.messageCard}>
            <Text style={styles.mutedText}>
              {EMPTY_FILTER_TEXT[filter as Exclude<HistoryFilter, 'all'>]}
            </Text>
          </View>
        ) : (
          groups.map((group) => (
            <View key={group.title} style={styles.group}>
              <Text style={styles.groupTitle}>{group.title}</Text>
              <ListCard style={styles.list}>
                {group.items.map((item) => (
                  <HistoryRow
                    key={item.key}
                    item={item}
                    vaultName={item.vaultId ? vaultNames.get(item.vaultId) : undefined}
                  />
                ))}
              </ListCard>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: V2Colors.background,
  },
  content: {
    paddingHorizontal: V2Layout.gutter,
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 4,
    marginBottom: 4,
  },
  back: {
    width: 38,
    height: 38,
    borderRadius: V2Radius.full,
    backgroundColor: V2Colors.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: V2Font.black,
    fontSize: 22,
    letterSpacing: -0.44,
    color: V2Colors.text,
  },
  // Os filtros correm até a borda da tela, por baixo da margem lateral.
  filters: {
    marginHorizontal: -V2Layout.gutter,
    flexGrow: 0,
  },
  filtersContent: {
    paddingHorizontal: V2Layout.gutter,
    gap: 8,
  },
  loading: {
    alignItems: 'center',
    gap: 12,
    paddingTop: 48,
  },
  group: {
    gap: 8,
  },
  groupTitle: {
    paddingLeft: 4,
    fontFamily: V2Font.extraBold,
    fontSize: 11,
    letterSpacing: 1.54,
    color: V2Colors.textTertiary,
  },
  list: {
    borderColor: V2Colors.surfaceBorderStrong,
  },
  messageCard: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: V2Radius.list,
    borderWidth: 1,
    borderColor: V2Colors.surfaceBorderStrong,
    backgroundColor: V2Colors.surface,
  },
  mutedText: {
    fontFamily: V2Font.medium,
    fontSize: 13,
    color: V2Colors.textSecondary,
    textAlign: 'center',
  },
  retry: {
    fontFamily: V2Font.extraBold,
    fontSize: 13.5,
  },
  emptyCard: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 26,
    paddingHorizontal: 16,
    borderRadius: V2Radius.list,
    borderWidth: 1,
    borderColor: V2Colors.surfaceBorderStrong,
    backgroundColor: V2Colors.surface,
  },
  emptyIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: {
    fontFamily: V2Font.extraBold,
    fontSize: 14,
    color: V2Colors.text,
  },
  emptyText: {
    fontFamily: V2Font.medium,
    fontSize: 12.5,
    color: V2Colors.textSecondary,
  },
});
