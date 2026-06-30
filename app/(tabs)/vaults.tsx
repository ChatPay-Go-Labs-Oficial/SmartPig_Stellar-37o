import { ScreenContainer } from '@/components/layout';
import { Badge, Button, Card, DepositModal, IconSymbol, PressableScale, WithdrawModal } from '@/components/ui';
import { Accent, Colors, Font, FontSize, Gradients, Spacing } from '@/constants/theme';
import type { Vault } from '@/lib/api/vaults';
import { useVaultApy, useVaultBalance, useVaults } from '@/lib/queries/vaults.queries';
import { useWalletBalance } from '@/lib/queries/wallets.queries';
import { useAuthStore } from '@/lib/stores/auth.store';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { Modal } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';

// ─── InfoRow ─────────────────────────────────────────────────────────────────
function InfoRow({
  icon,
  label,
  value,
  valueColor,
  isLast,
}: {
  icon: string;
  label: string;
  value: string;
  valueColor?: string;
  isLast?: boolean;
}) {
  return (
    <View style={[infoRowStyles.row, !isLast && infoRowStyles.rowBorder]}>
      <View style={infoRowStyles.iconBox}>
        <IconSymbol name={icon as any} size={18} color={Accent.primary} />
      </View>
      <View style={infoRowStyles.textGroup}>
        <Text style={infoRowStyles.label}>{label}</Text>
        <Text style={[infoRowStyles.value, valueColor ? { color: valueColor } : undefined]}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const infoRowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    paddingVertical: Spacing[3],
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(244,52,180,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  textGroup: { flex: 1, gap: 2 },
  label: {
    fontSize: FontSize.label,
    fontFamily: Font.bold,
    color: Colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: FontSize.body,
    fontFamily: Font.extraBold,
    color: Colors.foreground,
  },
});

function formatApy(apy: number | string | null): string {
  if (!apy) return '—';
  return `${parseFloat(String(apy)).toFixed(2)}%`;
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

function formatFriendlyAmount(amount: string | null | undefined): string {
  if (!amount) return '0';
  const n = parseFloat(amount);
  if (Number.isNaN(n)) return '0';
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(n);
}

function VaultCard({ vault }: { vault: Vault }) {
  const apy = parseFloat(vault.apy ?? '0');
  const apyBadge = apy >= 10 ? 'destaque' : apy >= 5 ? 'conquista' : 'muted';

  return (
    <PressableScale onPress={() => router.push(`/vault/${vault.id}`)} style={styles.cardWrapper}>
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
    </PressableScale>
  );
}

export default function VaultsScreen() {
  const { data: vaults, isLoading, isError, refetch } = useVaults();

  return (
    <ScreenContainer scrollable contentStyle={{ padding: 0, paddingBottom: 120 }}>
      <LinearGradient
        colors={Gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerBanner}
      >
        <Text style={styles.title}>Investir</Text>
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
          <PressableScale onPress={() => refetch()}>
            <View style={styles.retryBtn}>
              <Text style={styles.retryText}>Tentar novamente</Text>
            </View>
          </PressableScale>
        </View>
      )}

      {vaults && vaults.length > 0 && (
        <View style={styles.featureWrapper}>
          <VaultFeatured vault={vaults[0]} />

          {vaults.length > 1 && (
            <View style={styles.list}>
              {vaults.slice(1).map((item) => (
                <VaultCard key={item.id} vault={item} />
              ))}
            </View>
          )}
        </View>
      )}
    </ScreenContainer>
  );
}

