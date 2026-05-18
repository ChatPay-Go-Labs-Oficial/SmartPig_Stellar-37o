import { Badge, Button, Card, DepositModal, StarryBackground, WithdrawModal, getPigLevel } from '@/components/ui';
import { Accent, Colors, Font, FontSize, Gradients, Radius } from '@/constants/theme';
import type { Vault } from '@/lib/api/vaults';
import { useUsdcBalance } from '@/lib/queries/balances.queries';
import { useDeposits } from '@/lib/queries/deposits.queries';
import { useVaults } from '@/lib/queries/vaults.queries';
import { useWalletStore } from '@/lib/stores/wallet.store';
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
  const walletAddress = useWalletStore((s) => s.walletAddress);
  const { data: vaults } = useVaults();
  const { data: deposits } = useDeposits();
  const { data: usdcBalance = 0 } = useUsdcBalance(walletAddress);

  const confirmedDeposits = deposits?.filter((d) => d.status === 'CONFIRMED') ?? [];
  const activeVaultIds = [...new Set(confirmedDeposits.map((d) => d.vaultId))];
  const activeVaults = vaults?.filter((v) => activeVaultIds.includes(v.id)) ?? [];

  const dailyYield = usdcBalance * 0.0587 / 365;
  const level = getPigLevel(usdcBalance);

  const [displayBalance, setDisplayBalance] = useState(usdcBalance);
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const firstVaultId = activeVaults[0]?.id || '';

  const handleDepositSuccess = useCallback(() => {
    // refetch data
  }, []);
  const isAnimating = useRef(false);

  useEffect(() => {
    const target = usdcBalance;
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
  }, [usdcBalance]);

  return (
    <View style={styles.screen}>
      {/* Gradient header */}
      <LinearGradient
        colors={Gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <StarryBackground stars={18} nebulas={4} shootingStars={false} />

        <View style={styles.headerContent}>
          {/* Top row */}
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

          {/* Pig illustration */}
          <View style={styles.pigArea}>
            <Image source={require('@/assets/images/pig_babe.png')} style={styles.pigImage} />
          </View>
          <Text style={styles.pigLabel}>{level.label}</Text>

          {/* Balance */}
          <View style={styles.balanceSection}>
            <Text style={styles.balanceLabel}>Saldo Total</Text>
            <Text style={styles.balanceValue}>
              $ {displayBalance.toFixed(2)}
            </Text>
            <View style={styles.yieldRow}>
              <Text style={styles.yieldIcon}>📈</Text>
              <Text style={styles.yieldText}>
                +5.87% ao ano • +R$ {dailyYield.toFixed(4)}/dia
              </Text>
            </View>
            <Text style={styles.stellarTag}>Rendendo via Stellar ⚡</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Content */}
      <View style={styles.content}>
        {/* Action buttons */}
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

        {/* Yield card */}
        <Card style={styles.yieldCard}>
          <Text style={styles.yieldCardTitle}>
            📊 Como seu dinheiro rende
          </Text>
          <View style={styles.yieldStats}>
            {[
              { label: 'Rendimento hoje', value: `+R$ ${dailyYield.toFixed(4)}`, color: Accent.success },
              { label: 'Rendimento/mês', value: `+R$ ${(dailyYield * 30).toFixed(2)}`, color: Accent.success },
              { label: 'Rendimento anual', value: '5.87%', color: Accent.primary },
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

        {/* Tip banner */}
        <View style={styles.tipBanner}>
          <Text style={styles.tipText}>
            🔥 <Text style={styles.tipHighlight}>Dica:</Text> Ative o Pix Automático e poupe sem esforço!
          </Text>
        </View>

        {/* Active vaults */}
        {activeVaults.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Seus Vaults</Text>
            <Card style={styles.vaultsCard}>
              {activeVaults.map((v, i) => (
                <View key={v.id}>
                  <ActiveVaultRow vault={v} />
                  {i < activeVaults.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </Card>
          </>
        )}
      </View>

      <DepositModal
        visible={depositOpen}
        vaultId={firstVaultId}
        onClose={() => setDepositOpen(false)}
        onSuccess={handleDepositSuccess}
      />
      <WithdrawModal
        visible={withdrawOpen}
        vaultId={firstVaultId}
        balance={String(usdcBalance)}
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
    alignItems: 'center'
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
  tipBanner: {
    backgroundColor: 'hsla(320, 90%, 58%, 0.1)',
    borderWidth: 1,
    borderColor: 'hsla(320, 90%, 58%, 0.2)',
    borderRadius: Radius.lg,
    padding: 12,
    marginBottom: 20,
  },
  tipText: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.bold,
    color: Colors.foreground,
  },
  tipHighlight: {
    fontFamily: Font.black,
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
});
