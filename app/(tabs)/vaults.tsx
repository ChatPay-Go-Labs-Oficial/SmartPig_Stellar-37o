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
import { useQueryClient } from '@tanstack/react-query';
import { V2Colors, V2Font, V2Layout } from '@/constants/theme-v2';
import { useAccent } from '@/hooks/use-accent';
import { useTerms } from '@/hooks/use-terms';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { useVaultAccess } from '@/hooks/use-vault-access';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useVaults, vaultKeys } from '@/lib/queries/vaults.queries';
import { portfolioKeys, usePortfolioSummary } from '@/lib/queries/portfolio.queries';
import type { TermKey } from '@/lib/copy/terms';
import { formatApy } from '@/lib/utils/format';
import {
  buildPiggies,
  formatQuoteTime,
  guardarTotal,
  initialPiggyIndex,
  joinAssetNames,
  fromUnits,
  toUnits,
  type GuardarTotal,
  type Piggy,
} from '@/lib/utils/piggy';
import { ScreenGlow } from '@/components/v2';
import { GuardarHeader } from '@/components/guardar/GuardarHeader';
import { PiggyCarousel } from '@/components/guardar/PiggyCarousel';
import { PiggyHowItWorks, PiggyNotice } from '@/components/guardar/PiggySections';
import { TotalEstimateSheet } from '@/components/guardar/TotalEstimateSheet';
import { SaveSheet } from '@/components/guardar/SaveSheet';
import { WithdrawSheet } from '@/components/guardar/WithdrawSheet';
import { SwapSheet } from '@/components/wallet/SwapSheet';
import { useWalletAssets } from '@/lib/queries/wallets.queries';

type BalanceProjection = {
  kind: 'save' | 'withdraw';
  sourceUnits: bigint;
  expectedUnits: bigint;
  expiresAt: number;
  walletAddress: string | null;
};

const BALANCE_PROJECTION_TTL_MS = 2 * 60_000;

/**
 * Aba Guardar (Figma "Guardar · Tela", 10a–10l): o total guardado e um
 * carrossel com um porquinho por vault.
 *
 * Saldos vêm do portfólio (uma requisição para todos os porquinhos), não do
 * saldo por vault: o fan-out por cartão estourava o limite do DeFindex.
 */
