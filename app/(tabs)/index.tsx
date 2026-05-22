import { Badge, Button, Card, DepositModal, StarryBackground, WithdrawModal, getPigLevel } from '@/components/ui';
import { Accent, Colors, Font, FontSize, Gradients, Radius, Spacing } from '@/constants/theme';
import type { Vault } from '@/lib/api/vaults';
import { useVaults } from '@/lib/queries/vaults.queries';
import { usePrivy } from '@privy-io/expo';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

function ActiveVaultRow({ vault }: { vault: Vault }) {
  return (
    <Pressable onPress={() => router.push(`/vault/${vault.id}`)} style={styles.activeVaultRow}>
      <View style={styles.activeVaultInfo}>
        <Text style={styles.activeVaultName}>{vault.name}</Text>
        <Text style={styles.activeVaultAsset}>{vault.assetSymbol}</Text>
      </View>
      <Badge label={vault.apy ? `${parseFloat(vault.apy).toFixed(2)}%` : '—'} variant="sucesso" />
    </Pressable>
  );
}

export default function HomeScreen() {
  const { data: vaults } = useVaults();
  const { user } = usePrivy();
  const walletAddress = (user?.linked_accounts as any[])?.find(
    (account) => account.chain_type === 'stellar' && account.address,
  )?.address ?? null;

  const totalInvested = 0;
  const displayApy = 0;
  const dailyYield = 0;
  const walletBalance = 0;
  const level = getPigLevel(0);

  const vaultsWithBalance: { vault: Vault; underlying: number; dfTokens: string }[] = [];

  const [displayBalance, setDisplayBalance] = useState(totalInvested);
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const firstVault = vaults?.[0];
  const firstVaultId = firstVault?.id || '';
  const firstVaultSymbol = firstVault?.assetSymbol || 'USDC';

  const isAnimating = useRef(false);

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

  const handleDepositSuccess = useCallback(() => { }, []);

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={Gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <StarryBackground stars={18} nebulas={4} shootingStars={false} />

        <View style={styles.headerContent}>
          <View style={styles.topRow}>
            <View>
              <Text style={styles.greetingLabel}>Olá,</Text>
              <Text style={styles.greetingName}>Investidor 👋</Text>
            </View>
            <View style={styles.topRight}>
              <View style={styles.streakBadge}>
                <Text style={styles.streakIcon}>🔥</Text>
                <Text style={styles.streakText}>7</Text>
              </View>
            </View>
          </View>

          <View style={styles.pigArea}>
            <Image source={require('@/assets/images/pig_babe.png')} style={styles.pigImage} />
          </View>
          <Text style={styles.pigLabel}>{level.label}</Text>

          <View style={styles.balanceSection}>
            <Text style={styles.balanceLabel}>Total Investido</Text>
            <Text style={styles.balanceValue}>
              $ {displayBalance.toFixed(2)}
            </Text>
            <Text style={styles.walletSubText}>
              {walletAddress
                ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}`
                : 'Carteira não conectada'}
            </Text>
            <View style={styles.yieldRow}>
              <Text style={styles.yieldIcon}>📈</Text>
              <Text style={styles.yieldText}>
                +{displayApy.toFixed(2)}% ao ano • +$ {dailyYield.toFixed(4)}/dia
              </Text>
            </View>
            <Text style={styles.stellarTag}>Rendendo via Stellar ⚡</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.actionRow}>
          <View style={styles.actionBtnWrapper}>
            <Button
              label="Depositar"
              variant="primary"
              size="lg"
              fullWidth
              onPress={() => setDepositOpen(true)}
            />
          </View>
          <View style={styles.actionBtnWrapper}>
            <Button
              label="Sacar"
              variant="secondary"
              size="lg"
              fullWidth
              onPress={() => setWithdrawOpen(true)}
            />
          </View>
          <Pressable
            onPress={() => router.push('/education')}
            style={styles.educationBtn}
          >
            <LinearGradient
              colors={Gradients.gold}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.educationBtnInner}
            >
              <Text style={styles.educationIcon}>🎓</Text>
            </LinearGradient>
          </Pressable>
        </View>

        <Card style={styles.yieldCard}>
          <Text style={styles.yieldCardTitle}>
            📊 Como seu dinheiro rende
          </Text>
          <View style={styles.yieldStats}>
            {[
              { label: 'Rendimento hoje', value: `+$ ${dailyYield.toFixed(4)}`, color: Accent.success },
              { label: 'Rendimento/mês', value: `+$ 0.00`, color: Accent.success },
              { label: 'APY médio', value: `${displayApy.toFixed(2)}%`, color: Accent.primary },
              { label: 'Protocolo', value: 'Stellar/DeFindex', color: Accent.primary },
            ].map((item) => (
              <View key={item.label} style={styles.yieldStatRow}>
                <Text style={styles.yieldStatLabel}>{item.label}</Text>
                <Text style={[styles.yieldStatValue, { color: item.color }]}>{item.value}</Text>
              </View>
            ))}
          </View>
          <View style={styles.yieldFooter}>
            <Text style={styles.yieldFooterIcon}>⚡</Text>
            <Text style={styles.yieldFooterText}>
              Rede Stellar — transações em &lt; 1s
            </Text>
          </View>
        </Card>

        {vaultsWithBalance.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Meus Cofrinhos</Text>
            <Card style={styles.vaultsCard}>
              {vaultsWithBalance.map(({ vault }, i) => (
                <View key={vault.id}>
                  <ActiveVaultRow vault={vault} />
                  {i < vaultsWithBalance.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </Card>
          </>
        )}
        {vaultsWithBalance.length === 0 && vaults && vaults.length > 0 && (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>Escolha um vault para começar a investir.</Text>
            <Pressable onPress={() => router.push('/(tabs)/vaults')}>
              <Text style={styles.emptyLink}>Explorar vaults →</Text>
            </Pressable>
          </Card>
        )}
      </View>

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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingTop: 56,
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  pigImage: {
    width: 150,
    height: 150,
    resizeMode: 'contain',
  },
  headerContent: {
    paddingHorizontal: 20,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  greetingLabel: {
    fontSize: FontSize.bodySmall,
    color: 'rgba(255,255,255,0.8)',
    fontFamily: Font.regular,
  },
  greetingName: {
    fontSize: FontSize.subheading,
    color: '#fff',
    fontFamily: Font.black,
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  streakIcon: {
    fontSize: 14,
  },
  streakText: {
    color: Accent.accent,
    fontFamily: Font.black,
    fontSize: FontSize.label,
  },
  pigArea: {
    alignItems: 'center',
    marginTop: -30
  },
  pigLabel: {
    textAlign: 'center',
    color: '#fff',
    fontFamily: Font.black,
    fontSize: FontSize.body,
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  balanceSection: {
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: FontSize.label,
    color: 'rgba(255,255,255,0.8)',
    fontFamily: Font.black,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: 32,
    color: '#fff',
    fontFamily: Font.black,
    textShadowColor: 'hsla(210, 100%, 70%, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 30,
  },
  yieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  yieldIcon: {
    fontSize: 13,
  },
  yieldText: {
    fontSize: FontSize.label,
    color: Accent.success,
    fontFamily: Font.black,
  },
  walletSubText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    fontFamily: Font.semiBold,
    marginBottom: 2,
  },
  stellarTag: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    fontFamily: Font.semiBold,
    marginTop: 2,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  actionBtnWrapper: {
    flex: 1,
  },
  educationBtn: {
    width: 56,
    height: 56,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  educationBtnInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  educationIcon: {
    fontSize: 22,
  },
  yieldCard: {
    marginBottom: 12,
    gap: 12,
  },
  yieldCardTitle: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.black,
    color: Colors.foreground,
  },
  yieldStats: {
    gap: 8,
  },
  yieldStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  yieldStatLabel: {
    fontSize: FontSize.bodySmall,
    color: Colors.mutedForeground,
    fontFamily: Font.semiBold,
  },
  yieldStatValue: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.black,
  },
  yieldFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 10,
  },
  yieldFooterIcon: {
    fontSize: 14,
  },
  yieldFooterText: {
    fontSize: FontSize.label,
    color: Colors.mutedForeground,
    fontFamily: Font.semiBold,
  },
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  activeVaultInfo: {
    gap: 2,
  },
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
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 16,
  },
  emptyCard: { gap: Spacing[2], alignItems: 'flex-start' as const },
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
