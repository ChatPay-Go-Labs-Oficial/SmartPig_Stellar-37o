import { ScreenContainer } from '@/components/layout';
import { Badge, Button, Card, GradientText } from '@/components/ui';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Accent, Colors, Font, FontSize, Radius, Spacing } from '@/constants/theme';
import type { Vault } from '@/lib/api/vaults';
import { useDeposits } from '@/lib/queries/deposits.queries';
import { useWalletBalance } from '@/lib/queries/stellar.queries';
import { useVaults } from '@/lib/queries/vaults.queries';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useUIStore } from '@/lib/stores/ui.store';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

function formatBalance(value: number): string {
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatApy(apy: string | null): string {
  if (!apy) return '—';
  return `${parseFloat(apy).toFixed(2)}%`;
}

function ActiveVaultRow({ vault }: { vault: Vault }) {
  return (
    <Pressable onPress={() => router.push(`/vault/${vault.id}`)} style={styles.vaultRow}>
      <View style={styles.vaultInfo}>
        <Text style={styles.vaultName}>{vault.name}</Text>
        <Text style={styles.vaultAsset}>{vault.assetSymbol}</Text>
      </View>
      <Badge label={formatApy(vault.apy)} variant="sucesso" />
    </Pressable>
  );
}

export default function HomeScreen() {
  const userName = useAuthStore((s) => s.userName);
  const addToast = useUIStore((s) => s.addToast);

  const { data: vaults, isLoading: vaultsLoading } = useVaults();
  const { data: deposits } = useDeposits();
  const { data: balance, isLoading: balanceLoading, isFetching: balanceFetching, refetch: refetchBalance } = useWalletBalance();

  const confirmedDeposits = deposits?.filter((d) => d.status === 'CONFIRMED') ?? [];
  const activeVaultIds = [...new Set(confirmedDeposits.map((d) => d.vaultId))];
  const activeVaults = vaults?.filter((v) => activeVaultIds.includes(v.id)) ?? [];

  return (
    <ScreenContainer>
      {/* Header row */}
      <View style={styles.header}>
        <GradientText variant="primary" style={styles.logo}>PigFi</GradientText>
        <Pressable hitSlop={8}>
          <IconSymbol name="questionmark.circle" size={20} color={Colors.mutedForeground} />
        </Pressable>
      </View>

      {/* Greeting */}
      <View style={styles.greetingBlock}>
        <Text style={styles.greetingLine}>
          Olá,{' '}
          <Text style={styles.greetingName}>{userName ?? 'bem-vindo'}</Text>!
        </Text>
        <Text style={styles.greetingSub}>Aqui está o resumo dos seus investimentos.</Text>
      </View>

      {/* Balance card */}
      <View style={styles.balanceCard}>
        <View style={styles.balanceLabelRow}>
          <Text style={styles.balanceLabel}>SALDO DISPONÍVEL</Text>
          <Pressable onPress={() => refetchBalance()} hitSlop={8} disabled={balanceFetching}>
            {balanceFetching
              ? <ActivityIndicator size={14} color={Colors.mutedForeground} />
              : <IconSymbol name="arrow.clockwise" size={14} color={Colors.mutedForeground} />
            }
          </Pressable>
        </View>
        {balanceLoading ? (
          <ActivityIndicator color={Accent.primary} style={{ marginVertical: Spacing[2] }} />
        ) : (
          <>
            <Text style={styles.balanceAmount}>{formatBalance(balance?.usdc ?? 0)} USDC</Text>
            <Text style={styles.balanceXlm}>{formatBalance(balance?.xlm ?? 0)} XLM</Text>
          </>
        )}
        <View style={styles.balanceActions}>
          <View style={styles.balanceBtn}>
            <Button
              label="Depositar"
              rightIcon={<IconSymbol name="arrow.down" size={16} color="#fff" />}
              variant="primary"
              size="md"
              fullWidth
              onPress={() => router.push('/(modals)/deposit' as any)}
            />
          </View>
          <View style={styles.balanceBtn}>
            <Button
              label="Sacar"
              rightIcon={<IconSymbol name="arrow.up" size={16} color={Colors.foreground} />}
              variant="secondary"
              size="md"
              fullWidth
              onPress={() => addToast('Em breve', 'info')}
            />
          </View>
        </View>
      </View>

      {/* Active investments summary */}
      <View style={styles.summaryRow}>
        <View style={styles.activeDot} />
        <Text style={styles.summaryText}>
          <Text style={styles.summaryCount}>{vaultsLoading ? '—' : activeVaults.length}</Text>
          {' '}investimento{activeVaults.length !== 1 ? 's' : ''} ativo{activeVaults.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Investments section */}
      <Text style={styles.sectionTitle}>Seus Investimentos</Text>

      {vaultsLoading && (
        <ActivityIndicator color={Accent.primary} style={{ marginVertical: Spacing[4] }} />
      )}

      {!vaultsLoading && activeVaults.length > 0 && (
        <Card style={styles.vaultsCard}>
          {activeVaults.map((v, i) => (
            <View key={v.id}>
              <ActiveVaultRow vault={v} />
              {i < activeVaults.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </Card>
      )}

      {!vaultsLoading && activeVaults.length === 0 && (
        <Card style={styles.emptyCard}>
          <View style={styles.emptyIconWrapper}>
            <IconSymbol name="chart.bar.fill" size={28} color={Accent.primary} />
            <View style={styles.emptyBadge}>
              <IconSymbol name="exclamationmark" size={10} color="#fff" />
            </View>
          </View>
          <Text style={styles.emptyTitle}>Sem investimentos ativos</Text>
          <Text style={styles.emptySubtitle}>Comece a render com o poder do PigFi.</Text>
          <Button
            label="Explorar agora"
            rightIcon={<IconSymbol name="arrow.right" size={16} color="#fff" />}
            variant="primary"
            size="md"
            fullWidth
            onPress={() => router.push('/(tabs)/vaults')}
          />
        </Card>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing[6],
    marginBottom: Spacing[4],
  },
  logo: {
    fontSize: FontSize.displaySm,
    fontFamily: Font.extraBold,
  },
  greetingBlock: {
    marginBottom: Spacing[4],
    gap: 2,
  },
  greetingLine: {
    fontSize: FontSize.heading,
    fontFamily: Font.bold,
    color: Colors.foreground,
  },
  greetingName: {
    fontSize: FontSize.heading,
    fontFamily: Font.black,
    color: Accent.primary,
  },
  greetingSub: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
  },

  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    marginBottom: Spacing[4],
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Accent.success,
  },
  summaryText: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
  },
  summaryCount: {
    fontFamily: Font.bold,
    color: Accent.success,
  },

  // Balance card
  balanceCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: Spacing[6],
    marginBottom: Spacing[6],
    gap: Spacing[3],
  },
  balanceLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  balanceLabel: {
    fontSize: FontSize.label,
    fontFamily: Font.bold,
    color: Colors.mutedForeground,
    letterSpacing: 1,
  },
  balanceAmount: {
    fontSize: FontSize.heading,
    fontFamily: Font.black,
    color: Colors.foreground,
  },
  balanceXlm: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
  },
  balanceActions: {
    flexDirection: 'row',
    gap: Spacing[3],
    marginTop: Spacing[1],
  },
  balanceBtn: {
    flex: 1,
  },

  // Section
  sectionTitle: {
    fontSize: FontSize.subheading,
    fontFamily: Font.extraBold,
    color: Colors.foreground,
    marginBottom: Spacing[3],
  },

  // Active vaults
  vaultsCard: { padding: 0, overflow: 'hidden' },
  vaultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing[4],
  },
  vaultInfo: { gap: 2 },
  vaultName: {
    fontSize: FontSize.body,
    fontFamily: Font.bold,
    color: Colors.foreground,
  },
  vaultAsset: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing[4],
  },

  // Empty state
  emptyCard: {
    alignItems: 'center',
    gap: Spacing[3],
    paddingVertical: Spacing[8],
  },
  emptyIconWrapper: {
    position: 'relative',
    width: 56,
    height: 56,
    backgroundColor: 'rgba(244, 52, 180, 0.12)',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[2],
  },
  emptyBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  emptyTitle: {
    fontSize: FontSize.subheading,
    fontFamily: Font.extraBold,
    color: Colors.foreground,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: FontSize.body,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 22,
  },
});
