import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { router, useLocalSearchParams } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { V2Colors, V2Font, V2Layout, V2Radius } from '@/constants/theme-v2';
import { useAccent } from '@/hooks/use-accent';
import { useTerms } from '@/hooks/use-terms';
import { usePixRampGate } from '@/hooks/use-pix-ramp-gate';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { useAuthStore } from '@/lib/stores/auth.store';
import { usePortfolioSummary } from '@/lib/queries/portfolio.queries';
import { useVaults } from '@/lib/queries/vaults.queries';
import { useWalletTotal } from '@/hooks/use-wallet-total';
import { usePrefetchHistory } from '@/lib/queries/history.queries';
import { isMainnetNetwork } from '@/lib/stellar/config';
import { ActionKey3D, ListCard, NavChip, ScreenGlow, SegmentedControl } from '@/components/v2';
import { WalletBalanceCard } from '@/components/wallet/WalletBalanceCard';
import { WalletAssetRow } from '@/components/wallet/WalletAssetRow';
import { WalletPiggyList } from '@/components/wallet/WalletPiggyList';
import { SwapSheet } from '@/components/wallet/SwapSheet';
import { SwapSoonSheet } from '@/components/wallet/SwapSoonSheet';
import { MyGiftsSheet } from '@/components/wallet/MyGiftsSheet';
import { BlindPayOnrampModal, BlindPayOfframpModal, TransferModal } from '@/components/ui';
import { GiftSendSheet } from '@/components/gifts/GiftSendSheet';
import { useGiftEligibility } from '@/lib/queries/gifts.queries';
import { attemptActivation } from '@/lib/api/wallets';
import { lessonLockOf, type LessonLock } from '@/lib/utils/vault-access';

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
  const contractId = useAuthStore((s) => s.contractId);
  const isActivated = useAuthStore((s) => s.isActivated);
  const setIsActivated = useAuthStore((s) => s.setIsActivated);

  const wallet = useWalletTotal(walletAddress);
  const { assetsQuery, assets, prices, totalUsd } = wallet;
  const portfolioQuery = usePortfolioSummary(!!walletAddress);
  const vaultsQuery = useVaults();
  const [segment, setSegment] = useState<WalletSegment>('coins');

  const usdcBalance = parseFloat(assets.find((a) => a.id === 'USDC')?.balance ?? '0') || 0;

  // Moeda cujo porquinho pede lições da trilha (Figma 17a): o primeiro vault
  // da moeda, na ordem do backend.
  const vaults = vaultsQuery.data;
  const lockByAsset = useMemo(() => {
    const map = new Map<string, LessonLock | null>();
    for (const vault of vaults ?? []) {
      const symbol = vault.assetSymbol.toUpperCase();
      if (!map.has(symbol)) map.set(symbol, lessonLockOf(vault));
    }
    return map;
  }, [vaults]);

  const [onrampOpen, setOnrampOpen] = useState(false);
  const [offrampOpen, setOfframpOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [swapSheetOpen, setSwapSheetOpen] = useState(false);
  const [giftOpen, setGiftOpen] = useState(false);
  const [giftsOpen, setGiftsOpen] = useState(false);
  const { data: giftEligibility } = useGiftEligibility();

  // ?gifts=1 abre Meus presentes direto (bloqueio "presente" da exclusão de
  // conta, Figma 29i). O parâmetro sai em seguida, para não reabrir sozinho.
  const { gifts: giftsParam } = useLocalSearchParams<{ gifts?: string }>();
  useEffect(() => {
    if (!giftsParam) return;
    setGiftsOpen(true);
    router.setParams({ gifts: undefined });
  }, [giftsParam]);

  // Conta não ativada na rede (Figma 17i/17j). A tentativa automática da
  // abertura do app é silenciosa (useAutoWalletActivation); esta é a manual.
  const [activating, setActivating] = useState(false);
  const [activationError, setActivationError] = useState<string | null>(null);
  const handleActivate = useCallback(async () => {
    if (activating || !walletAddress || !walletAccountId || !contractId) return;
    setActivating(true);
    setActivationError(null);
    const result = await attemptActivation({
      userId: contractId,
      walletAccountId,
      stellarAddress: walletAddress,
    });
    if (result.success) setIsActivated(true);
    else setActivationError(t('wallet.activate.fail') + result.error);
    setActivating(false);
  }, [activating, walletAddress, walletAccountId, contractId, setIsActivated, t]);
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
  const handleGift = useCallback(() => setGiftOpen(true), []);
  const handleGifts = useCallback(() => setGiftsOpen(true), []);
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
      wallet.refetch(),
      portfolioQuery.refetch(),
      vaultsQuery.refetch(),
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
              estimated={wallet.estimated}
              address={walletAddress}
              onGifts={handleGifts}
              activation={isActivated ? 'active' : activating ? 'activating' : 'inactive'}
              onActivate={handleActivate}
              activationError={activationError}
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
                <NavChip
                  label="Histórico"
                  icon="history"
                  iconOnly={compactHistory}
                  onPress={handleHistory}
                  accessibilityLabel="Ver histórico"
                />
              </View>

              {segment === 'coins' ? (
                <ListCard>
                  {assets.map((asset) => (
                    <WalletAssetRow
                      key={asset.id}
                      asset={asset}
                      usdPrice={prices[asset.id]}
                      lock={lockByAsset.get(asset.id) ?? null}
                    />
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
      <MyGiftsSheet
        visible={giftsOpen}
        onClose={() => setGiftsOpen(false)}
        onSendGift={giftEligibility?.canGift ? handleGift : undefined}
      />
      <GiftSendSheet visible={giftOpen} onClose={() => setGiftOpen(false)} />
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
});
