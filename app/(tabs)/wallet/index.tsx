import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { V2Colors, V2Font, V2Layout, V2Radius } from '@/constants/theme-v2';
import { useAccent } from '@/hooks/use-accent';
import { useTerms } from '@/hooks/use-terms';
import { usePixRampGate } from '@/hooks/use-pix-ramp-gate';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { useAuthStore } from '@/lib/stores/auth.store';
import { usePortfolioSummary } from '@/lib/queries/portfolio.queries';
import { useVaults } from '@/lib/queries/vaults.queries';
import { useUsdcPrice, useWalletAssets } from '@/lib/queries/wallets.queries';
import { usePrefetchHistory } from '@/lib/queries/history.queries';
import { isMainnetNetwork } from '@/lib/stellar/config';
import { ActionKey3D, ListCard, ScreenGlow, SegmentedControl, V2Icon } from '@/components/v2';
import { WalletBalanceCard } from '@/components/wallet/WalletBalanceCard';
import { WalletAssetRow } from '@/components/wallet/WalletAssetRow';
import { WalletPiggyList } from '@/components/wallet/WalletPiggyList';
import { SwapSheet } from '@/components/wallet/SwapSheet';
import { SwapSoonSheet } from '@/components/wallet/SwapSoonSheet';
import { BlindPayOnrampModal, BlindPayOfframpModal, TransferModal } from '@/components/ui';

type PixAction = 'deposit' | 'withdraw';
type WalletSegment = 'coins' | 'piggies';

/**
 * Layout que depende da largura e da escala de fonte do aparelho (larguras de
 * texto medidas com a Inter):
 * - o chip "Histórico" vira só ícone quando ele e o seletor não cabem juntos;
 * - os rótulos das teclas têm um teto de escala comum, para não quebrarem no
 *   meio da palavra nem ficarem de tamanhos diferentes.
 */
function useWalletLayout() {
  const { width, fontScale } = useWindowDimensions();
  const column = Math.min(width, V2Layout.maxWidth);
  const scale = Math.min(fontScale, 1.3);
  // seletor + chip ≈ 110 + 178·escala, mais o gap e as margens
  const compactHistory = column < 2 * V2Layout.gutter + 8 + 110 + 178 * scale;
  // 4 colunas de tecla; 64 ≈ largura de "Transferir" na escala 1
  const keySlot = Math.min(88, (column - 2 * V2Layout.gutter - 30) / 4);
  const keyLabelScale = Math.min(1.3, Math.max(1, keySlot / 64));
  return { compactHistory, keyLabelScale };
}

