import { HomeHero, type HeroAmount } from "@/components/home/HomeHero";
import { HomePiggyList } from "@/components/home/HomePiggyList";
import { WalletSummaryCard } from "@/components/home/WalletSummaryCard";
import { WithdrawAllFlow } from "@/components/home/WithdrawAllFlow";
import { LevelChangeModal } from "@/components/home/LevelChangeModal";
import { LevelCard } from "@/components/v2/experience";
import { PIG_LEVELS, levelProgress, type PigLevel } from "@/constants/pig-levels";
import { V2Colors, V2Layout } from "@/constants/theme-v2";
import { useAccent } from "@/hooks/use-accent";
import { useTerms } from "@/hooks/use-terms";
import { useScreenInsets } from "@/hooks/use-screen-insets";
import { useVaultAccess } from "@/hooks/use-vault-access";
import { useLiveAmount } from "@/hooks/use-live-amount";
import { useWalletTotal } from "@/hooks/use-wallet-total";
import { useInvestedTotal } from "@/hooks/use-invested-total";
import { buildPiggies } from "@/lib/utils/piggy";
import { useAppLockStore } from "@/lib/stores/app-lock.store";
import { useAuthStore } from "@/lib/stores/auth.store";
import { useClaimDailyReward, useExperienceProfile } from "@/lib/queries/experience.queries";
import { useSound } from "@/hooks/use-sound";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";

const BALANCE_ANIMATION_STEPS = 20;
const BALANCE_ANIMATION_INTERVAL_MS = 30;

const groupThousands = (integer: string) => integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/** Valor do contador com as 7 casas sempre (largura estável). */
function liveBalanceParts(value: string, estimated: boolean): HeroAmount {
  const [integerPart = "0", fractionPart = ""] = value.split(".");
  return {
    integer: `${estimated ? "≈ " : ""}$${groupThousands(integerPart)}`,
    fraction: `.${fractionPart.padEnd(7, "0").slice(0, 7)}`,
  };
}

