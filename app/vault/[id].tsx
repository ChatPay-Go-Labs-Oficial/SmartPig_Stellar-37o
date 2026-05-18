import { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ScreenContainer } from '@/components/layout';
import { Badge, Button, Card, DepositModal, GradientText, IconSymbol, WithdrawModal } from '@/components/ui';
import { Accent, Colors, Font, FontSize, Spacing } from '@/constants/theme';
import { useVault, useVaultApy, useVaultBalance } from '@/lib/queries/vaults.queries';
import { useAuthStore } from '@/lib/stores/auth.store';

function formatVaultName(name: string): string {
  if (/^[A-Z0-9]{56}$/.test(name)) {
    return `${name.slice(0, 6)}…${name.slice(-4)}`;
  }
  return name;
}

function formatApy(apy: number | string | null | undefined): string {
  if (apy == null) return '—';
  return `${parseFloat(String(apy)).toFixed(2)}%`;
}

function formatAmount(amount: string | null | undefined): string {
  if (!amount) return '0.00';
  const n = parseFloat(amount);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(4)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(4)}K`;
  return n.toFixed(4);
}

export default function VaultDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const stellarAddress = useAuthStore((s) => s.stellarAddress);

  const { data: vault, isLoading } = useVault(id);
  const { data: apyData } = useVaultApy(id);
  const { data: balanceData } = useVaultBalance(id, stellarAddress);

  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  const liveApy = apyData?.apy ?? (vault?.apy ? parseFloat(vault.apy) : null);
  const apyBadge = liveApy && liveApy >= 10 ? 'destaque' : liveApy && liveApy >= 5 ? 'conquista' : 'muted';

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Accent.primary} size="large" />
      </View>
    );
  }

  if (!vault) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Vault não encontrado</Text>
      </View>
    );
  }

  const vaultBalance = balanceData?.underlyingBalance?.[0] ?? balanceData?.dfTokens ?? '0';

  return (
    <ScreenContainer style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <IconSymbol name="chevron.right" size={24} color={Colors.foreground} style={{ transform: [{ rotate: '180deg' }] }} />
        </Pressable>
        <View style={styles.headerLeft}>
          <GradientText style={styles.vaultName}>{formatVaultName(vault.name)}</GradientText>
          <Text style={styles.assetSymbol}>{vault.assetSymbol}</Text>
        </View>
        <Badge label={formatApy(liveApy)} variant={apyBadge} />
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>APY</Text>
          <Text style={[styles.statValue, { color: Accent.success }]}>{formatApy(liveApy)}</Text>
          {apyData?.cached && <Text style={styles.cachedLabel}>cache 5min</Text>}
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>TVL</Text>
          <Text style={styles.statValue}>
            {vault.tvl ? `$${formatAmount(vault.tvl)}` : '—'}
          </Text>
        </Card>
      </View>

      {/* My balance */}
      <Card style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Meu saldo</Text>
        {stellarAddress ? (
          <>
            <Text style={styles.balanceValue}>
              {balanceData ? `${formatAmount(vaultBalance)} ${vault.assetSymbol}` : '…'}
            </Text>
            {balanceData?.dfTokens && (
              <Text style={styles.sharesHint}>{balanceData.dfTokens} dfTokens</Text>
            )}
          </>
        ) : (
          <Text style={styles.mutedText}>Conecte uma carteira</Text>
        )}
      </Card>

      {/* Description */}
      {vault.description && (
        <Text style={styles.description}>{vault.description}</Text>
      )}

      {/* CTAs */}
      <View style={styles.actions}>
        <Button
          label="Depositar"
          variant="primary"
          size="lg"
          fullWidth
          onPress={() => setDepositOpen(true)}
        />
        <Button
          label="Sacar"
          variant="secondary"
          size="lg"
          fullWidth
          onPress={() => setWithdrawOpen(true)}
        />
      </View>

      <DepositModal
        visible={depositOpen}
        vaultId={vault.id}
        assetSymbol={vault.assetSymbol}
        onClose={() => setDepositOpen(false)}
      />
      <WithdrawModal
        visible={withdrawOpen}
        vaultId={vault.id}
        balance={vaultBalance}
        onClose={() => setWithdrawOpen(false)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: FontSize.body, fontFamily: Font.semiBold, color: Colors.mutedForeground },
  container: {
    paddingVertical: Spacing[6],
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface2,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: Spacing[4],
  },
  headerLeft: {
    flex: 1,
    minWidth: 0,
  },
  vaultName: {
    fontSize: FontSize.displaySm,
    fontFamily: Font.extraBold,
  },
  assetSymbol: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing[3],
    marginBottom: Spacing[3],
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing[4],
    gap: 4,
  },
  statLabel: {
    fontSize: FontSize.label,
    fontFamily: Font.bold,
    color: Colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: FontSize.heading,
    fontFamily: Font.extraBold,
    color: Colors.foreground,
  },
  cachedLabel: {
    fontSize: FontSize.label - 1,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
  },
  balanceCard: {
    marginBottom: Spacing[3],
    gap: Spacing[1],
  },
  balanceLabel: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.bold,
    color: Colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  balanceValue: {
    fontSize: FontSize.displaySm,
    fontFamily: Font.extraBold,
    color: Colors.foreground,
  },
  sharesHint: {
    fontSize: FontSize.label,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
    marginTop: 2,
  },
  mutedText: {
    fontSize: FontSize.body,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
  },
  description: {
    fontSize: FontSize.body,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
    lineHeight: 24,
    marginBottom: Spacing[4],
  },
  actions: {
    gap: Spacing[3],
    marginTop: Spacing[2],
  },
});
