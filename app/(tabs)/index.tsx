import { LevelUpAnimation } from "@/components/ui";
import { HomeHero, type HeroAmount } from "@/components/home/HomeHero";
import { HomePiggyList } from "@/components/home/HomePiggyList";
import { WalletSummaryCard } from "@/components/home/WalletSummaryCard";
import { WithdrawAllFlow } from "@/components/home/WithdrawAllFlow";
import { PIG_LEVELS, levelProgress, type PigLevel } from "@/components/home/pig-levels";
import { V2Colors, V2Layout } from "@/constants/theme-v2";
import { useVaults } from "@/lib/queries/vaults.queries";
import { usePortfolioSummary } from "@/lib/queries/portfolio.queries";
import { useAccent } from "@/hooks/use-accent";
import { useTerms } from "@/hooks/use-terms";
import { useScreenInsets } from "@/hooks/use-screen-insets";
import { useVaultAccess } from "@/hooks/use-vault-access";
import { useLiveAmount } from "@/hooks/use-live-amount";
import { useWalletTotal } from "@/hooks/use-wallet-total";
import { apyNumber } from "@/lib/utils/live-amount";
import { buildPiggies } from "@/lib/utils/piggy";
import {
  portfolioPositionUsdValue,
  positionUsesMarketPrice,
} from "@/lib/utils/portfolio";
import { useAppLockStore } from "@/lib/stores/app-lock.store";
import { useAuthStore } from "@/lib/stores/auth.store";
import { useSound } from "@/hooks/use-sound";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";

const BALANCE_ANIMATION_STEPS = 20;
const BALANCE_ANIMATION_INTERVAL_MS = 30;

const groupThousands = (integer: string) => integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/** Valor do contador com as 7 casas sempre (largura estável). */
function liveBalanceParts(value: string): HeroAmount {
  const [integerPart = "0", fractionPart = ""] = value.split(".");
  return {
    integer: `$${groupThousands(integerPart)}`,
    fraction: `.${fractionPart.padEnd(7, "0").slice(0, 7)}`,
  };
}

function countingBalanceParts(value: number): HeroAmount {
  const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0;
  const [integerPart, fractionPart = ""] = safeValue.toFixed(7).split(".");
  const meaningfulFraction = fractionPart.replace(/0+$/, "");
  const decimals =
    meaningfulFraction.length >= 2 ? meaningfulFraction : fractionPart.slice(0, 2);
  return { integer: `$${groupThousands(integerPart)}`, fraction: `.${decimals}` };
}

/** Total com moeda cotada (euro, cripto): equivalente em dólar, 2 casas, "≈". */
function estimatedParts(value: number): HeroAmount {
  const [integerPart, fractionPart] = Math.max(0, value).toFixed(2).split(".");
  return { integer: `≈ $${groupThousands(integerPart)}`, fraction: `.${fractionPart}` };
}

/**
 * Home V2 (Figma "Home · Tela"): o total guardado e o nível do porquinho no
 * topo, o atalho da carteira e os porquinhos. Depositar, Sacar e Presentear
 * moram na Carteira; guardar e tirar, na aba Guardar.
 */