export default function GuardarScreen() {
  const screenInsets = useScreenInsets();
  const { width } = useWindowDimensions();
  const column = Math.min(width, V2Layout.maxWidth);
  const accent = useAccent();
  const { t, p, isPro } = useTerms();
  const queryClient = useQueryClient();
  const walletAddress = useAuthStore((s) => s.walletAddress);
  const walletAccountId = useAuthStore((s) => s.walletAccountId);
  const { canAccessVaultAsset } = useVaultAccess();

  const vaultsQuery = useVaults();
  const portfolioQuery = usePortfolioSummary(!!walletAddress);
  const vaults = vaultsQuery.data;
  const summary = portfolioQuery.data;
  const [balanceProjections, setBalanceProjections] = useState(
    () => new Map<string, BalanceProjection>(),
  );

  // Durante o refetch após Guardar/Tirar, o backend pode devolver uma leitura
  // parcial por alguns instantes. Mantemos a última posição confiável em vez
  // de trocar o saldo visível por "—". A memória é isolada por carteira.
  const portfolioMemory = useRef<{
    walletAddress: string | null;
    knownHeld: Set<string>;
    balances: Map<
      string,
      Pick<Piggy, 'position' | 'amount' | 'balanceKnown' | 'hasBalance' | 'usd'>
    >;
    total: GuardarTotal | null;
  }>({ walletAddress, knownHeld: new Set(), balances: new Map(), total: null });
  const serverPiggies = useMemo(() => {
    if (!vaults || !summary) return null;
    if (portfolioMemory.current.walletAddress !== walletAddress) {
      portfolioMemory.current = {
        walletAddress,
        knownHeld: new Set(),
        balances: new Map(),
        total: null,
      };
    }

    const memory = portfolioMemory.current;
    for (const position of summary.positions) memory.knownHeld.add(position.vaultId);
    return buildPiggies(vaults, summary, canAccessVaultAsset, memory.knownHeld).map((piggy) => {
      if (piggy.balanceKnown) {
        memory.balances.set(piggy.vault.id, {
          position: piggy.position,
          amount: piggy.amount,
          balanceKnown: true,
          hasBalance: piggy.hasBalance,
          usd: piggy.usd,
        });
        return piggy;
      }

      const previous = memory.balances.get(piggy.vault.id);
      return previous ? { ...piggy, ...previous } : piggy;
    });
  }, [vaults, summary, canAccessVaultAsset, walletAddress]);
  const piggies = useMemo(
    () =>
      serverPiggies?.map((piggy) => {
        const projection = balanceProjections.get(piggy.vault.id);
        if (!projection || projection.walletAddress !== walletAddress) return piggy;

        const expectedAmount = fromUnits(projection.expectedUnits);
        const currentAmount = Number(piggy.amount);
        const expectedNumber = Number(expectedAmount);
        let projectedUsd = piggy.usd;
        if (piggy.asset === 'USDC') projectedUsd = expectedNumber;
        else if (
          piggy.usd !== null &&
          Number.isFinite(currentAmount) &&
          currentAmount > 0 &&
          Number.isFinite(expectedNumber)
        ) {
          projectedUsd = (piggy.usd / currentAmount) * expectedNumber;
        }

        return {
          ...piggy,
          amount: expectedAmount,
          balanceKnown: true,
          hasBalance: projection.expectedUnits > 0n,
          usd: projectedUsd,
        };
      }) ?? null,
    [balanceProjections, serverPiggies, walletAddress],
  );

  const total = useMemo(() => {
    if (!serverPiggies || !piggies || !summary) return null;
    const serverTotal = guardarTotal(serverPiggies, summary);
    if (serverTotal.kind !== 'unknown') {
      portfolioMemory.current.total = serverTotal;
    }
    const projectedTotal = guardarTotal(piggies, summary);
    if (projectedTotal.kind !== 'unknown') return projectedTotal;
    return portfolioMemory.current.total ?? projectedTotal;
  }, [piggies, serverPiggies, summary]);

  // A leitura on-chain substitui a projeção quando alcança o saldo esperado.
  // Uma tolerância de 1 stroop cobre arredondamento na conversão de cotas.
  useEffect(() => {
    if (!summary || balanceProjections.size === 0) return;
    const now = Date.now();
    setBalanceProjections((current) => {
      let changed = false;
      const next = new Map(current);
      for (const [vaultId, projection] of current) {
        if (projection.walletAddress !== walletAddress) {
          next.delete(vaultId);
          changed = true;
          continue;
        }
        const position = summary.positions.find((item) => item.vaultId === vaultId);
        // Uma posição ausente numa resposta parcial não é saldo zero. A única
        // exceção é o resgate total numa resposta completa do portfólio.
        const hasReliableReading =
          !!position || (projection.expectedUnits === 0n && summary.totalUsd !== null);
        if (!hasReliableReading && projection.expiresAt > now) continue;
        const actualUnits = toUnits(position?.amountAsset ?? '0');
        const movedInExpectedDirection =
          projection.kind === 'save'
            ? actualUnits > projection.sourceUnits
            : actualUnits < projection.sourceUnits;
        const reached =
          projection.kind === 'save'
            ? actualUnits + 1n >= projection.expectedUnits
            : actualUnits <= projection.expectedUnits + 1n;
        if (movedInExpectedDirection || reached || projection.expiresAt <= now) {
          next.delete(vaultId);
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [balanceProjections.size, summary, walletAddress]);

  // Toque num porquinho na Carteira (?vault=): a aba abre já nele.
  const { vault: vaultParam } = useLocalSearchParams<{ vault?: string }>();

  // Seleção pelo id do vault: sobrevive a recargas que mudem a ordem.
  const [selectedId, setSelectedId] = useState<string | null>(() => vaultParam ?? null);
  const index = useMemo(() => {
    if (!piggies?.length) return 0;
    const found = piggies.findIndex((piggy) => piggy.vault.id === selectedId);
    return found >= 0 ? found : initialPiggyIndex(piggies);
  }, [piggies, selectedId]);
  const selected = piggies?.[index] ?? null;

  const piggiesRef = useRef(piggies);
  piggiesRef.current = piggies;
  const projectConfirmedBalance = useCallback(
    (kind: BalanceProjection['kind'], vaultId: string, amount: string) => {
      const current = piggiesRef.current?.find((piggy) => piggy.vault.id === vaultId);
      if (!current) return;
      const currentUnits = toUnits(current.amount);
      const operationUnits = toUnits(amount);
      const expectedUnits =
        kind === 'save'
          ? currentUnits + operationUnits
          : currentUnits > operationUnits
            ? currentUnits - operationUnits
            : 0n;
      setBalanceProjections((projections) => {
        const next = new Map(projections);
        next.set(vaultId, {
          kind,
          sourceUnits: currentUnits,
          expectedUnits,
          expiresAt: Date.now() + BALANCE_PROJECTION_TTL_MS,
          walletAddress,
        });
        return next;
      });
    },
    [walletAddress],
  );
  const handleIndexChange = useCallback((next: number) => {
    const id = piggiesRef.current?.[next]?.vault.id;
    if (id) setSelectedId(id);
  }, []);

  // Com a aba já montada, o parâmetro chega depois: aplica e limpa.
  useEffect(() => {
    if (!vaultParam) return;
    setSelectedId(vaultParam);
    router.setParams({ vault: undefined });
  }, [vaultParam]);

  // Legenda do total: rendimento do porquinho de dólar, ou a cotação usada.
  const dollar =
    piggies?.find((piggy) => piggy.asset === 'USDC' && piggy.vault.isFeatured) ??
    piggies?.find((piggy) => piggy.asset === 'USDC');
  const apy = dollar?.vault.apy != null ? formatApy(dollar.vault.apy) : null;
  // O asOf é a hora da resposta. Com preço estático ou velho no backend, uma
  // hora daria a falsa ideia de cotação de mercado recente.
  const marketQuote = !!summary && !summary.stale && summary.priceSource !== 'STATIC';
  const quoteTime = summary && marketQuote ? formatQuoteTime(summary.asOf) : null;
  let quote: string | null = null;
  if (total?.kind === 'estimated') {
    const assets = joinAssetNames(
      total.assets.map((asset) => t(`carteira.asset.${asset}.name` as TermKey)),
      isPro,
    );
    quote = quoteTime
      ? p('guardar.total.quote', { assets, time: quoteTime })
      : p('guardar.total.quoteReference', { assets });
  }

  // Guardar e Tirar (sheets V2). A última escolha fica guardada para o sheet
  // não perder os dados enquanto fecha; o saldo vem sempre da leitura mais
  // recente do porquinho.
  const [operation, setOperation] = useState<{ kind: 'save' | 'withdraw'; piggy: Piggy } | null>(null);
  const [operationOpen, setOperationOpen] = useState(false);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  // "Trocar moedas" a partir do Guardar sem a moeda na carteira.
  const [swapOpen, setSwapOpen] = useState(false);
  const walletAssets = useWalletAssets(walletAddress).data?.assets ?? [];

  // Aceite de riscos pendente (Figma 10g → 13a): o Guardar leva à leitura
  // antes do sheet. Tirar nunca depende do aceite.
  const handleSave = useCallback((piggy: Piggy) => {
    if (piggy.risksPending) {
      router.push({ pathname: '/vault/[id]/risks', params: { id: piggy.vault.id } });
      return;
    }
    setOperation({ kind: 'save', piggy });
    setOperationOpen(true);
  }, []);
  const handleWithdraw = useCallback((piggy: Piggy) => {
    setOperation({ kind: 'withdraw', piggy });
    setOperationOpen(true);
  }, []);
  const closeOperation = useCallback(() => {
    setOperationOpen(false);
    // Os sheets já atualizam o portfólio ao concluir; ao fechar, uma leitura
    // nova cobre também uma operação que falhou depois de enviada.
    queryClient.invalidateQueries({ queryKey: portfolioKeys.summary });
  }, [queryClient]);
  // Um sheet de cada vez: o Guardar fecha e só então a troca abre (dois
  // Modal ao mesmo tempo travam a apresentação no iOS).
  const openSwapFromSave = useCallback(() => {
    setOperationOpen(false);
    setTimeout(() => setSwapOpen(true), 350);
  }, []);
  // O backend pediu o aceite durante o Guardar (lista ainda sem o aviso): o
  // sheet fecha antes de navegar, porque um Modal fica por cima da pilha.
  const openRisksFromSave = useCallback(() => {
    const id = operation?.piggy.vault.id;
    setOperationOpen(false);
    queryClient.invalidateQueries({ queryKey: vaultKeys.all, exact: true });
    if (id) setTimeout(() => router.push({ pathname: '/vault/[id]/risks', params: { id } }), 350);
  }, [operation, queryClient]);
  const openBreakdown = useCallback(() => setBreakdownOpen(true), []);

  useEffect(() => {
    if (total?.kind !== 'estimated') setBreakdownOpen(false);
  }, [total?.kind]);

  const [refreshing, setRefreshing] = useState(false);
  async function handleRefresh() {
    setRefreshing(true);
    await Promise.allSettled([vaultsQuery.refetch(), portfolioQuery.refetch()]);
    setRefreshing(false);
  }

  const failed =
    (!vaults && vaultsQuery.isError) || (!summary && portfolioQuery.isError && !!walletAddress);
  const retry = () => {
    if (vaultsQuery.isError) vaultsQuery.refetch();
    if (portfolioQuery.isError) portfolioQuery.refetch();
  };

  const operationPiggy =
    piggies?.find((piggy) => piggy.vault.id === operation?.piggy.vault.id) ?? operation?.piggy ?? null;

  return (
    <View style={styles.screen}>
      <ScreenGlow peak={0.4} height={640} />
      {/* O painel do cabeçalho começa atrás da barra de status (Figma); a
          rolagem não, para o conteúdo não passar por baixo dos ícones. */}
      <View
        pointerEvents="none"
        style={[styles.statusTint, { height: screenInsets.top, width: column, left: (width - column) / 2 }]}
      />

      <ScrollView
        style={{ marginTop: screenInsets.top }}
        contentContainerStyle={[styles.content, { paddingBottom: screenInsets.bottom }]}
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
        <GuardarHeader
          topGap={screenInsets.topGap}
          total={total}
          apy={apy}
          quote={quote}
          onPressBreakdown={openBreakdown}
        />

        {piggies && piggies.length > 0 && selected ? (
          <>
            <PiggyCarousel
              piggies={piggies}
              index={index}
              onIndexChange={handleIndexChange}
              width={column}
              onSave={handleSave}
              onWithdraw={handleWithdraw}
            />
            <PiggyNotice piggy={selected} />
            <PiggyHowItWorks piggy={selected} />
          </>
        ) : (
          <View style={styles.state}>
            {failed ? (
              <>
                <Text style={styles.stateText}>{t('guardar.error')}</Text>
                <Pressable onPress={retry} accessibilityRole="button" hitSlop={8}>
                  <Text style={[styles.stateAction, { color: accent.base }]}>Tentar novamente</Text>
                </Pressable>
              </>
            ) : piggies ? (
              <Text style={styles.stateText}>Nenhum porquinho disponível agora.</Text>
            ) : (
              <ActivityIndicator size="large" color={V2Colors.onPrimary} />
            )}
          </View>
        )}
      </ScrollView>

      <SaveSheet
        visible={operationOpen && operation?.kind === 'save'}
        piggy={operationPiggy}
        onClose={closeOperation}
        onSwap={openSwapFromSave}
        onRisks={openRisksFromSave}
        onConfirmed={(vaultId, amount) => projectConfirmedBalance('save', vaultId, amount)}
      />
      <WithdrawSheet
        visible={operationOpen && operation?.kind === 'withdraw'}
        piggy={operationPiggy}
        onClose={closeOperation}
        onConfirmed={(vaultId, amount) => projectConfirmedBalance('withdraw', vaultId, amount)}
      />
      {/* Só o Pro troca moedas daqui; no Lite o Guardar sem saldo diz "em breve". */}
      {isPro && (
        <SwapSheet
          visible={swapOpen}
          assets={walletAssets}
          walletAddress={walletAddress}
          walletAccountId={walletAccountId}
          onClose={() => setSwapOpen(false)}
          initialTo={operationPiggy?.asset && operationPiggy.asset !== 'USDC' ? operationPiggy.asset : undefined}
        />
      )}

      {piggies && (
        <TotalEstimateSheet
          visible={breakdownOpen}
          onClose={() => setBreakdownOpen(false)}
          piggies={piggies}
          total={total?.kind === 'estimated' ? total : null}
          quoteTime={quoteTime}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: V2Colors.background,
  },
  statusTint: {
    position: 'absolute',
    top: 0,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  // Coluna com largura máxima: em dobráveis e tablets o conteúdo não estica.
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: V2Layout.maxWidth,
    alignSelf: 'center',
  },
  // Figma 10i / 10j: o corpo dá lugar a um bloco centralizado.
  state: {
    minHeight: 420,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 24,
  },
  stateText: {
    fontFamily: V2Font.semiBold,
    fontSize: 15,
    textAlign: 'center',
    color: V2Colors.textSecondary,
  },
  stateAction: {
    fontFamily: V2Font.extraBold,
    fontSize: 15,
  },
});
