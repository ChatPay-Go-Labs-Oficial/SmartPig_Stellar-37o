import { Card, DepositModal, StarryBackground, WithdrawModal, RampMethodSelector, EtherfuseOnrampModal, EtherfuseOfframpModal, getPigLevel, PressableScale, LevelUpAnimation } from '@/components/ui';
import { Accent, Colors, Font, FontSize, Gradients, Radius } from '@/constants/theme';
import type { Vault } from '@/lib/api/vaults';
import { useVaults, useAllVaultBalances } from '@/lib/queries/vaults.queries';
import { useWalletBalance } from '@/lib/queries/wallets.queries';
import { findUsdcBalance } from '@/lib/api/wallets';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useSound } from '@/hooks/use-sound';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

const PIG_LEVELS = [
  { label: 'Porquinho Bebê', minBalance: 0, image: require('@/assets/images/pig_babe.png') },
  { label: 'Porquinho Esperto', minBalance: 100, image: require('@/assets/images/pig1.png') },
  { label: 'Porquinho Forte', minBalance: 500, image: require('@/assets/images/pig-muscle.png') },
  { label: 'Porquinho Dourado', minBalance: 1000, image: require('@/assets/images/pig-gold.png') },
  { label: 'Porquinho Rei', minBalance: 5000, image: require('@/assets/images/pig-king.png') },
];

function ActiveVaultRow({ vault, underlying }: { vault: Vault; underlying?: number }) {
  return (
    <View style={styles.activeVaultRow}>
      <View style={styles.activeVaultPigWrap}>
        <Image source={require('@/assets/images/PigFi-porquinho.png')} style={styles.activeVaultPig} />
      </View>

      <View style={styles.activeVaultInfo}>
        <Text style={styles.activeVaultName} numberOfLines={1}>{vault.name}</Text>
        <Text style={styles.activeVaultAsset} numberOfLines={1}>
          {underlying ? `$${underlying.toFixed(2)} investidos` : vault.assetSymbol}
        </Text>
        {vault.apy && (
          <View style={styles.activeVaultApyBadge}>
            <MaterialIcons name="trending-up" size={11} color={Accent.success} />
            <Text style={styles.activeVaultApyText}>
              {parseFloat(vault.apy).toFixed(2)}% a.a
            </Text>
          </View>
        )}
      </View>

      <PressableScale onPress={() => router.push('/(tabs)/vaults')}>
        <LinearGradient
          colors={Gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.investBtn}
        >
          <Text style={styles.investBtnText}>Investir</Text>
          <MaterialIcons name="arrow-forward" size={13} color="#fff" />
        </LinearGradient>
      </PressableScale>
    </View>
  );
}