function countingBalanceParts(value: number, estimated: boolean): HeroAmount {
  const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0;
  const [integerPart, fractionPart = ""] = safeValue.toFixed(7).split(".");
  const meaningfulFraction = fractionPart.replace(/0+$/, "");
  const decimals =
    meaningfulFraction.length >= 2 ? meaningfulFraction : fractionPart.slice(0, 2);
  return {
    integer: `${estimated ? "≈ " : ""}$${groupThousands(integerPart)}`,
    fraction: `.${decimals}`,
  };
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
  const invested = useInvestedTotal();
  const { vaultsQuery, portfolioQuery, valuationUnavailable, usesMarketPricing } = invested;
  const vaults = vaultsQuery.data;
  const portfolioSummary = portfolioQuery.data;
  const displayedPortfolioSummary = invested.summary;
  const balancesReady = invested.ready;
  const totalInvested = invested.totalUsd;
  const investedApy = invested.apy;
  const walletAddress = useAuthStore((s) => s.walletAddress);
  const lastSeenPigLevel = useAuthStore((s) =>
    walletAddress ? s.lastSeenPigLevelByWallet[walletAddress] : undefined,
  );
  const setLastSeenPigLevel = useAuthStore((s) => s.setLastSeenPigLevel);
  const appLocked = useAppLockStore((s) => s.locked);
  // A home fica montada embaixo do login (ver AppGate): sem sessão, ela não
  // conta nem abre a animação de nível por trás dele.
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // As casas andam com o rendimento entre uma leitura e outra (só na Home).
  const liveInvested = useLiveAmount(
    valuationUnavailable ? "0" : totalInvested.toFixed(7),
    valuationUnavailable ? null : investedApy,
  );

  const wallet = useWalletTotal(walletAddress);
  const walletUsdc = parseFloat(wallet.assets.find((a) => a.id === "USDC")?.balance ?? "0") || 0;

  // Nível de Usuário (Figma 30i/30j, sem a Chama): o card pega a recompensa
  // do dia ali mesmo e abre o Seu nível.
  const experience = useExperienceProfile();
  const claimDailyReward = useClaimDailyReward();

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
  const levelId = level.current.id;

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
    if (!balancesReady || !walletAddress || appLocked || !isAuthenticated) return;

    // O aparelho guarda o id do nível (não o nome, que já mudou). Um valor
    // antigo, gravado como nome ("Porquinho Rei" era o 5º nível), não bate
    // com nenhum id: grava o nível atual sem animação, em vez de mostrar uma
    // evolução que não aconteceu.
    if (!lastSeenPigLevel) {
      setLastSeenPigLevel(walletAddress, levelId);
      return;
    }

    if (lastSeenPigLevel === levelId) return;

    const oldIdx = PIG_LEVELS.findIndex((pigLevel) => pigLevel.id === lastSeenPigLevel);
    const newIdx = PIG_LEVELS.findIndex((pigLevel) => pigLevel.id === levelId);

    // Persist before opening the modal so remounting the screen cannot replay it.
    setLastSeenPigLevel(walletAddress, levelId);

    if (oldIdx < 0 || newIdx < 0) return;

    setOldLevelForAnim(PIG_LEVELS[oldIdx]);
    setNewLevelForAnim(PIG_LEVELS[newIdx]);
    setLevelDirection(newIdx > oldIdx ? "up" : "down");
    setLevelUpModalVisible(true);
  }, [
    appLocked,
    balancesReady,
    isAuthenticated,
    lastSeenPigLevel,
    levelId,
    setLastSeenPigLevel,
    walletAddress,
  ]);

  useEffect(() => {
    // Coberta (abertura, cadeado) ou embaixo do login, a contagem espera:
    // corria escondida e a pessoa via só o fim dela quando a home aparecia.
    if (appLocked || !isAuthenticated) return;

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
  }, [appLocked, isAuthenticated, totalInvested]);

  // Sem conta (saiu), a contagem recomeça do zero: a próxima conta não parte
  // do valor da anterior.
  useEffect(() => {
    if (walletAddress) return;
    displayBalanceRef.current = 0;
    setDisplayBalance(0);
  }, [walletAddress]);

  const refetchVaults = vaultsQuery.refetch;
  const refetchPortfolio = portfolioQuery.refetch;
  const refetchWallet = wallet.refetch;
  const refetchExperience = experience.refetch;
  const handleRefresh = useCallback(async () => {
    if (!walletAddress) return;
    setRefreshing(true);
    await Promise.allSettled([
      refetchVaults(),
      refetchWallet(),
      refetchPortfolio(),
      refetchExperience(),
    ]);
    setRefreshing(false);
  }, [refetchExperience, refetchPortfolio, refetchVaults, refetchWallet, walletAddress]);

  const retryPiggies = useCallback(() => {
    refetchVaults();
    refetchPortfolio();
  }, [refetchPortfolio, refetchVaults]);

  const handleToggleMute = useCallback(() => {
    playClick();
    toggleMute();
  }, [playClick, toggleMute]);
  const openPigs = useCallback(() => router.push("/pigs"), []);
  // Troca de aba é navigate, nunca push: o push não é tratado pelas abas,
  // sobe para a pilha raiz e abre uma segunda cópia (toque duplo = duas telas).
  const openWallet = useCallback(() => router.navigate("/(tabs)/wallet"), []);
  const openGuardar = useCallback(() => router.navigate("/(tabs)/vaults"), []);
  // O Seu nível mora na aba Trilha (Figma 36a): a aba muda e o voltar leva à
  // Trilha. O withAnchor põe a Trilha por baixo quando a aba ainda não abriu;
  // sem ele o Seu nível ficava sozinho na pilha e tomava o lugar da Trilha.
  const openLevel = useCallback(() => router.navigate("/learn/level", { withAnchor: true }), []);
  const claimReward = claimDailyReward.mutate;
  const handleClaimReward = useCallback(() => claimReward(), [claimReward]);
  const closeLevelChange = useCallback(() => setLevelUpModalVisible(false), []);
  const openPiggy = useCallback(
    (vaultId: string) => router.navigate({ pathname: "/(tabs)/vaults", params: { vault: vaultId } }),
    [],
  );

  // Enquanto a contagem até um valor novo roda (depósito, saque, primeira
  // leitura), ela manda; parada, o número segue o rendimento com 7 casas.
  // Sem rendimento (sem taxa ou sem saldo), fica o formato de antes.
  // Com moeda cotada (euro, cripto) o total é estimado: leva o "≈" (Figma
  // 04h), mas cresce com as 7 casas como o resto. O Figma mostrava 2 casas;
  // o Matheus preferiu manter o crescimento (18/10/2026).
  const countingUp = Math.abs(displayBalance - totalInvested) > 1e-9;
  const growing = !countingUp && totalInvested > 0 && investedApy != null;
  let heroAmount: HeroAmount | null = null;
  if (!valuationUnavailable) {
    if (growing) heroAmount = liveBalanceParts(liveInvested, usesMarketPricing);
    else heroAmount = countingBalanceParts(displayBalance, usesMarketPricing);
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
          <View style={styles.summary}>
            <WalletSummaryCard
              amountUsd={wallet.totalUsd}
              estimated={wallet.estimated}
              onPress={openWallet}
            />
            <LevelCard
              profile={experience.data}
              loading={experience.isPending}
              error={experience.isError}
              onRetry={refetchExperience}
              onPress={openLevel}
              claiming={claimDailyReward.isPending}
              onClaim={handleClaimReward}
            />
          </View>
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
      <LevelChangeModal
        visible={levelUpModalVisible}
        from={oldLevelForAnim}
        to={newLevelForAnim}
        direction={levelDirection}
        onClose={closeLevelChange}
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
  // Figma 30i: 14 entre a carteira e o card de Nível.
  summary: {
    gap: 14,
  },
});
