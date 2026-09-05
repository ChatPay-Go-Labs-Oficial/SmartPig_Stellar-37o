import { useCallback, useMemo, useState } from "react";
import {
  Image,
  Pressable,
  View,
  Text,
  StyleSheet,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {
  Colors,
  Accent,
  Font,
  FontSize,
  Gradients,
  Radius,
  Spacing,
} from "@/constants/theme";
import {
  Card,
  PressableScale,
  ConfirmModal,
  ModeSwitch,
  MonoText,
  TransferModal,
  MyGiftsModal,
  getPigLevel,
} from "@/components/ui";
import {
  useAppMode,
  useAppModeReady,
  useAppModeActions,
  type AppMode,
} from "@/hooks/use-app-mode";
import { useTerms } from "@/hooks/use-terms";
import { useSmartAccount } from "@/hooks/use-smart-account";
import { useSound } from "@/hooks/use-sound";
import { usePixStore } from "@/lib/stores/pix.store";
import { useAuthStore } from "@/lib/stores/auth.store";
import { useBlindPayStore } from "@/lib/stores/blindpay.store";
import { useKycStatus } from "@/lib/queries/blindpay.queries";
import type { KycStatusResponse } from "@/lib/api/blindpay";
import { KycStatusBadge } from "@/components/ui/KycStatusBadge";
import { useWalletBalance } from "@/lib/queries/wallets.queries";
import { useAllVaultBalances } from "@/lib/queries/vaults.queries";
import { usePrivy } from "@privy-io/expo";
import { attemptActivation, findUsdcBalance } from "@/lib/api/wallets";
import * as Clipboard from "expo-clipboard";

const PIG_IMAGES: Record<string, any> = {
  "Porquinho Bebê": require("@/assets/images/pig_babe.png"),
  "Porquinho Esperto": require("@/assets/images/pig1.png"),
  "Porquinho Forte": require("@/assets/images/pig-muscle.png"),
  "Porquinho Dourado": require("@/assets/images/pig-gold.png"),
  "Porquinho Rei": require("@/assets/images/pig-king.png"),
};
/**
 * Texto de apoio do card de KYC. A mensagem da rejeição vem da BlindPay em
 * inglês; exibimos verbatim porque é instrução específica do compliance sobre
 * o que corrigir, e reescrever corre o risco de mudar o sentido.
 */
function kycStatusHint(kyc: KycStatusResponse): string {
  switch (kyc.kycStatus) {
    case "APPROVED":
    case "APPROVED_RFI":
      return "Sua identidade foi verificada. Você já pode depositar e sacar via Pix.";
    case "VERIFYING":
      return "Estamos analisando seus documentos. Isso costuma levar poucos minutos.";
    case "COMPLIANCE_REQUEST":
      return "Precisamos de informações adicionais para concluir sua verificação.";
    case "REJECTED":
      return (
        kyc.rejectionReason ??
        "Não foi possível verificar sua identidade com os documentos enviados."
      );
  }
}

export default function ProfileScreen() {
  const walletAddress = useAuthStore((s) => s.walletAddress);
  const walletAccountId = useAuthStore((s) => s.walletAccountId);
  const contractId = useAuthStore((s) => s.contractId);
  const isActivated = useAuthStore((s) => s.isActivated);
  const setIsActivated = useAuthStore((s) => s.setIsActivated);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const { disconnect } = useSmartAccount();
  const { logout } = usePrivy();
  const { playClick, playInvestirConfirmacao } = useSound();

  const { data: kyc, isLoading: kycLoading } = useKycStatus(contractId);

  const { data: balances } = useWalletBalance(walletAddress);
  const usdcBalance = balances ? findUsdcBalance(balances) : null;

  const vaultBalances = useAllVaultBalances(walletAddress);
  const totalInvested = useMemo(() => {
    let total = 0;
    for (const b of vaultBalances) {
      total += parseFloat(b.data?.underlyingBalance?.[0] ?? "0");
    }
    return total;
  }, [vaultBalances]);
  const pigLevel = getPigLevel(totalInvested);

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showGiftsModal, setShowGiftsModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activationLoading, setActivationLoading] = useState(false);
  const [activationMsg, setActivationMsg] = useState("");
  const [showProExplainer, setShowProExplainer] = useState(false);

  const mode = useAppMode();
  const { t, p, isPro } = useTerms();
  const modeReady = useAppModeReady();
  const { setMode, markProExplainerSeen, hasSeenProExplainer } =
    useAppModeActions();

  const shortAddress = walletAddress
    ? `${walletAddress.slice(0, 8)}...${walletAddress.slice(-8)}`
    : null;
  const handleCopy = useCallback(async () => {
    if (!walletAddress) return;
    playClick();
    await Clipboard.setStringAsync(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [walletAddress, playClick]);

  /**
   * O explicador é um portão *antes* da troca, não um aviso depois: quem toca
   * em "Pro" sem saber o que muda pode recuar sem nunca ter visto endereço
   * Stellar na tela. Voltar para o Lite nunca reabre o modal.
   */
  function handleSelectMode(next: AppMode) {
    playClick();
    if (next === mode) return;
    if (next === "pro" && !hasSeenProExplainer) {
      setShowProExplainer(true);
      return;
    }
    setMode(next);
  }

  function handleConfirmProMode() {
    setShowProExplainer(false);
    markProExplainerSeen();
    setMode("pro");
    playInvestirConfirmacao();
  }

  async function handleConfirmLogout() {
    setShowLogoutModal(false);
    await Promise.allSettled([logout(), disconnect()]);
    clearAuth();
    // Dado sensível (chave Pix, rascunho de KYC e URLs de documentos) não pode
    // sobreviver ao logout num aparelho que outra pessoa pode voltar a usar —
    // ver docs/security.md. hasBankAccount/hasWallet/receiverId são só um
    // cache local; o backend continua sendo a fonte de verdade no próximo login.
    useBlindPayStore.getState().resetOnboarding();
    usePixStore.getState().clearPixKey();
    router.replace("/(auth)");
  }

  async function handleRetryActivation() {
    if (!walletAddress || !walletAccountId || !contractId) return;
    setActivationLoading(true);
    setActivationMsg(t("wallet.activate.busy"));

    const result = await attemptActivation({
      userId: contractId,
      walletAccountId,
      stellarAddress: walletAddress,
    });

    if (result.success) {
      setIsActivated(true);
      setActivationMsg(t("wallet.activate.ok"));
    } else {
      setActivationMsg(t("wallet.activate.fail") + result.error);
    }
    setActivationLoading(false);
  }

  return (
    <>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <LinearGradient
          colors={["hsla(320, 90%, 58%, 0.18)", "hsla(270, 80%, 60%, 0.18)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.avatarContainer}>
            <Image
              source={
                PIG_IMAGES[pigLevel.label] ?? PIG_IMAGES["Porquinho Bebê"]
              }
              style={styles.avatarImage}
              resizeMode="contain"
            />
          </View>
          <View style={styles.userNameRow}>
            <Text style={styles.userName}>Investidor</Text>
            {isPro && (
              <View style={styles.proPill}>
                <Text style={styles.proPillText}>PRO</Text>
              </View>
            )}
          </View>
          {usdcBalance !== null && (
            <View style={styles.balancePill}>
              <MaterialIcons
                name="account-balance-wallet"
                size={12}
                color={Accent.primary}
              />
              <Text style={styles.balancePillText}>
                {p("balance.pill", { amount: usdcBalance })}
              </Text>
            </View>
          )}
        </LinearGradient>

        {/* ── Modo do app ── */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconWrap}>
              <MaterialIcons name="tune" size={16} color={Accent.primary} />
            </View>
            <Text style={styles.cardLabel}>Modo do app</Text>
          </View>
          <Text style={styles.hint}>
            {isPro
              ? "Você está no modo Pro: endereços, transações e termos técnicos ficam à vista."
              : "Modo simples, do jeito que a maioria usa. Ative o Pro quando quiser ver os detalhes técnicos."}
          </Text>
          <View style={styles.modeSwitchWrap}>
            <ModeSwitch
              mode={mode}
              onSelect={handleSelectMode}
              disabled={!modeReady}
            />
          </View>
        </Card>

        {/* ── Carteira ── */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconWrap}>
              <MaterialIcons
                name="credit-card"
                size={16}
                color={Accent.primary}
              />
            </View>
            <Text style={styles.cardLabel}>{t("wallet.title")}</Text>
          </View>

          {/* Address block */}
          <Pressable onPress={handleCopy} style={styles.addressBlock}>
            <View style={styles.addressContent}>
              <Text style={styles.addressLabel}>
                {t("wallet.address.label")}
              </Text>
              <MonoText style={styles.addressText} numberOfLines={1}>
                {shortAddress ?? t("wallet.address.empty")}
              </MonoText>
              {/* O endereço por extenso só serve a quem vai conferi-lo
                  caractere a caractere. No Lite a forma curta e o botão de
                  copiar dão conta. */}
              {isPro && walletAddress && (
                <MonoText style={styles.addressFull} numberOfLines={2} selectable>
                  {walletAddress}
                </MonoText>
              )}
            </View>
            <View style={[styles.copyBtn, copied && styles.copyBtnDone]}>
              <MaterialIcons
                name={copied ? "check" : "content-copy"}
                size={16}
                color={copied ? Accent.success : Accent.primary}
              />
            </View>
          </Pressable>

          {/* Activation status */}
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusChip,
                isActivated ? styles.statusChipOk : styles.statusChipPending,
              ]}
            >
              <MaterialIcons
                name={isActivated ? "check-circle" : "schedule"}
                size={13}
                color={isActivated ? Accent.success : Accent.accent}
              />
              <Text
                style={[
                  styles.statusChipText,
                  isActivated
                    ? styles.statusChipTextOk
                    : styles.statusChipTextPending,
                ]}
              >
                {isActivated
                  ? t("wallet.status.ok")
                  : t("wallet.status.pending")}
              </Text>
            </View>
            {!isActivated && (
              <Pressable
                onPress={activationLoading ? undefined : handleRetryActivation}
                hitSlop={8}
              >
                <Text style={styles.activateLink}>
                  {activationLoading ? "Ativando..." : t("wallet.activate.cta")}
                </Text>
              </Pressable>
            )}
          </View>
          {activationMsg ? (
            <Text style={styles.statusMsg}>{activationMsg}</Text>
          ) : null}

          <View style={styles.divider} />

          {/* No modo Pro a transferência entre carteiras é um CTA de primeira
              classe. No Lite ela sai de destaque — o caminho de saque esperado
              é o Pix — mas continua alcançável por um link discreto logo
              abaixo, porque escondê-la de todo deixaria sem saída o usuário com
              saldo e KYC recusado. */}
          {isPro && (
            <Pressable
              onPress={() => {
                playClick();
                setShowTransferModal(true);
              }}
            >
              <LinearGradient
                colors={["hsl(220, 90%, 58%)", "hsl(270, 80%, 60%)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.transferBtn}
              >
                <MaterialIcons name="send" size={16} color="#fff" />
                <Text style={styles.transferBtnText}>Transferir USDC</Text>
              </LinearGradient>
            </Pressable>
          )}
          <Pressable
            onPress={() => {
              playClick();
              setShowGiftsModal(true);
            }}
            style={{ marginTop: 10 }}
          >
            <LinearGradient
              colors={["hsl(330, 85%, 58%)", "hsl(270, 80%, 60%)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.transferBtn}
            >
              <MaterialIcons name="card-giftcard" size={16} color="#fff" />
              <Text style={styles.transferBtnText}>Meus presentes</Text>
            </LinearGradient>
          </Pressable>

          {!isPro && (
            <Pressable
              onPress={() => {
                playClick();
                setShowTransferModal(true);
              }}
              style={styles.subtleLink}
              hitSlop={8}
            >
              <Text style={styles.subtleLinkText}>{t("transfer.cta")}</Text>
            </Pressable>
          )}
        </Card>

        {/* ── Verificação de identidade (KYC) ── */}
        {kyc && (
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconWrap}>
                <MaterialIcons name="badge" size={16} color={Accent.primary} />
              </View>
              <Text style={styles.cardLabel}>Verificação de identidade</Text>
              <View style={styles.kycBadgeSlot}>
                <KycStatusBadge status={kyc.kycStatus} isLoading={kycLoading} />
              </View>
            </View>

            <Text style={styles.hint}>{kycStatusHint(kyc)}</Text>

            {/* O reenvio só aparece quando a BlindPay aceita nova tentativa.
                Motivos como fraude ou sanção não são corrigíveis pelo usuário —
                oferecer o botão ali só produziria uma segunda recusa. */}
            {kyc.canResubmit && (
              <PressableScale
                onPress={() => {
                  playClick();
                  router.push("/(blindpay-onboarding)" as any);
                }}
              >
                <LinearGradient
                  colors={Gradients.primary as [string, string]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.ctaBtn}
                >
                  <MaterialIcons name="refresh" size={16} color="#fff" />
                  <Text style={styles.ctaBtnText}>Refazer verificação</Text>
                </LinearGradient>
              </PressableScale>
            )}
          </Card>
        )}

        {/* ── Logout ── */}
        <Pressable
          onPress={() => {
            playClick();
            setShowLogoutModal(true);
          }}
          style={styles.logoutBtn}
        >
          <View style={styles.logoutInner}>
            <MaterialIcons name="logout" size={18} color={Accent.destructive} />
            <Text style={styles.logoutText}>Sair da Conta</Text>
          </View>
        </Pressable>

        {/*
          Zona de risco. A Apple exige que a exclusão de conta seja fácil de
          achar — enterrar em submenu é motivo de reprovação na revisão. Fica
          junto do logout, que é onde o usuário procura por "sair daqui".
        */}
        <View style={styles.dangerZone}>
          <View style={styles.dangerDivider} />
          <Text style={styles.dangerLabel}>Zona de risco</Text>
          <Pressable
            onPress={() => {
              playClick();
              router.push("/account/delete");
            }}
            style={styles.dangerBtn}
          >
            <View style={styles.logoutInner}>
              <MaterialIcons
                name="delete-outline"
                size={18}
                color={Accent.destructive}
              />
              <Text style={styles.dangerText}>Excluir minha conta</Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>

      <ConfirmModal
        visible={showProExplainer}
        title="Ativar o modo Pro?"
        description={
          "O modo Pro mostra a engrenagem por trás do PigFi. Você passa a ver:\n\n" +
          "•  O endereço completo da sua conta na rede\n" +
          "•  O comprovante de cada transação\n" +
          "•  Envio direto para outra conta, sem passar pelo Pix\n" +
          "•  Números com precisão completa, e termos como APY e cotas\n\n" +
          "Nada muda no seu dinheiro nem na sua conta — só no que aparece na tela. " +
          "Você pode voltar para o modo simples quando quiser, aqui no Perfil."
        }
        confirmLabel="Ativar modo Pro"
        cancelLabel="Agora não"
        variant="primary"
        onConfirm={handleConfirmProMode}
        onCancel={() => setShowProExplainer(false)}
      />

      <ConfirmModal
        visible={showLogoutModal}
        title="Sair da Conta"
        description="Tem certeza que deseja sair? Voce precisara reconectar sua carteira."
        confirmLabel="Sair"
        cancelLabel="Cancelar"
        variant="destructive"
        onConfirm={handleConfirmLogout}
        onCancel={() => setShowLogoutModal(false)}
      />

      <TransferModal
        visible={showTransferModal}
        onClose={() => setShowTransferModal(false)}
      />

      <MyGiftsModal
        visible={showGiftsModal}
        onClose={() => setShowGiftsModal(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  dangerZone: {
    marginTop: Spacing[8],
    paddingHorizontal: Spacing[4],
    gap: Spacing[3],
  },
  dangerDivider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  dangerLabel: {
    fontFamily: Font.semiBold,
    fontSize: FontSize.label,
    color: Colors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dangerBtn: {
    paddingVertical: Spacing[3],
  },
  dangerText: {
    fontFamily: Font.semiBold,
    fontSize: FontSize.bodySmall,
    color: Accent.destructive,
  },

  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    paddingBottom: 100,
  },

  // Header
  header: {
    alignItems: "center",
    paddingHorizontal: Spacing[6],
    paddingTop: 56,
    paddingBottom: Spacing[8],
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    gap: 10,
    marginBottom: Spacing[4],
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  avatarContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(244,52,180,0.12)",
    borderWidth: 2,
    borderColor: "rgba(244,52,180,0.3)",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: 80,
    height: 80,
  },
  userNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  userName: {
    fontSize: FontSize.subheading,
    fontFamily: Font.black,
    color: Colors.foreground,
  },
  // Deixa o modo legível em qualquer screenshot — o suporte precisa saber em
  // que modo o usuário está sem ter que perguntar.
  proPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.full,
    backgroundColor: "rgba(244,52,180,0.18)",
    borderWidth: 1,
    borderColor: Accent.primary,
  },
  proPillText: {
    fontSize: 10,
    fontFamily: Font.black,
    color: Accent.primary,
    letterSpacing: 0.5,
  },
  balancePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(244,52,180,0.12)",
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "rgba(244,52,180,0.2)",
  },
  balancePillText: {
    fontSize: FontSize.label,
    fontFamily: Font.black,
    color: Accent.primary,
  },

  // Cards
  card: {
    marginHorizontal: Spacing[4],
    marginBottom: Spacing[3],
    gap: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cardIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: "rgba(244,52,180,0.12)",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  kycBadgeSlot: {
    marginLeft: "auto",
  },
  cardLabel: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.bold,
    color: Colors.mutedForeground,
    flex: 1,
  },

  // Address block
  addressBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.muted,
    borderRadius: Radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  addressContent: {
    flex: 1,
    gap: 3,
  },
  addressLabel: {
    fontSize: 10,
    fontFamily: Font.bold,
    color: Colors.mutedForeground,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  addressText: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.black,
    color: Colors.foreground,
  },
  addressFull: {
    fontSize: FontSize.label,
    fontFamily: "monospace",
    color: Colors.mutedForeground,
    lineHeight: 18,
  },
  copyBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(244,52,180,0.1)",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
    borderWidth: 1,
    borderColor: "rgba(244,52,180,0.2)",
  },
  copyBtnDone: {
    backgroundColor: "rgba(34,197,94,0.1)",
    borderColor: "rgba(34,197,94,0.2)",
  },

  // Status
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
  },
  statusChipOk: {
    backgroundColor: "rgba(34,197,94,0.1)",
    borderColor: "rgba(34,197,94,0.25)",
  },
  statusChipPending: {
    backgroundColor: "rgba(245,158,11,0.1)",
    borderColor: "rgba(245,158,11,0.25)",
  },
  statusChipText: {
    fontSize: FontSize.label,
    fontFamily: Font.bold,
  },
  statusChipTextOk: { color: Accent.success },
  statusChipTextPending: { color: Accent.accent },
  activateLink: {
    fontSize: FontSize.label,
    fontFamily: Font.black,
    color: Accent.primary,
  },
  statusMsg: {
    fontSize: FontSize.label,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: -4,
  },

  // Transfer
  transferBtn: {
    height: 46,
    borderRadius: Radius.md,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  transferBtnText: {
    color: "#fff",
    fontSize: FontSize.bodySmall,
    fontFamily: Font.black,
  },

  // Texto de apoio compartilhado pelos cards
  hint: {
    fontSize: FontSize.label,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
    lineHeight: 18,
  },

  modeSwitchWrap: {
    marginTop: Spacing[3],
  },

  // Ação de baixa proeminência dentro de um card (saída alternativa no Lite)
  subtleLink: {
    marginTop: Spacing[3],
    alignItems: "center",
  },
  subtleLinkText: {
    fontSize: FontSize.label,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
    textDecorationLine: "underline",
  },

  // CTA gradiente reusado dentro de cards
  ctaBtn: {
    height: 50,
    borderRadius: Radius.md,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  ctaBtnText: {
    color: "#fff",
    fontSize: FontSize.bodySmall,
    fontFamily: Font.black,
  },
  // Logout
  logoutBtn: {
    marginHorizontal: Spacing[4],
    marginTop: Spacing[2],
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.25)",
    backgroundColor: "rgba(220,38,38,0.06)",
  },
  logoutInner: {
    height: 50,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  logoutText: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.black,
    color: Accent.destructive,
  },

});