function VaultFeatured({ vault }: { vault: Vault }) {
  const walletAddress = useAuthStore((s) => s.walletAddress);
  const { data: balanceData } = useVaultBalance(vault.id, walletAddress);
  const { data: apyData } = useVaultApy(vault.id);
  const apyValue = apyData?.apy ?? (vault.apy ? parseFloat(vault.apy) : 0);
  const vaultBalance = balanceData?.underlyingBalance?.[0] ?? '0';
  const hasBalance = parseFloat(vaultBalance) > 0;
  const walletBalance = useWalletBalance(walletAddress);
  const dailyEarnings = hasBalance ? parseFloat(vaultBalance) * (apyValue / 100) / 365 : 0;
  const [infoOpen, setInfoOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  return (
    <>
      <View style={styles.featureCard}>
        {/* Badge */}
        <Badge label="O porquinho da casa" variant="destaque" style={{ alignSelf: 'flex-start' }} />

        {/* Pig row: avatar + name + APY */}
        <View style={styles.pigInfoRow}>
          <Image source={require('@/assets/images/PigFi-porquinho.png')} style={styles.pigAvatar} />
          <View style={styles.pigNameBlock}>
            <Text style={styles.featureTitle} numberOfLines={1}>Porquinho do PigFi</Text>
            <Text style={styles.featureSubtitle}>Dólar rendendo todo dia</Text>
          </View>
          <View style={styles.apyBlock}>
            <View style={styles.apyNumRow}>
              <Text style={styles.apyBig}>{(apyValue ?? 0).toFixed(2).replace('.', ',')}%</Text>
              <Pressable onPress={() => setInfoOpen(true)} hitSlop={10}>
                <MaterialIcons name="info-outline" size={14} color={Colors.mutedForeground} />
              </Pressable>
            </View>
            <Text style={styles.apyLabel}>AO ANO</Text>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Balance */}
        <View>
          <Text style={styles.balanceLabel}>Você tem investido aqui</Text>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceValue}>${formatFriendlyAmount(vaultBalance)}</Text>
            {hasBalance && (
              <View style={styles.earningsChip}>
                <MaterialIcons name="trending-up" size={12} color={Accent.success} />
                <Text style={styles.earningsText}>+${dailyEarnings.toFixed(4)}/dia</Text>
              </View>
            )}
          </View>
        </View>

        {/* Side-by-side action buttons */}
        <View style={styles.actionRow}>
          <PressableScale onPress={() => setDepositOpen(true)} style={styles.actionBtnWrap}>
            <LinearGradient colors={Gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.investBtn}>
              <MaterialIcons name="arrow-downward" size={22} color="rgba(255,255,255,0.9)" />
              <View style={styles.btnTextBlock}>
                <Text style={styles.investBtnText}>Investir</Text>
                <Text style={styles.investBtnSub}>no porquinho</Text>
              </View>
            </LinearGradient>
          </PressableScale>
          <PressableScale onPress={() => setWithdrawOpen(true)} style={styles.actionBtnWrap}>
            <View style={styles.sacarBtn}>
              <MaterialIcons name="arrow-upward" size={22} color={Colors.foreground} />
              <View style={styles.btnTextBlock}>
                <Text style={styles.sacarBtnText}>Tirar</Text>
                <Text style={styles.sacarBtnSub}>do porquinho</Text>
              </View>
            </View>
          </PressableScale>
        </View>

        {/* Info link */}
        <Pressable onPress={() => setInfoOpen(true)} style={styles.infoLink} hitSlop={8}>
          <MaterialIcons name="info-outline" size={13} color={Colors.mutedForeground} />
          <Text style={styles.infoLinkText}>Ver informações do fundo</Text>
        </Pressable>
      </View>

      <DepositModal
        visible={depositOpen}
        vaultId={vault.id}
        assetSymbol={vault.assetSymbol}
        apyValue={apyValue}
        onClose={() => setDepositOpen(false)}
      />
      <WithdrawModal
        visible={withdrawOpen}
        vaultId={vault.id}
        dfTokens={balanceData?.dfTokens ?? '0'}
        underlyingBalance={vaultBalance}
        assetSymbol={vault.assetSymbol}
        apyValue={apyValue}
        onClose={() => setWithdrawOpen(false)}
      />

      <Modal
        visible={infoOpen}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setInfoOpen(false)}
      >
        <Pressable style={styles.infoBackdrop} onPress={() => setInfoOpen(false)}>
          <Pressable style={styles.infoSheet} onPress={() => {}}>
            {/* Handle */}
            <View style={styles.sheetHandle} />

            {/* Title */}
            <View style={styles.infoTitleRow}>
              <View style={styles.infoTitleIcon}>
                <IconSymbol name="info.circle.fill" size={20} color={Accent.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoTitle}>Detalhes do porquinho</Text>
                <Text style={styles.infoTitleSub}>Porquinho do PigFi</Text>
              </View>
            </View>

            {/* Info rows */}
            <View style={styles.infoCard}>
              <InfoRow
                icon="percent"
                label="Rendimento anual (APY)"
                value={`${formatApy(apyValue)} ao ano`}
                valueColor={apyValue >= 5 ? Accent.gold : undefined}
              />
              <InfoRow
                icon="arrow.up.forward.circle"
                label="Volume total de investidores"
                value={vault.tvl ? formatTvl(vault.tvl) : 'Não disponível'}
              />
              <InfoRow
                icon="wallet.pass"
                label="Total que você tem nesse porquinho"
                value={hasBalance ? `${formatFriendlyAmount(vaultBalance)} ${vault.assetSymbol}` : 'Você ainda não investiu'}
                valueColor={hasBalance ? Accent.success : undefined}
                isLast
              />
            </View>

            {/* Note */}
            <View style={styles.infoNote}>
              <IconSymbol name="exclamationmark.triangle" size={13} color={Colors.mutedForeground} />
              <Text style={styles.infoNoteText}>
                O TVL representa o total de todos os investidores neste fundo, não apenas o seu.
              </Text>
            </View>

            <Button label="Fechar" variant="secondary" size="lg" fullWidth onPress={() => setInfoOpen(false)} />
          </Pressable>
        </Pressable>
      </Modal>
    </>
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
  featureWrapper: {
    paddingHorizontal: Spacing[6],
    paddingBottom: Spacing[6],
    gap: Spacing[4],
  },
  featureCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: Spacing[4],
    gap: Spacing[3],
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pigInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  pigAvatar: {
    width: 52,
    height: 52,
    borderRadius: 10,
    resizeMode: 'contain',
    backgroundColor: Colors.surface2,
  },
  pigNameBlock: {
    flex: 1,
    gap: 2,
  },
  featureTitle: {
    fontSize: 13,
    fontFamily: Font.extraBold,
    color: Colors.foreground,
  },
  featureSubtitle: {
    fontSize: FontSize.label,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
  },
  apyBlock: {
    alignItems: 'flex-end',
  },
  apyNumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  apyBig: {
    fontSize: FontSize.heading,
    fontFamily: Font.black,
    color: Colors.foreground,
    lineHeight: 28,
  },
  apyLabel: {
    fontSize: 10,
    fontFamily: Font.bold,
    color: Colors.mutedForeground,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  balanceLabel: {
    fontSize: FontSize.label,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
    marginBottom: 2,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  balanceValue: {
    fontSize: FontSize.displaySm,
    fontFamily: Font.black,
    color: Colors.foreground,
  },
  earningsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(25,213,96,0.10)',
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  earningsText: {
    fontSize: FontSize.label,
    fontFamily: Font.bold,
    color: Accent.success,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing[2],
  },
  actionBtnWrap: {
    flex: 1,
  },
  investBtn: {
    height: 58,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 10,
    paddingHorizontal: Spacing[4],
  },
  btnTextBlock: {
    alignItems: 'flex-start',
  },
  investBtnText: {
    fontSize: FontSize.subheading,
    fontFamily: Font.black,
    color: '#fff',
    lineHeight: 20,
  },
  investBtnSub: {
    fontSize: 11,
    fontFamily: Font.semiBold,
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 14,
  },
  sacarBtn: {
    height: 58,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 10,
    paddingHorizontal: Spacing[4],
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sacarBtnText: {
    fontSize: FontSize.subheading,
    fontFamily: Font.black,
    color: Colors.foreground,
    lineHeight: 20,
  },
  sacarBtnSub: {
    fontSize: 11,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
    lineHeight: 14,
  },
  infoLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  infoLinkText: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
  },
  infoBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.70)',
    justifyContent: 'flex-end',
  },
  infoSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: Spacing[6],
    paddingTop: Spacing[4],
    paddingBottom: Spacing[8],
    gap: Spacing[4],
    borderTopWidth: 1,
    borderColor: Colors.border,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: Spacing[2],
  },
  infoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  infoTitleIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(244,52,180,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoTitle: {
    fontSize: FontSize.heading,
    fontFamily: Font.extraBold,
    color: Colors.foreground,
    lineHeight: 28,
  },
  infoTitleSub: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
    marginTop: 2,
  },
  infoCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing[4],
    overflow: 'hidden',
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(120,113,140,0.10)',
    borderRadius: 12,
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[3],
  },
  infoNoteText: {
    flex: 1,
    fontSize: FontSize.label,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
    lineHeight: 18,
  },
});