export default function HomeScreen() {
  const accent = useAccent();
  const { t } = useTerms();
  const screenInsets = useScreenInsets();
  const { canAccessVaultAsset } = useVaultAccess();
  const vaultsQuery = useVaults();
  const vaults = vaultsQuery.data;
  const walletAddress = useAuthStore((s) => s.walletAddress);
  const lastSeenPigLevel = useAuthStore((s) =>
    walletAddress ? s.lastSeenPigLevelByWallet[walletAddress] : undefined,
  );
  const setLastSeenPigLevel = useAuthStore((s) => s.setLastSeenPigLevel);
  const appLocked = useAppLockStore((s) => s.locked);
  const portfolioQuery = usePortfolioSummary(!!walletAddress);
  const portfolioSummary = portfolioQuery.data;

  // O hook compartilhado não promove respostas parciais sobre a última
  // fotografia completa. Se a primeira leitura da sessão já falhar, ainda
  // não existe um número confiável para mostrar.
  const displayedPortfolioSummary =
    portfolioSummary?.totalUsd !== null ? portfolioSummary : undefined;
  const balancesReady = !!displayedPortfolioSummary;

  const visiblePositions = useMemo(
    () =>
      (displayedPortfolioSummary?.positions ?? []).filter((position) =>
        canAccessVaultAsset(position.assetSymbol),
      ),
    [canAccessVaultAsset, displayedPortfolioSummary],
  );
  const valuationUnavailable =
    !displayedPortfolioSummary ||
    visiblePositions.some((position) => portfolioPositionUsdValue(position) === null);
  const usesMarketPricing = visiblePositions.some(positionUsesMarketPrice);

  const totalInvested = useMemo(() => {
    return visiblePositions.reduce((total, position) => {
      const value = portfolioPositionUsdValue(position);
      return value === null ? total : total + value;
    }, 0);
  }, [visiblePositions]);

  // Rendimento do total investido: a média das taxas, pesada pelo valor de
  // cada porquinho em dólar (sem taxa, como o de cripto hoje, conta zero).
  // Arredondada: com um porquinho só, dá exatamente a taxa dele.
  const investedApy = useMemo(() => {
    const apyByVault = new Map((vaults ?? []).map((vault) => [vault.id, apyNumber(vault.apy)]));
    let weighted = 0;
    let sum = 0;
    for (const position of visiblePositions) {
      const value = portfolioPositionUsdValue(position);
      if (value === null || value <= 0) continue;
      weighted += value * (apyByVault.get(position.vaultId) ?? 0);
      sum += value;
    }
    return sum > 0 ? Math.round((weighted / sum) * 1e6) / 1e6 : null;
  }, [vaults, visiblePositions]);

  // As casas andam com o rendimento entre uma leitura e outra (só na Home).
  const liveInvested = useLiveAmount(
    valuationUnavailable ? "0" : totalInvested.toFixed(7),
    valuationUnavailable ? null : investedApy,
  );

  const wallet = useWalletTotal(walletAddress);
  const walletUsdc = parseFloat(wallet.assets.find((a) => a.id === "USDC")?.balance ?? "0") || 0;

  const piggies = useMemo(
    () =>
      vaults && portfolioSummary
        ? buildPiggies(vaults, portfolioSummary, canAccessVaultAsset)
        : null,
    [vaults, portfolioSummary, canAccessVaultAsset],
  );

  // Saque da Exclusão de conta: o primeiro porquinho de dólar.
  const firstVault =
    vaults?.find((vault) => vault.assetSymbol.toUpperCase() === "USDC") ??
    vaults?.find((vault) => canAccessVaultAsset(vault.assetSymbol));
  const firstPosition = displayedPortfolioSummary?.positions.find(
    (position) => position.vaultId === firstVault?.id,
  );
  const { sacar } = useLocalSearchParams<{ sacar?: string }>();

  const level = levelProgress(totalInvested);
  const levelLabel = level.current.label;

  const [refreshing, setRefreshing] = useState(false);
  const [displayBalance, setDisplayBalance] = useState(0);
  const displayBalanceRef = useRef(0);
  const isAnimating = useRef(false);

  const { playClick, muted, toggleMute } = useSound();

  const [levelUpModalVisible, setLevelUpModalVisible] = useState(false);
  const [oldLevelForAnim, setOldLevelForAnim] = useState<PigLevel | null>(null);
  const [newLevelForAnim, setNewLevelForAnim] = useState<PigLevel | null>(null);
  const [levelDirection, setLevelDirection] = useState<"up" | "down">("up");

  useEffect(() => {
    // Montada por baixo do cadeado, a home espera o app ser liberado: aberto
    // antes, o Modal da animação seria descartado pelo iOS sem aparecer.
    if (!balancesReady || !walletAddress || appLocked) return;

    const label = levelLabel;
    if (!lastSeenPigLevel) {
      setLastSeenPigLevel(walletAddress, label);
      return;
    }

    if (lastSeenPigLevel === label) return;

    const oldIdx = PIG_LEVELS.findIndex((pigLevel) => pigLevel.label === lastSeenPigLevel);
    const newIdx = PIG_LEVELS.findIndex((pigLevel) => pigLevel.label === label);

    // Persist before opening the modal so remounting the screen cannot replay it.
    setLastSeenPigLevel(walletAddress, label);

    if (oldIdx < 0 || newIdx < 0) return;

    setOldLevelForAnim(PIG_LEVELS[oldIdx]);
    setNewLevelForAnim(PIG_LEVELS[newIdx]);
    setLevelDirection(newIdx > oldIdx ? "up" : "down");
    setLevelUpModalVisible(true);
  }, [
    appLocked,
    balancesReady,
    lastSeenPigLevel,
    levelLabel,
    setLastSeenPigLevel,
    walletAddress,
  ]);

  useEffect(() => {
    const target = totalInvested;
    const currentDisplayBalance = displayBalanceRef.current;

    if (Math.abs(target - currentDisplayBalance) < 0.001 || isAnimating.current)
      return;

    isAnimating.current = true;
    const increment =
      (target - currentDisplayBalance) / BALANCE_ANIMATION_STEPS;
    let step = 0;

    const interval = setInterval(() => {
      step++;
      if (step >= BALANCE_ANIMATION_STEPS) {
        displayBalanceRef.current = target;
        setDisplayBalance(target);
        clearInterval(interval);
        isAnimating.current = false;
      } else {
        setDisplayBalance((prev) => {
          const next = prev + increment;
          displayBalanceRef.current = next;
          return next;
        });
      }
    }, BALANCE_ANIMATION_INTERVAL_MS);

    return () => {
      clearInterval(interval);
      isAnimating.current = false;
    };
  }, [totalInvested]);

  const refetchVaults = vaultsQuery.refetch;
  const refetchPortfolio = portfolioQuery.refetch;
  const refetchWallet = wallet.refetch;
  const handleRefresh = useCallback(async () => {
    if (!walletAddress) return;
    setRefreshing(true);
    await Promise.allSettled([refetchVaults(), refetchWallet(), refetchPortfolio()]);
    setRefreshing(false);
  }, [refetchPortfolio, refetchVaults, refetchWallet, walletAddress]);

  const retryPiggies = useCallback(() => {
    refetchVaults();
    refetchPortfolio();
  }, [refetchPortfolio, refetchVaults]);

  const handleToggleMute = useCallback(() => {
    playClick();
    toggleMute();
  }, [playClick, toggleMute]);
  const openPigs = useCallback(() => router.push("/pigs"), []);
  const openWallet = useCallback(() => router.push("/(tabs)/wallet"), []);
  const openGuardar = useCallback(() => router.push("/(tabs)/vaults"), []);
  const openPiggy = useCallback(
    (vaultId: string) => router.push({ pathname: "/(tabs)/vaults", params: { vault: vaultId } }),
    [],
  );

  // Enquanto a contagem até um valor novo roda (depósito, saque, primeira
  // leitura), ela manda; parada, o número segue o rendimento com 7 casas.
  // Sem rendimento (sem taxa ou sem saldo), fica o formato de antes.
  // Com moeda cotada o total é estimado: 2 casas e "≈" (Figma 04h).
  const countingUp = Math.abs(displayBalance - totalInvested) > 1e-9;
  const growing = !countingUp && totalInvested > 0 && investedApy != null;
  let heroAmount: HeroAmount | null = null;
  if (!valuationUnavailable) {
    if (usesMarketPricing) heroAmount = estimatedParts(displayBalance);
    else if (growing) heroAmount = liveBalanceParts(liveInvested);
    else heroAmount = countingBalanceParts(displayBalance);
  }
  const wholeTotal = groupThousands(Math.trunc(totalInvested).toString());
  const legend = valuationUnavailable
    ? "valor indisponível"
    : usesMarketPricing
      ? `≈ $${wholeTotal} · estimativa`
      : `$${wholeTotal} guardados`;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: screenInsets.bottom }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            progressViewOffset={screenInsets.top}
            tintColor="#fff"
            colors={[accent.base]}
            progressBackgroundColor={V2Colors.sheetTop}
          />
        }
      >
        <HomeHero
          paddingTop={screenInsets.top + screenInsets.topGap}
          label={t("home.total.label")}
          amount={heroAmount}
          level={level}
          legend={legend}
          muted={muted}
          onToggleMute={handleToggleMute}
          onPressMascot={openPigs}
        />

        <View style={styles.content}>
          <WalletSummaryCard
            amountUsd={wallet.totalUsd}
            estimated={wallet.estimated}
            onPress={openWallet}
          />
          <HomePiggyList
            piggies={piggies}
            isError={vaultsQuery.isError || portfolioQuery.isError}
            onRetry={retryPiggies}
            onSeeAll={openGuardar}
            onOpenPiggy={openPiggy}
          />
        </View>
      </ScrollView>

      <WithdrawAllFlow
        trigger={sacar}
        vaultId={firstVault?.id ?? ""}
        assetSymbol={firstVault?.assetSymbol ?? "USDC"}
        dfTokens={firstPosition?.shares ?? "0"}
        underlyingBalance={String(parseFloat(firstPosition?.amountAsset ?? "0") || 0)}
        walletUsdc={walletUsdc}
      />
      <LevelUpAnimation
        visible={levelUpModalVisible}
        oldLevel={oldLevelForAnim}
        newLevel={newLevelForAnim}
        direction={levelDirection}
        onClose={() => setLevelUpModalVisible(false)}
        onDeposit={openGuardar}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: V2Colors.background,
  },
  // Figma: 18 px de margem e 18 px até o herói; 24 px até "Meus porquinhos".
  content: {
    width: "100%",
    maxWidth: V2Layout.maxWidth,
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingTop: 18,
    gap: 24,
  },
});