export default function HomeScreen() {
  const { data: vaults, refetch: refetchVaults } = useVaults();
  const walletAddress = useAuthStore((s) => s.walletAddress);
  const lastSeenPigLevel = useAuthStore((s) =>
    walletAddress ? s.lastSeenPigLevelByWallet[walletAddress] : undefined,
  );
  const setLastSeenPigLevel = useAuthStore((s) => s.setLastSeenPigLevel);
  const balances = useAllVaultBalances(walletAddress);
  const balancesReady =
    !!walletAddress &&
    vaults !== undefined &&
    balances.length === vaults.length &&
    balances.every((balance) => balance.isSuccess && balance.isFetchedAfterMount);

  const totalInvested = useMemo(() => {
    let total = 0;
    for (const b of balances) {
      const val = parseFloat(b.data?.underlyingBalance?.[0] ?? '0');
      total += val;
    }
    return total;
  }, [balances]);

  const { data: walletBalances, refetch: refetchWallet } = useWalletBalance(walletAddress);
  const walletUsdc = walletBalances ? findUsdcBalance(walletBalances) : '0';
  const parsedWalletUsdc = parseFloat(walletUsdc);

  const firstVault = vaults?.[0];
  const firstVaultId = firstVault?.id || '';
  const firstVaultSymbol = firstVault?.assetSymbol || 'USDC';

  const firstBalance = balances[0]?.data;
  const walletBalance = firstBalance ? parseFloat(firstBalance.underlyingBalance?.[0] ?? '0') : 0;

  const level = getPigLevel(totalInvested);
  const levelIndex = PIG_LEVELS.findIndex((item) => item.label === level.label);
  const currentLevel = levelIndex >= 0 ? PIG_LEVELS[levelIndex] : PIG_LEVELS[0];
  const nextLevel = levelIndex >= 0 ? PIG_LEVELS[levelIndex + 1] : undefined;
  const progress = nextLevel
    ? Math.min(1, Math.max(0, (totalInvested - currentLevel.minBalance) / (nextLevel.minBalance - currentLevel.minBalance)))
    : 1;
  const remaining = nextLevel ? Math.max(0, nextLevel.minBalance - totalInvested) : 0;
  const pigImage = currentLevel?.image ?? require('@/assets/images/pig_babe.png');

  const vaultsWithBalance: { vault: Vault; underlying: number; dfTokens: string }[] =
    useMemo(() => {
      if (!vaults) return [];
      return vaults
        .map((vault, i) => {
          const bal = balances[i]?.data;
          if (!bal) return null;
          return {
            vault,
            underlying: parseFloat(bal.underlyingBalance?.[0] ?? '0'),
            dfTokens: bal.dfTokens,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null && item.underlying > 0);
    }, [vaults, balances]);

  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [showDepositMethod, setShowDepositMethod] = useState(false);
  const [showWithdrawMethod, setShowWithdrawMethod] = useState(false);
  const [onrampOpen, setOnrampOpen] = useState(false);
  const [offrampOpen, setOfframpOpen] = useState(false);

  const [refreshing, setRefreshing] = useState(false);
  const [displayBalance, setDisplayBalance] = useState(0);
  const isAnimating = useRef(false);

  const { playClick, muted, toggleMute } = useSound();

  const [levelUpModalVisible, setLevelUpModalVisible] = useState(false);
  const [oldLevelForAnim, setOldLevelForAnim] = useState<any>(null);
  const [newLevelForAnim, setNewLevelForAnim] = useState<any>(null);
  const [levelDirection, setLevelDirection] = useState<'up' | 'down'>('up');

  useEffect(() => {
    if (!balancesReady || !walletAddress) return;

    if (!lastSeenPigLevel) {
      setLastSeenPigLevel(walletAddress, level.label);
      return;
    }

    if (lastSeenPigLevel === level.label) return;

    const oldIdx = PIG_LEVELS.findIndex((pigLevel) => pigLevel.label === lastSeenPigLevel);
    const newIdx = PIG_LEVELS.findIndex((pigLevel) => pigLevel.label === level.label);

    // Persist before opening the modal so remounting the screen cannot replay it.
    setLastSeenPigLevel(walletAddress, level.label);

    if (oldIdx < 0 || newIdx < 0) return;

    setOldLevelForAnim(PIG_LEVELS[oldIdx]);
    setNewLevelForAnim(PIG_LEVELS[newIdx]);
    setLevelDirection(newIdx > oldIdx ? 'up' : 'down');
    setLevelUpModalVisible(true);
  }, [
    balancesReady,
    lastSeenPigLevel,
    level.label,
    setLastSeenPigLevel,
    walletAddress,
  ]);

  useEffect(() => {
    const target = totalInvested;
    if (Math.abs(target - displayBalance) < 0.001 || isAnimating.current) return;
    isAnimating.current = true;
    const steps = 20;
    const increment = (target - displayBalance) / steps;
    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step >= steps) {
        setDisplayBalance(target);
        clearInterval(interval);
        isAnimating.current = false;
      } else {
        setDisplayBalance((prev) => prev + increment);
      }
    }, 30);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalInvested]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([refetchVaults(), refetchWallet()]);
    setRefreshing(false);
  }, [refetchVaults, refetchWallet]);

  const handleDepositSuccess = useCallback(() => { }, []);

  const balanceParts = displayBalance.toFixed(2).split('.');

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#fff"
            colors={['#fff']}
          />
        }
      >
        {/* ── Header gradient ── */}
        <LinearGradient
          colors={Gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <StarryBackground stars={18} nebulas={4} shootingStars={false} />

          <View style={styles.headerContent}>
            {/* Duas colunas: info (esq) + porquinho (dir) */}
            <View style={styles.headerMain}>
              <View style={styles.headerLeft}>
                <View style={styles.nameGroup}>
                  <View style={styles.greetingRow}>
                    <Text style={styles.greeting}>Oi, Investidor</Text>
                    <View style={styles.greetingSep} />
                    <Pressable onPress={() => { playClick(); toggleMute(); }} hitSlop={10} style={styles.volumeBtn}>
                      <MaterialIcons name={muted ? 'volume-off' : 'volume-up'} size={15} color="rgba(255,255,255,0.65)" />
                    </Pressable>
                  </View>
                  <Text style={styles.levelName} numberOfLines={1}>{level.label}</Text>
                </View>

                <View style={styles.progressSection}>
                  {nextLevel ? (
                    <View style={styles.progressLabelRow}>
                      <Text style={[styles.progressLabelText, { flex: 1 }]}>
                        {'Faltam '}
                        <Text style={styles.progressHighlight}>${remaining.toFixed(0)}</Text>
                        {' pra virar '}
                        <Text style={styles.progressNextLevel}>{nextLevel.label}</Text>
                      </Text>
                      <MaterialIcons name="workspace-premium" size={13} color="rgba(255,255,255,0.5)" />
                    </View>
                  ) : (
                    <Text style={styles.progressLabelText}>Nível máximo atingido</Text>
                  )}
                  <View style={styles.progressTrack}>
                    <LinearGradient
                      colors={[Accent.primary, '#7B52E8']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.progressFill, { width: `${progress * 100}%` }]}
                    />
                  </View>
                  <View style={styles.progressMetaRow}>
                    <Text style={styles.progressMetaText}>${totalInvested.toFixed(0)} investidos</Text>
                    <Text style={styles.progressMetaText}>
                      {nextLevel ? `meta $${nextLevel.minBalance}` : 'meta máxima'}
                    </Text>
                  </View>
                </View>
              </View>

              <PressableScale style={styles.pigArea} onPress={() => router.push('/pigs')}>
                <Image source={pigImage} style={styles.pigImage} />
              </PressableScale>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          {/* ── Card 1: Saldo ── */}
          <Card style={styles.balanceCard}>
            <Text style={styles.balanceLabelText}>Investido nos porquinhos</Text>

            <View style={styles.balanceValueWrap}>
              <View style={styles.balanceValueRow}>
                <Text style={styles.balanceValueText}>${balanceParts[0]}</Text>
                <Text style={styles.balanceValueDecimals}>.{balanceParts[1]}</Text>
              </View>
            </View>
          </Card>

          {/* ── Card 2: Carteira + Botões ── */}
          <Card style={styles.walletCard}>
            <View style={styles.walletRow}>
              <View style={styles.walletIconWrap}>
                <MaterialIcons name="account-balance-wallet" size={20} color="#7CC2FF" />
              </View>
              <View style={styles.walletTextWrap}>
                <Text style={styles.walletTitle}>Saldo na carteira</Text>
                <Text style={styles.walletSub}>parado, pronto pra investir</Text>
              </View>
              <Text style={styles.walletAmount}>${parsedWalletUsdc.toFixed(2)}</Text>
            </View>

            <View style={styles.walletDivider} />

            <View style={styles.actionRow}>
              <Pressable style={styles.actionBtnOuter} onPress={() => { playClick(); setShowDepositMethod(true); }}>
                <LinearGradient
                  colors={Gradients.hot}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.depositBtn}
                >
                  <MaterialIcons name="arrow-downward" size={15} color="#fff" />
                  <Text style={styles.depositBtnText} numberOfLines={1}>Depositar fundos</Text>
                </LinearGradient>
              </Pressable>

              <Pressable style={styles.actionBtnOuter} onPress={() => { playClick(); setShowWithdrawMethod(true); }}>
                <View style={styles.withdrawBtn}>
                  <MaterialIcons name="arrow-upward" size={15} color={Colors.foreground} />
                  <Text style={styles.withdrawBtnText} numberOfLines={1}>Sacar fundos</Text>
                </View>
              </Pressable>
            </View>
          </Card>

          {/* ── Meus Porquinhos ── */}
          {vaultsWithBalance.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Meus porquinhos</Text>
              <Card style={styles.vaultsCard}>
                {vaultsWithBalance.map(({ vault, underlying }, i) => (
                  <View key={vault.id}>
                    <ActiveVaultRow vault={vault} underlying={underlying} />
                    {i < vaultsWithBalance.length - 1 && <View style={styles.divider} />}
                  </View>
                ))}
              </Card>
            </>
          )}

          {vaultsWithBalance.length === 0 && vaults && vaults.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Meus porquinhos</Text>
              <Card style={styles.emptyCard}>
                <View style={styles.emptyTop}>
                  <Image
                    source={require('@/assets/images/pig_babe.png')}
                    style={styles.emptyPig}
                  />
                  <View style={styles.emptyTextBlock}>
                    <Text style={styles.emptyTitle}>Nenhum porquinho ainda</Text>
                    <Text style={styles.emptySubtitle}>Comece e veja seu dinheiro crescer</Text>
                  </View>
                </View>
                <PressableScale
                  onPress={() => { playClick(); router.push('/(tabs)/vaults'); }}
                  style={{ alignSelf: 'stretch' }}
                >
                  <LinearGradient
                    colors={Gradients.primary}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.emptyBtn}
                  >
                    <Text style={styles.emptyBtnText}>Investir no porquinho</Text>
                    <MaterialIcons name="arrow-forward" size={14} color="#fff" />
                  </LinearGradient>
                </PressableScale>
              </Card>
            </>
          )}
        </View>
      </ScrollView>

      <RampMethodSelector
        visible={showDepositMethod}
        type="deposit"
        onSelectStellar={() => { setShowDepositMethod(false); setDepositOpen(true); }}
        onSelectRamp={() => { setShowDepositMethod(false); setOnrampOpen(true); }}
        onClose={() => setShowDepositMethod(false)}
      />
      <RampMethodSelector
        visible={showWithdrawMethod}
        type="withdraw"
        onSelectStellar={() => { setShowWithdrawMethod(false); setWithdrawOpen(true); }}
        onSelectRamp={() => { setShowWithdrawMethod(false); setOfframpOpen(true); }}
        onClose={() => setShowWithdrawMethod(false)}
      />
      <DepositModal
        visible={depositOpen}
        vaultId={firstVaultId}
        assetSymbol={firstVaultSymbol}
        onClose={() => setDepositOpen(false)}
        onSuccess={handleDepositSuccess}
      />
      <WithdrawModal
        visible={withdrawOpen}
        vaultId={firstVaultId}
        dfTokens="0"
        underlyingBalance={String(walletBalance)}
        assetSymbol={firstVaultSymbol}
        onClose={() => setWithdrawOpen(false)}
      />
      <EtherfuseOnrampModal visible={onrampOpen} onClose={() => setOnrampOpen(false)} />
      <EtherfuseOfframpModal visible={offrampOpen} maxAmount={walletBalance} onClose={() => setOfframpOpen(false)} />
      <LevelUpAnimation
        visible={levelUpModalVisible}
        oldLevel={oldLevelForAnim}
        newLevel={newLevelForAnim}
        direction={levelDirection}
        onClose={() => setLevelUpModalVisible(false)}
        onDeposit={() => setDepositOpen(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },

  // ── Header ──
  header: {
    paddingTop: 52,
    paddingBottom: 0,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  headerContent: {
    paddingHorizontal: 20,
  },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  streakText: { color: Accent.accent, fontFamily: Font.black, fontSize: FontSize.label },
  volumeBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerMain: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  nameGroup: {
    gap: 8,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  greetingSep: {
    width: 1,
    height: 11,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  headerLeft: {
    flex: 1,
    gap: 14,
    paddingTop: 6,
    paddingBottom: 20,
    paddingRight: 10,
  },
  greeting: {
    fontSize: FontSize.bodySmall,
    color: 'rgba(255,255,255,0.6)',
    fontFamily: Font.semiBold,
  },
  levelName: {
    fontSize: 20,
    fontFamily: Font.black,
    color: '#fff',
    lineHeight: 24,
  },
  progressSection: {
    gap: 8,
  },
  progressLabelRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  progressLabelText: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.semiBold,
    color: 'rgba(255,255,255,0.85)',
  },
  progressNextLevel: {
    fontFamily: Font.black,
    color: '#fff',
  },
  progressHighlight: {
    color: '#FFD98E',
    fontFamily: Font.black,
  },
  pigArea: {
    width: 170,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginRight: -20,
  },
  pigImage: {
    width: 170,
    height: 200,
    resizeMode: 'contain',
  },
  progressTrack: {
    height: 9,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(0,0,0,0.3)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Radius.full,
  },
  progressMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressMetaText: {
    fontSize: FontSize.label,
    fontFamily: Font.semiBold,
    color: 'rgba(255,255,255,0.75)',
  },

  // ── Content ──
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 120,
  },

  // ── Balance Card ──
  balanceCard: {
    marginBottom: 14,
    paddingVertical: 22,
    paddingHorizontal: 20,
    borderRadius: 18,
    gap: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  balanceLabelText: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
    textAlign: 'center',
  },
  balanceValueWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  balanceValueText: {
    fontSize: 52,
    fontFamily: Font.extraBold,
    color: Colors.foreground,
    lineHeight: 58,
  },
  balanceValueDecimals: {
    fontSize: 24,
    fontFamily: Font.bold,
    color: Colors.foreground,
    marginLeft: 2,
    marginBottom: 7,
  },

  // ── Wallet Card ──
  walletCard: {
    marginBottom: 22,
    paddingVertical: 0,
    paddingHorizontal: 0,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 0,
  },
  walletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  walletIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: 'rgba(59,130,246,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  walletTextWrap: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  walletTitle: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.bold,
    color: Colors.foreground,
  },
  walletSub: {
    fontSize: FontSize.label,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
  },
  walletAmount: {
    fontSize: FontSize.body,
    fontFamily: Font.extraBold,
    color: Colors.foreground,
    flexShrink: 0,
  },
  walletDivider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
  },
  actionBtnOuter: {
    flex: 1,
  },
  depositBtn: {
    borderRadius: Radius.sm,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  depositBtnText: {
    color: '#fff',
    fontFamily: Font.bold,
    fontSize: FontSize.bodySmall,
  },
  withdrawBtn: {
    borderRadius: Radius.sm,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  withdrawBtnText: {
    color: Colors.foreground,
    fontFamily: Font.bold,
    fontSize: FontSize.bodySmall,
  },

  // ── Meus Porquinhos ──
  sectionTitle: {
    fontSize: FontSize.subheading,
    fontFamily: Font.extraBold,
    color: Colors.foreground,
    marginBottom: 12,
  },
  vaultsCard: {
    padding: 0,
    overflow: 'hidden',
  },
  activeVaultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  activeVaultPigWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  activeVaultPig: {
    width: 34,
    height: 34,
    resizeMode: 'contain',
  },
  activeVaultInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  activeVaultName: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.bold,
    color: Colors.foreground,
  },
  activeVaultAsset: {
    fontSize: FontSize.label,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
  },
  activeVaultApyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(16,185,129,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.20)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    alignSelf: 'flex-start',
    marginTop: 3,
  },
  activeVaultApyText: {
    color: Accent.success,
    fontFamily: Font.bold,
    fontSize: 10,
  },
  investBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    flexShrink: 0,
  },
  investBtnText: {
    color: '#fff',
    fontFamily: Font.extraBold,
    fontSize: FontSize.bodySmall,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 14,
  },
  emptyCard: {
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  emptyTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emptyPig: {
    width: 54,
    height: 54,
    resizeMode: 'contain',
    opacity: 0.7,
    flexShrink: 0,
  },
  emptyTextBlock: {
    flex: 1,
    gap: 3,
  },
  emptyTitle: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.bold,
    color: Colors.foreground,
  },
  emptySubtitle: {
    fontSize: FontSize.label,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
  },
  emptyBtn: {
    height: 44,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emptyBtnText: {
    color: '#fff',
    fontFamily: Font.extraBold,
    fontSize: FontSize.bodySmall,
  },
});