export default function WalletScreen() {
  const screenInsets = useScreenInsets();
  const { compactHistory, keyLabelScale } = useWalletLayout();
  const accent = useAccent();
  const { t, isPro } = useTerms();
  const isFocused = useIsFocused();
  const walletAddress = useAuthStore((s) => s.walletAddress);
  const walletAccountId = useAuthStore((s) => s.walletAccountId);

  const assetsQuery = useWalletAssets(walletAddress);
  const portfolioQuery = usePortfolioSummary(!!walletAddress);
  const vaultsQuery = useVaults();
  const [segment, setSegment] = useState<WalletSegment>('coins');
  const assets = assetsQuery.data?.assets ?? [];
  const hasEurc = assets.some((a) => a.id === 'EURC');
  const xlmPrice = useUsdcPrice('XLM');
  const eurcPrice = useUsdcPrice('EURC', hasEurc);
  const prices = { USDC: 1, XLM: xlmPrice.data, EURC: eurcPrice.data };

  const usdcBalance = parseFloat(assets.find((a) => a.id === 'USDC')?.balance ?? '0') || 0;

  const hasUnpricedBalance = assets.some((asset) => {
    const amount = parseFloat(asset.balance);
    return Number.isFinite(amount) && amount > 0 && prices[asset.id] == null;
  });
  const totalUsd = hasUnpricedBalance ? null : assets.reduce((sum, asset) => {
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

  // Callbacks estáveis: as teclas são memoizadas, e abrir um modal (setState
  // aqui) não deve re-renderizar as quatro a cada toque.
  const openPixRef = useRef(openPix);
  openPixRef.current = openPix;
  const handleDeposit = useCallback(() => openPixRef.current('deposit'), []);
  const handleWithdraw = useCallback(() => openPixRef.current('withdraw'), []);
  const handleSwap = useCallback(() => setSwapSheetOpen(true), []);
  const handleSend = useCallback(() => setTransferOpen(true), []);
  const handleHistory = useCallback(() => router.push('/(tabs)/wallet/history'), []);
  const refetchPortfolio = portfolioQuery.refetch;
  const refetchVaults = vaultsQuery.refetch;
  const retryPiggies = useCallback(() => {
    refetchPortfolio();
    refetchVaults();
  }, [refetchPortfolio, refetchVaults]);

  usePrefetchHistory(isFocused);

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.allSettled([
      assetsQuery.refetch(),
      portfolioQuery.refetch(),
      vaultsQuery.refetch(),
      xlmPrice.refetch(),
      eurcPrice.refetch(),
    ]);
    setRefreshing(false);
  }

  const showLoading = !assetsQuery.data && (assetsQuery.isLoading || !walletAddress);
  const showError = !assetsQuery.data && assetsQuery.isError;

  return (
    <View style={styles.screen}>
      <ScreenGlow />

      {/* A rolagem começa abaixo da barra de status: o conteúdo não passa por
          baixo dos ícones dela, e o "puxar para atualizar" não cai na câmera. */}
      <ScrollView
        style={{ marginTop: screenInsets.top }}
        contentContainerStyle={[
          styles.content,
          { paddingTop: screenInsets.topGap, paddingBottom: screenInsets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={accent.base}
            colors={[accent.base]}
            progressBackgroundColor={V2Colors.sheetTop}
          />
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
              amountUsd={totalUsd}
              estimated={assets.some((a) => a.id !== 'USDC' && parseFloat(a.balance) > 0)}
              address={walletAddress}
            />

            <View style={styles.actions}>
              <ActionKey3D
                icon="plus"
                label="Depositar"
                variant="primary"
                labelMaxScale={keyLabelScale}
                onPress={handleDeposit}
                accessibilityHint="Depositar via Pix"
              />
              <ActionKey3D
                icon="arrow-up"
                label="Sacar"
                labelMaxScale={keyLabelScale}
                onPress={handleWithdraw}
                accessibilityHint="Sacar via Pix"
              />
              <ActionKey3D
                icon="refresh-cw"
                label={t('carteira.action.swap')}
                locked={!isPro}
                labelMaxScale={keyLabelScale}
                onPress={handleSwap}
                accessibilityHint={isPro ? 'Trocar ativos da carteira' : 'Em breve'}
              />
              <ActionKey3D
                icon="send"
                label={t('carteira.action.send')}
                labelMaxScale={keyLabelScale}
                onPress={handleSend}
              />
            </View>

            <View style={styles.assetsSection}>
              <View style={styles.sectionHeader}>
                <View style={styles.segmentSlot}>
                  <SegmentedControl
                    options={[
                      { id: 'coins', label: t('carteira.segment.coins') },
                      { id: 'piggies', label: t('carteira.segment.piggies') },
                    ]}
                    value={segment}
                    onChange={setSegment}
                  />
                </View>
                <Pressable
                  onPress={handleHistory}
                  style={({ pressed }) => [
                    styles.historyChip,
                    compactHistory && styles.historyChipCompact,
                    pressed && styles.historyChipPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Ver histórico"
                  hitSlop={8}
                >
                  <V2Icon name="history" size={compactHistory ? 16 : 14} color={accent.base} />
                  {!compactHistory && (
                    <Text style={styles.historyText} numberOfLines={1}>Histórico</Text>
                  )}
                </Pressable>
              </View>

              {segment === 'coins' ? (
                <ListCard>
                  {assets.map((asset) => (
                    <WalletAssetRow key={asset.id} asset={asset} usdPrice={prices[asset.id]} />
                  ))}
                </ListCard>
              ) : (
                <WalletPiggyList
                  vaults={vaultsQuery.data}
                  summary={portfolioQuery.data}
                  isLoading={portfolioQuery.isLoading || vaultsQuery.isLoading}
                  isError={portfolioQuery.isError || vaultsQuery.isError}
                  onRetry={retryPiggies}
                />
              )}
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
      {isPro ? (
        <SwapSheet
          visible={swapSheetOpen}
          assets={assets}
          walletAddress={walletAddress}
          walletAccountId={walletAccountId}
          onClose={() => setSwapSheetOpen(false)}
        />
      ) : (
        <SwapSoonSheet visible={swapSheetOpen} onClose={() => setSwapSheetOpen(false)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: V2Colors.background,
  },
  // Coluna com largura máxima: em dobráveis e tablets o conteúdo não estica.
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: V2Layout.maxWidth,
    alignSelf: 'center',
    paddingHorizontal: V2Layout.gutter,
    gap: V2Layout.sectionGap,
  },
  titleRow: {
    minHeight: V2Layout.headerHeight,
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
    flex: 1,
    minHeight: 280,
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
    justifyContent: 'center',
    gap: 10,
  },
  assetsSection: {
    paddingTop: 6,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 4,
    paddingBottom: 12,
  },
  segmentSlot: {
    flexShrink: 1,
  },
  // Figma "ver histórico": pílula neutra com ícone no destaque.
  historyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 10,
    paddingRight: 12,
    paddingVertical: 6,
    borderRadius: V2Radius.full,
    borderWidth: 1,
    borderColor: V2Colors.surfaceBorderStrong,
    backgroundColor: V2Colors.chip,
  },
  historyChipCompact: {
    width: 36,
    height: 36,
    paddingLeft: 0,
    paddingRight: 0,
    paddingVertical: 0,
    justifyContent: 'center',
  },
  historyChipPressed: {
    opacity: 0.7,
  },
  historyText: {
    fontFamily: V2Font.semiBold,
    fontSize: 12.5,
    color: V2Colors.text,
  },
});
