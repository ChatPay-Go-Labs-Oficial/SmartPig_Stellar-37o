import { ScreenContainer } from '@/components/layout';
import { Badge, Card, GradientText } from '@/components/ui';
import { Accent, Colors, Font, FontSize, Glow, Gradients, Radius, Spacing } from '@/constants/theme';
import type { Vault } from '@/lib/api/vaults';
import { useDeposits } from '@/lib/queries/deposits.queries';
import { useVaults } from '@/lib/queries/vaults.queries';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useWalletStore } from '@/lib/stores/wallet.store';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

function formatApy(apy: string | null): string {
  if (!apy) return '—';
  return `${parseFloat(apy).toFixed(2)}%`;
}

function ActiveVaultRow({ vault }: { vault: Vault }) {
  return (
    <Pressable onPress={() => router.push(`/vault/${vault.id}`)} style={styles.activeVaultRow}>
      <View style={styles.activeVaultInfo}>
        <Text style={styles.activeVaultName}>{vault.name}</Text>
        <Text style={styles.activeVaultAsset}>{vault.assetSymbol}</Text>
      </View>
      <View style={styles.activeVaultRight}>
        <Badge label={formatApy(vault.apy)} variant="sucesso" />
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const contractId = useAuthStore((s) => s.contractId);
  const walletAddress = useWalletStore((s) => s.walletAddress);

  const { data: vaults, isLoading: vaultsLoading } = useVaults();
  const { data: deposits } = useDeposits();

  const confirmedDeposits = deposits?.filter((d) => d.status === 'CONFIRMED') ?? [];
  const activeVaultIds = [...new Set(confirmedDeposits.map((d) => d.vaultId))];
  const activeVaults = vaults?.filter((v) => activeVaultIds.includes(v.id)) ?? [];
  const hasActiveVaults = activeVaults.length > 0;

  return (
    <ScreenContainer>
      {/* Greeting */}
      <View style={styles.greetingRow}>
        <GradientText variant="primary" style={styles.greeting}>PigFi</GradientText>
        <Text style={styles.greetingSub}>Seu portfólio DeFi</Text>
      </View>

      {/* Wallet card */}
      <LinearGradient
        colors={Gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.walletCard, Glow.pink]}
      >
        <Text style={styles.walletLabel}>Carteira</Text>
        <Text style={styles.walletAddress} numberOfLines={1}>
          {walletAddress ?? contractId ?? 'Não conectada'}
        </Text>
        <Text style={styles.walletSub}>
          {activeVaults.length} vault{activeVaults.length !== 1 ? 's' : ''} ativo{activeVaults.length !== 1 ? 's' : ''}
        </Text>
      </LinearGradient>

      {/* Active vaults */}
      <Text style={styles.sectionTitle}>Seus Vaults</Text>

      {vaultsLoading && (
        <ActivityIndicator color={Accent.primary} style={{ marginVertical: Spacing[4] }} />
      )}

      {!vaultsLoading && hasActiveVaults && (
        <Card style={styles.activeVaultsCard}>
          {activeVaults.map((v, i) => (
            <View key={v.id}>
              <ActiveVaultRow vault={v} />
              {i < activeVaults.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </Card>
      )}

      {!vaultsLoading && !hasActiveVaults && (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyText}>Você ainda não tem vaults ativos.</Text>
          <Pressable onPress={() => router.push('/(tabs)/vaults')}>
            <Text style={styles.emptyLink}>Explorar vaults →</Text>
          </Pressable>
        </Card>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  greetingRow: { marginBottom: Spacing[6], marginTop: Spacing[6] },
  greeting: {
    fontSize: FontSize.displaySm,
    fontFamily: Font.extraBold,
  },
  greetingSub: {
    fontSize: FontSize.body,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
    marginTop: Spacing[1],
  },
  walletCard: {
    borderRadius: Radius.lg,
    padding: Spacing[6],
    marginBottom: Spacing[6],
    gap: Spacing[1],
  },
  walletLabel: {
    fontSize: FontSize.label,
    fontFamily: Font.semiBold,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  walletAddress: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.bold,
    color: '#fff',
  },
  walletSub: {
    fontSize: FontSize.body,
    fontFamily: Font.extraBold,
    color: '#fff',
    marginTop: Spacing[1],
  },
  sectionTitle: {
    fontSize: FontSize.subheading,
    fontFamily: Font.extraBold,
    color: Colors.foreground,
    marginBottom: Spacing[3],
  },
  activeVaultsCard: { padding: 0, overflow: 'hidden' },
  activeVaultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing[4],
  },
  activeVaultInfo: { gap: 2 },
  activeVaultName: {
    fontSize: FontSize.body,
    fontFamily: Font.bold,
    color: Colors.foreground,
  },
  activeVaultAsset: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
  },
  activeVaultRight: { alignItems: 'flex-end' },
  divider: { height: 1, backgroundColor: Colors.border, marginHorizontal: Spacing[4] },
  emptyCard: { gap: Spacing[2], alignItems: 'flex-start' },
  emptyText: {
    fontSize: FontSize.body,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
  },
  emptyLink: {
    fontSize: FontSize.body,
    fontFamily: Font.bold,
    color: Accent.primary,
  },
});
