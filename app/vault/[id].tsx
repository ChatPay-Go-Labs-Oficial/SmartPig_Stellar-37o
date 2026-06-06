import { ScreenContainer } from '@/components/layout';
import { Badge, Button, Card, DepositModal, GradientText, IconSymbol, PressableScale } from '@/components/ui';
import { Accent, Colors, Font, FontSize, Gradients, Glow, Spacing } from '@/constants/theme';
import { useVault, useVaultApy, useVaultBalance, vaultKeys } from '@/lib/queries/vaults.queries';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Modal, StyleSheet, Text, View } from 'react-native';

function formatVaultName(name: string): string {
  if (!name) return '';
  if (/^[A-Z0-9]{40,}$/.test(name)) {
    return `${name.slice(0, 6)}…${name.slice(-4)}`;
  }
  const lower = name.replace(/[-_]+/g, ' ');
  if (/pig/i.test(lower)) return 'Porquinho do PigFi';
  return lower
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
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

function formatFriendlyAmount(amount: string | null | undefined): string {
  if (!amount) return '0';
  const n = parseFloat(amount);
  if (Number.isNaN(n)) return '0';
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(n);
}

// ─── Info Row Component ───────────────────────────────────────────────────────
interface InfoRowProps {
  icon: string;
  label: string;
  value: string;
  valueColor?: string;
  isLast?: boolean;
}

function InfoRow({ icon, label, value, valueColor, isLast }: InfoRowProps) {
  return (
    <View style={[infoRowStyles.container, !isLast && infoRowStyles.borderBottom]}>
      <View style={infoRowStyles.iconWrapper}>
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
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    paddingVertical: Spacing[3],
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(244,52,180,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  textGroup: {
    flex: 1,
    gap: 2,
  },
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

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function VaultDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const walletAddress = useAuthStore((s) => s.walletAddress);
  const qc = useQueryClient();

  const { data: vault, isLoading } = useVault(id);
  const { data: apyData } = useVaultApy(id);
  const { data: balanceData } = useVaultBalance(id, walletAddress);

  const [depositOpen, setDepositOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  const liveApy = apyData?.apy ?? (vault?.apy ? parseFloat(vault.apy) : null);
  const apyBadge = liveApy && liveApy >= 10 ? 'destaque' : liveApy && liveApy >= 5 ? 'conquista' : 'muted';

  const handleDepositSuccess = useCallback(() => {
    if (walletAddress) {
      qc.invalidateQueries({ queryKey: vaultKeys.balance(id, walletAddress) });
    }
  }, [id, walletAddress, qc]);

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
  const hasInvestment = parseFloat(vaultBalance) > 0;

  return (
    <ScreenContainer style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.headerRow}>
        <PressableScale onPress={() => router.back()}>
          <View style={styles.backBtn}>
            <IconSymbol name="chevron.right" size={24} color={Colors.foreground} style={{ transform: [{ rotate: '180deg' }] }} />
          </View>
        </PressableScale>
        <View style={styles.headerLeft}>
          <Image source={require('@/assets/images/PigFi-porquinho.png')} style={styles.headerPig} />
          <GradientText style={styles.vaultName}>{formatVaultName(vault.name)}</GradientText>
          <Text style={styles.assetSymbol}>{vault.assetSymbol}</Text>
        </View>
        <Badge label={formatApy(liveApy)} variant={apyBadge} />
      </View>

      {/* ── Investment Balance Card ── */}
      <Card style={styles.balanceCard}>
        {/* Card header */}
        <View style={styles.balanceTopRow}>
          <View style={styles.balanceLabelGroup}>
            <IconSymbol name="chart.line.uptrend.xyaxis" size={14} color={Colors.mutedForeground} />
            <Text style={styles.balanceLabel}>Seu investimento</Text>
          </View>
          <PressableScale onPress={() => setInfoOpen(true)}>
            <View style={styles.infoButton}>
              <IconSymbol name="info.circle" size={14} color={Accent.primary} />
              <Text style={styles.infoButtonText}>Detalhes</Text>
            </View>
          </PressableScale>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {walletAddress ? (
          hasInvestment ? (
            /* ── Has investment ── */
            <View style={styles.investedContent}>
              <View style={styles.investedAmountRow}>
                <View style={styles.investedBadge}>
                  <Text style={styles.investedBadgeText}>✓ Investindo</Text>
                </View>
              </View>

              <LinearGradient
                colors={['rgba(244,52,180,0.08)', 'rgba(139,92,246,0.08)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.amountHighlight}
              >
                <Text style={styles.amountValue}>
                  {formatFriendlyAmount(vaultBalance)}
                </Text>
                <Text style={styles.amountSymbol}>{vault.assetSymbol}</Text>
              </LinearGradient>

              {balanceData?.dfTokens != null && (
                <View style={styles.sharesRow}>
                  <IconSymbol name="tag" size={12} color={Colors.mutedForeground} />
                  <Text style={styles.sharesHint}>
                    {balanceData.dfTokens} cotas do fundo
                  </Text>
                </View>
              )}
            </View>
          ) : (
            /* ── No investment yet ── */
            <View style={styles.emptyInvestment}>
              <View style={styles.emptyIconWrapper}>
                <IconSymbol name="plus.circle" size={28} color={Colors.mutedForeground} />
              </View>
              <Text style={styles.emptyTitle}>Ainda não investido</Text>
              <Text style={styles.emptySubtitle}>
                Faça seu primeiro investimento neste porquinho e comece a render.
              </Text>
            </View>
          )
        ) : (
          /* ── No wallet ── */
          <View style={styles.emptyInvestment}>
            <View style={styles.emptyIconWrapper}>
              <IconSymbol name="wallet.pass" size={28} color={Colors.mutedForeground} />
            </View>
            <Text style={styles.emptyTitle}>Carteira não conectada</Text>
            <Text style={styles.emptySubtitle}>
              Conecte uma carteira para ver seu saldo investido aqui.
            </Text>
          </View>
        )}
      </Card>

      {/* ── CTA ── */}
      <View style={styles.actions}>
        <Button
          label="Investir neste porquinho"
          variant="primary"
          size="lg"
          fullWidth
          onPress={() => setDepositOpen(true)}
        />
      </View>

      {/* ── Deposit Modal ── */}
      <DepositModal
        visible={depositOpen}
        vaultId={vault.id}
        assetSymbol={vault.assetSymbol}
        onClose={() => setDepositOpen(false)}
        onSuccess={handleDepositSuccess}
      />

      {/* ── Info Modal ── */}
      <Modal
        visible={infoOpen}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setInfoOpen(false)}
      >
        <Pressable style={styles.infoBackdrop} onPress={() => setInfoOpen(false)}>
          <Pressable style={styles.infoSheet} onPress={() => {}}>

            {/* Modal handle */}
            <View style={styles.sheetHandle} />

            {/* Modal title */}
            <View style={styles.infoTitleRow}>
              <View style={styles.infoTitleIcon}>
                <IconSymbol name="info.circle.fill" size={20} color={Accent.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoTitle}>Detalhes do porquinho</Text>
                <Text style={styles.infoSubtitle}>{formatVaultName(vault.name)}</Text>
              </View>
            </View>

            {/* Info rows */}
            <View style={styles.infoCard}>
              <InfoRow
                icon="percent"
                label="Rendimento anual (APY)"
                value={`${formatApy(liveApy)} ao ano`}
                valueColor={liveApy && liveApy >= 5 ? Accent.gold : undefined}
              />
              <InfoRow
                icon="arrow.up.forward.circle"
                label="Total aplicado no fundo (TVL)"
                value={vault.tvl ? `$${formatAmount(vault.tvl)}` : 'Não disponível'}
              />
              <InfoRow
                icon="wallet.pass"
                label="Seu saldo aqui"
                value={
                  hasInvestment
                    ? `${formatFriendlyAmount(vaultBalance)} ${vault.assetSymbol}`
                    : 'Você ainda não investiu'
                }
                valueColor={hasInvestment ? Accent.success : undefined}
                isLast
              />
            </View>

            {/* Footer note */}
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

    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  // ── Structural ──
  centered: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: FontSize.body, fontFamily: Font.semiBold, color: Colors.mutedForeground },
  container: {
    paddingVertical: Spacing[6],
  },

  // ── Header ──
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
  headerPig: {
    width: 96,
    height: 96,
    resizeMode: 'contain',
    alignSelf: 'center',
    marginBottom: Spacing[2],
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

  // ── Balance Card ──
  balanceCard: {
    marginBottom: Spacing[4],
    paddingVertical: Spacing[4],
    gap: 0,
  },
  balanceTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing[3],
  },
  balanceLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  balanceLabel: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.bold,
    color: Colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: Spacing[4],
  },

  // ── Invested State ──
  investedContent: {
    gap: Spacing[3],
  },
  investedAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  investedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(25,213,96,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(25,213,96,0.25)',
  },
  investedBadgeText: {
    fontSize: FontSize.label,
    fontFamily: Font.bold,
    color: Accent.success,
    letterSpacing: 0.3,
  },
  amountHighlight: {
    borderRadius: 16,
    paddingVertical: Spacing[4],
    paddingHorizontal: Spacing[4],
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(244,52,180,0.18)',
  },
  amountValue: {
    fontSize: FontSize.display,
    fontFamily: Font.black,
    color: Colors.foreground,
    lineHeight: FontSize.display + 4,
  },
  amountSymbol: {
    fontSize: FontSize.subheading,
    fontFamily: Font.bold,
    color: Colors.mutedForeground,
    marginBottom: 4,
  },
  sharesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  sharesHint: {
    fontSize: FontSize.label,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
  },

  // ── Empty / No Wallet State ──
  emptyInvestment: {
    alignItems: 'center',
    paddingVertical: Spacing[4],
    gap: Spacing[2],
  },
  emptyIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.surface2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing[1],
  },
  emptyTitle: {
    fontSize: FontSize.body,
    fontFamily: Font.bold,
    color: Colors.foreground,
  },
  emptySubtitle: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: Spacing[3],
  },

  // ── Actions ──
  actions: {
    gap: Spacing[3],
    marginTop: Spacing[1],
  },

  // ── Info Button ──
  infoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(244,52,180,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(244,52,180,0.22)',
  },
  infoButtonText: {
    fontSize: FontSize.label,
    fontFamily: Font.bold,
    color: Accent.primary,
  },

  // ── Info Modal ──
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
  infoSubtitle: {
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
