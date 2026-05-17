import { ScreenContainer } from '@/components/layout';
import { Badge, Card } from '@/components/ui';
import { Accent, Colors, Font, FontSize, Gradients, Spacing } from '@/constants/theme';
import type { Vault } from '@/lib/api/vaults';
import { useVaults } from '@/lib/queries/vaults.queries';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

function formatApy(apy: string | null): string {
  if (!apy) return '—';
  return `${parseFloat(apy).toFixed(2)}%`;
}

function formatVaultName(name: string): string {
  if (/^[A-Z0-9]{56}$/.test(name)) {
    return `${name.slice(0, 6)}…${name.slice(-4)}`;
  }
  return name;
}

function formatTvl(tvl: string | null): string {
  if (!tvl) return '—';
  const n = parseFloat(tvl);
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function VaultCard({ vault }: { vault: Vault }) {
  const apy = parseFloat(vault.apy ?? '0');
  const apyBadge = apy >= 10 ? 'destaque' : apy >= 5 ? 'conquista' : 'muted';

  return (
    <Pressable onPress={() => router.push(`/vault/${vault.id}`)} style={styles.cardWrapper}>
      <Card style={styles.vaultCard}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Text style={styles.vaultName} numberOfLines={1}>{formatVaultName(vault.name)}</Text>
            <Text style={styles.assetSymbol}>{vault.assetSymbol}</Text>
          </View>
          <Badge label={formatApy(vault.apy)} variant={apyBadge} />
        </View>

        <View style={styles.cardStats}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>APY</Text>
            <Text style={styles.statValue}>{formatApy(vault.apy)}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>TVL</Text>
            <Text style={styles.statValue}>{formatTvl(vault.tvl)}</Text>
          </View>
        </View>

        {vault.description && (
          <Text style={styles.description} numberOfLines={2}>{vault.description}</Text>
        )}
      </Card>
    </Pressable>
  );
}

export default function VaultsScreen() {
  const { data: vaults, isLoading, isError, refetch } = useVaults();

  return (
    <ScreenContainer scrollable={false} contentStyle={{ padding: 0 }}>
      <LinearGradient
        colors={Gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerBanner}
      >
        <Text style={styles.title}>Vaults</Text>
        <Text style={styles.subtitle}>Escolha onde investir</Text>
      </LinearGradient>

      {isLoading && (
        <View style={styles.centered}>
          <ActivityIndicator color={Accent.primary} size="large" />
        </View>
      )}

      {isError && (
        <View style={styles.centered}>
          <Text style={styles.errorText}>Erro ao carregar vaults</Text>
          <Pressable onPress={() => refetch()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Tentar novamente</Text>
          </Pressable>
        </View>
      )}

      {vaults && (
        <FlatList
          data={vaults}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <VaultCard vault={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerBanner: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 32,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: Spacing[4],
  },
  title: {
    fontSize: FontSize.displaySm,
    fontFamily: Font.black,
    color: '#fff',
  },
  subtitle: {
    fontSize: FontSize.body,
    fontFamily: Font.semiBold,
    color: 'rgba(255,255,255,0.7)',
    marginTop: Spacing[1],
  },
  list: {
    paddingHorizontal: Spacing[6],
    paddingBottom: Spacing[8],
    gap: Spacing[3],
  },
  cardWrapper: { width: '100%' },
  vaultCard: { gap: Spacing[3] },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  cardHeaderLeft: {
    flex: 1,
    minWidth: 0,
  },
  vaultName: {
    fontSize: FontSize.subheading,
    fontFamily: Font.extraBold,
    color: Colors.foreground,
  },
  assetSymbol: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
    marginTop: 2,
  },
  cardStats: {
    flexDirection: 'row',
    gap: Spacing[6],
  },
  stat: { gap: 2 },
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
  description: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
    lineHeight: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing[3],
  },
  errorText: {
    fontSize: FontSize.body,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
  },
  retryBtn: {
    paddingVertical: Spacing[2],
    paddingHorizontal: Spacing[4],
  },
  retryText: {
    fontSize: FontSize.body,
    fontFamily: Font.bold,
    color: Accent.primary,
  },
});
