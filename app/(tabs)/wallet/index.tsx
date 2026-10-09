import { useEffect, useState } from 'react';
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
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { V2Colors, V2Font, V2Layout, V2Radius } from '@/constants/theme-v2';
import { useAccent } from '@/hooks/use-accent';
import { useTerms } from '@/hooks/use-terms';
import { usePixRampGate } from '@/hooks/use-pix-ramp-gate';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useUsdcPrice, useWalletAssets } from '@/lib/queries/wallets.queries';
import { isMainnetNetwork } from '@/lib/stellar/config';
import { ActionKey3D, ListCard, ScreenGlow, V2Icon } from '@/components/v2';
import { WalletBalanceCard } from '@/components/wallet/WalletBalanceCard';
import { WalletAssetRow } from '@/components/wallet/WalletAssetRow';
import { SwapSoonSheet } from '@/components/wallet/SwapSoonSheet';
import { BlindPayOnrampModal, BlindPayOfframpModal, TransferModal } from '@/components/ui';

type PixAction = 'deposit' | 'withdraw';

export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const accent = useAccent();
  const { t, isPro } = useTerms();
  const isFocused = useIsFocused();
  const walletAddress = useAuthStore((s) => s.walletAddress);

  const assetsQuery = useWalletAssets(walletAddress);
  const assets = assetsQuery.data?.assets ?? [];
  const hasEurc = assets.some((a) => a.id === 'EURC');
  const xlmPrice = useUsdcPrice('XLM');
  const eurcPrice = useUsdcPrice('EURC', hasEurc);
  const prices = { USDC: 1, XLM: xlmPrice.data, EURC: eurcPrice.data };

  const usdcBalance = parseFloat(assets.find((a) => a.id === 'USDC')?.balance ?? '0') || 0;

  // Pro: soma de tudo que tem cotação. Ativo sem cotação fica fora do total —
  // por isso o valor é marcado como estimativa.
  const totalUsd = assets.reduce((sum, asset) => {
    const price = prices[asset.id];
    const amount = parseFloat(asset.balance);
    return price != null && Number.isFinite(amount) ? sum + amount * price : sum;
  }, 0);

  const [onrampOpen, setOnrampOpen] = useState(false);
  const [offrampOpen, setOfframpOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [swapSheetOpen, setSwapSheetOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Depositar e Sacar via Pix passam pelo mesmo crivo de cadastro/KYC do
  // seletor da Home. Um toque antes de as consultas terminarem fica guardado e
  // é executado assim que elas chegam, em vez de ser ignorado.
  const pixGate = usePixRampGate(isFocused);
  const [pendingPix, setPendingPix] = useState<PixAction | null>(null);

  function openPix(action: PixAction) {
    const open = action === 'deposit' ? () => setOnrampOpen(true) : () => setOfframpOpen(true);
    if (!pixGate.proceed(open)) setPendingPix(action);
  }

  useEffect(() => {
    if (!pendingPix || pixGate.isLoading) return;
    const action = pendingPix;
    setPendingPix(null);
    openPix(action);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPix, pixGate.isLoading]);

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.allSettled([assetsQuery.refetch(), xlmPrice.refetch(), eurcPrice.refetch()]);
    setRefreshing(false);
  }

  const showLoading = !assetsQuery.data && (assetsQuery.isLoading || !walletAddress);
  const showError = !assetsQuery.data && assetsQuery.isError;

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
        <View style={styles.titleRow}>
          <Text style={styles.title}>Carteira</Text>
          {isPro && (
            <View style={styles.networkChip}>
              <Text style={styles.networkText}>
                {isMainnetNetwork() ? 'Stellar' : 'Stellar Testnet'}
              </Text>
            </View>
          )}
        </View>

        {showLoading ? (
          <View style={styles.state}>
            <ActivityIndicator color={accent.base} />
          </View>
        ) : showError ? (
          <View style={styles.state}>
            <Text style={styles.stateText}>Não foi possível carregar a carteira.</Text>
            <Pressable onPress={() => assetsQuery.refetch()} accessibilityRole="button" hitSlop={8}>
              <Text style={[styles.stateAction, { color: accent.base }]}>Tentar novamente</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <WalletBalanceCard
              amountUsd={isPro ? totalUsd : usdcBalance}
              estimated={assets.some((a) => a.id !== 'USDC' && parseFloat(a.balance) > 0)}
              address={walletAddress}
            />

            <View style={styles.actions}>
              <ActionKey3D
                icon="plus"
                label="Depositar"
                variant="primary"
                onPress={() => openPix('deposit')}
                accessibilityHint="Depositar via Pix"
              />
              <ActionKey3D
                icon="arrow-up"
                label="Sacar"
                onPress={() => openPix('withdraw')}
                accessibilityHint="Sacar via Pix"
              />
              <ActionKey3D
                icon="refresh-cw"
                label={t('carteira.action.swap')}
                locked
                onPress={() => setSwapSheetOpen(true)}
                accessibilityHint="Em breve"
              />
              <ActionKey3D
                icon="send"
                label={t('carteira.action.send')}
                onPress={() => setTransferOpen(true)}
              />
            </View>

            <View style={styles.assetsSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t('carteira.assets.title')}</Text>
                <Pressable
                  onPress={() => router.push('/(tabs)/wallet/history')}
                  style={styles.historyLink}
                  accessibilityRole="link"
                  hitSlop={8}
                >
                  <V2Icon name="history" size={15} color={accent.base} />
                  <Text style={[styles.historyText, { color: accent.base }]}>Ver histórico</Text>
                  <V2Icon name="chevron-right" size={15} color={accent.base} />
                </Pressable>
              </View>

              <ListCard>
                {assets.map((asset) => (
                  <WalletAssetRow key={asset.id} asset={asset} usdPrice={prices[asset.id]} />
                ))}
              </ListCard>
            </View>
          </>
        )}
      </ScrollView>

      {/* Modais de operação: ainda no visual V1, abertos daqui. */}
      <BlindPayOnrampModal visible={onrampOpen} onClose={() => setOnrampOpen(false)} />
      <BlindPayOfframpModal
        visible={offrampOpen}
        maxAmount={usdcBalance}
        onClose={() => setOfframpOpen(false)}
      />
      <TransferModal visible={transferOpen} onClose={() => setTransferOpen(false)} />
      <SwapSoonSheet visible={swapSheetOpen} onClose={() => setSwapSheetOpen(false)} />
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
    gap: V2Layout.sectionGap,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    flex: 1,
    fontFamily: V2Font.black,
    fontSize: 28,
    letterSpacing: -0.84,
    color: V2Colors.text,
  },
  networkChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: V2Radius.full,
    borderWidth: 1,
    borderColor: V2Colors.chipBorder,
    backgroundColor: V2Colors.chip,
  },
  networkText: {
    fontFamily: V2Font.bold,
    fontSize: 11.5,
    color: V2Colors.textSecondary,
  },
  state: {
    minHeight: 420,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  stateText: {
    fontFamily: V2Font.medium,
    fontSize: 14,
    color: V2Colors.textSecondary,
  },
  stateAction: {
    fontFamily: V2Font.extraBold,
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  assetsSection: {
    paddingTop: 6,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontFamily: V2Font.black,
    fontSize: 17,
    letterSpacing: -0.34,
    color: V2Colors.text,
  },
  historyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  historyText: {
    fontFamily: V2Font.extraBold,
    fontSize: 13,
  },
});
