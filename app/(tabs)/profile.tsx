import { useCallback, useMemo, useState } from "react";
import {
  Image,
  Pressable,
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Modal,
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
  Input,
  ConfirmModal,
  TransferModal,
  MyGiftsModal,
  getPigLevel,
} from "@/components/ui";
import { useSmartAccount } from "@/hooks/use-smart-account";
import { useSound } from "@/hooks/use-sound";
import { usePixStore } from "@/lib/stores/pix.store";
import { useAuthStore } from "@/lib/stores/auth.store";
import { useBlindPayStore } from "@/lib/stores/blindpay.store";
import { useQueryClient } from "@tanstack/react-query";
import { useWalletBalance, walletKeys } from "@/lib/queries/wallets.queries";
import { useAllVaultBalances } from "@/lib/queries/vaults.queries";
import { usePrivy } from "@privy-io/expo";
import { swapXlmForUsdc, SwapError, SwapResult } from "@/lib/stellar/swap";

import {
  findUsdcBalance,
  getActivationXdr,
  submitActivation,
} from "@/lib/api/wallets";
import { useSubmitTrustlineXdr } from "@/lib/queries/etherfuse-ramp.queries";
import { signTrustlineXdr, signXdr } from "@/lib/stellar/kit";
import * as Clipboard from "expo-clipboard";

const PIG_IMAGES: Record<string, any> = {
  "Porquinho Bebê": require("@/assets/images/pig_babe.png"),
  "Porquinho Esperto": require("@/assets/images/pig1.png"),
  "Porquinho Forte": require("@/assets/images/pig-muscle.png"),
  "Porquinho Dourado": require("@/assets/images/pig-gold.png"),
  "Porquinho Rei": require("@/assets/images/pig-king.png"),
};
export default function ProfileScreen() {
  const walletAddress = useAuthStore((s) => s.walletAddress);
  const walletAccountId = useAuthStore((s) => s.walletAccountId);
  const contractId = useAuthStore((s) => s.contractId);
  const isActivated = useAuthStore((s) => s.isActivated);
  const setIsActivated = useAuthStore((s) => s.setIsActivated);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const { pixKey, setPixKey } = usePixStore();
  const { disconnect } = useSmartAccount();
  const { logout } = usePrivy();
  const { playClick, playInvestirConfirmacao, playQuestaoErrada } = useSound();

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
  const [pixInput, setPixInput] = useState(pixKey);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [trustlineLoading, setTrustlineLoading] = useState(false);
  const [trustlineMsg, setTrustlineMsg] = useState("");
  const [activationLoading, setActivationLoading] = useState(false);
  const [activationMsg, setActivationMsg] = useState("");

  const [showSwapModal, setShowSwapModal] = useState(false);
  const [swapAmount, setSwapAmount] = useState("");
  const [swapStep, setSwapStep] = useState<
    "input" | "review" | "signing" | "success" | "error"
  >("input");
  const [swapLoading, setSwapLoading] = useState(false);
  const [swapError, setSwapError] = useState("");
  const [swapResult, setSwapResult] = useState<SwapResult | null>(null);
  const queryClient = useQueryClient();

  const submitTrustline = useSubmitTrustlineXdr();

  const shortAddress = walletAddress
    ? `${walletAddress.slice(0, 8)}...${walletAddress.slice(-8)}`
    : null;
  const initials = walletAddress
    ? walletAddress.slice(0, 2).toUpperCase()
    : "??";

  const handleCopy = useCallback(async () => {
    if (!walletAddress) return;
    playClick();
    await Clipboard.setStringAsync(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [walletAddress, playClick]);

  function handleSavePix() {
    if (!pixInput.trim()) return;
    setPixKey(pixInput.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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

  async function handleSetupTrustline() {
    if (!walletAddress) return;
    setTrustlineLoading(true);
    setTrustlineMsg("Configurando trustline...");
    try {
      const signedXdr = await signTrustlineXdr(walletAddress);
      const { hash } = await submitTrustline.mutateAsync({
        signedXdr,
        stellarAddress: walletAddress,
      });
      setTrustlineMsg(`Trustline ativada! Tx: ${hash.slice(0, 12)}...`);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "";
      if (msg.includes("already exists") || msg.includes("op_already_exists")) {
        setTrustlineMsg("Trustline ja esta ativa");
      } else {
        setTrustlineMsg("Erro ao configurar trustline");
      }
    } finally {
      setTrustlineLoading(false);
    }
  }

  async function handleRetryActivation() {
    if (!walletAddress || !walletAccountId || !contractId) return;
    setActivationLoading(true);
    setActivationMsg("Ativando conta Stellar...");
    try {
      const { unsignedXdr } = await getActivationXdr({
        userId: contractId,
        walletAccountId,
        stellarAddress: walletAddress,
      });
      const signed = await signXdr(unsignedXdr);
      await submitActivation({ walletAccountId, signedXdr: signed });
      setIsActivated(true);
      setActivationMsg("Conta ativada com sucesso!");
    } catch (err: any) {
      const detail =
        err?.response?.data?.message ?? err?.message ?? "Erro desconhecido";
      setActivationMsg("Nao foi possivel ativar: " + detail);
    } finally {
      setActivationLoading(false);
    }
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
          <Text style={styles.userName}>Investidor</Text>
          {usdcBalance !== null && (
            <View style={styles.balancePill}>
              <MaterialIcons
                name="account-balance-wallet"
                size={12}
                color={Accent.primary}
              />
              <Text style={styles.balancePillText}>${usdcBalance} USDC</Text>
            </View>
          )}
        </LinearGradient>

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
            <Text style={styles.cardLabel}>Carteira Digital</Text>
          </View>

          {/* Address block */}
          <Pressable onPress={handleCopy} style={styles.addressBlock}>
            <View style={styles.addressContent}>
              <Text style={styles.addressLabel}>Endereço Stellar</Text>
              <Text style={styles.addressText} numberOfLines={1}>
                {shortAddress ?? "Nenhuma carteira"}
              </Text>
              {walletAddress && (
                <Text style={styles.addressFull} numberOfLines={2} selectable>
                  {walletAddress}
                </Text>
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
                {isActivated ? "Conta ativada" : "Conta nao ativada"}
              </Text>
            </View>
            {!isActivated && (
              <Pressable
                onPress={activationLoading ? undefined : handleRetryActivation}
                hitSlop={8}
              >
                <Text style={styles.activateLink}>
                  {activationLoading ? "Ativando..." : "Ativar agora"}
                </Text>
              </Pressable>
            )}
          </View>
          {activationMsg ? (
            <Text style={styles.statusMsg}>{activationMsg}</Text>
          ) : null}

          {/* Divider + Transfer button */}
          <View style={styles.divider} />
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
        </Card>

        {/* ── Chave PIX ── */}
        {false && (
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconWrap}>
                <MaterialIcons name="key" size={16} color={Accent.primary} />
              </View>
              <Text style={styles.cardLabel}>Chave PIX para Saques</Text>
            </View>
            <Text style={styles.hint}>
              Cadastre sua chave PIX aqui. Saques serao enviados exclusivamente
              para esta chave.
            </Text>
            <Input
              placeholder="CPF, e-mail, telefone ou chave aleatoria"
              value={pixInput}
              onChangeText={setPixInput}
              style={styles.pixInput}
            />
            <Pressable
              onPress={handleSavePix}
              disabled={!pixInput.trim() || saved}
            >
              <LinearGradient
                colors={
                  saved
                    ? [Accent.success, "hsl(145, 70%, 38%)"]
                    : (Gradients.primary as [string, string])
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.saveBtn,
                  (!pixInput.trim() || saved) && styles.saveBtnDisabled,
                ]}
              >
                <MaterialIcons
                  name={saved ? "check" : "save"}
                  size={16}
                  color="#fff"
                />
                <Text style={styles.saveBtnText}>
                  {saved ? "Salvo!" : "Salvar Chave PIX"}
                </Text>
              </LinearGradient>
            </Pressable>
          </Card>
        )}

        {/* ── Trustline ── */}
        {false && isActivated && walletAddress && (
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconWrap}>
                <MaterialIcons name="link" size={16} color={Accent.primary} />
              </View>
              <Text style={styles.cardLabel}>Trustline USDC</Text>
            </View>
            <Text style={styles.hint}>
              Necessaria para receber USDC na rede Stellar.
            </Text>
            <Pressable
              onPress={trustlineLoading ? undefined : handleSetupTrustline}
              style={styles.trustlineActionRow}
            >
              <MaterialIcons
                name="settings"
                size={14}
                color={Accent.secondary}
              />
              <Text style={styles.trustlineAction}>
                {trustlineLoading ? "Configurando..." : "Configurar Trustline"}
              </Text>
            </Pressable>
            {trustlineMsg ? (
              <Text style={styles.statusMsg}>{trustlineMsg}</Text>
            ) : null}
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
      </ScrollView>

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

      {/* Swap XLM → USDC Modal */}
      <Modal
        visible={showSwapModal}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => {
          setShowSwapModal(false);
          setSwapLoading(false);
        }}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => {
            setShowSwapModal(false);
            setSwapLoading(false);
          }}
        >
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.handle} />

            <View style={styles.headerRow}>
              <LinearGradient
                colors={["hsl(150, 80%, 45%)", "hsl(190, 80%, 50%)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.headerIcon}
              >
                <MaterialIcons name="swap-horiz" size={18} color="#fff" />
              </LinearGradient>
              <View style={styles.headerTextBlock}>
                <Text style={styles.headerTitle}>Swap XLM → USDC</Text>
                <View style={styles.networkBadge}>
                  <View style={styles.networkDot} />
                  <Text style={styles.networkText}>Stellar Testnet</Text>
                </View>
              </View>
              <Pressable
                onPress={() => {
                  setShowSwapModal(false);
                  setSwapLoading(false);
                }}
                hitSlop={12}
                style={styles.closeBtn}
              >
                <MaterialIcons
                  name="close"
                  size={16}
                  color={Colors.mutedForeground}
                />
              </Pressable>
            </View>

            {swapStep === "input" && (
              <View style={styles.body2}>
                <Text style={styles.fieldLabel}>
                  Quanto USDC você quer receber?
                </Text>
                <View style={styles.amountRow}>
                  <Text style={styles.amountDollar}>$</Text>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="0.00"
                    placeholderTextColor="rgba(255,255,255,0.2)"
                    value={swapAmount}
                    onChangeText={setSwapAmount}
                    keyboardType="decimal-pad"
                    autoFocus
                    cursorColor={Accent.secondary}
                  />
                  <Text style={styles.amountAsset}>USDC</Text>
                </View>

                <View style={styles.warningRow}>
                  <MaterialIcons
                    name="info-outline"
                    size={14}
                    color={Colors.mutedForeground}
                  />
                  <Text style={styles.warningText}>
                    Você trocará XLM pelo valor equivalente em USDC com base na
                    liquidez disponível na testnet.
                  </Text>
                </View>

                {swapError ? (
                  <View style={styles.errorCard}>
                    <MaterialIcons
                      name="error-outline"
                      size={18}
                      color={Accent.destructive}
                    />
                    <Text style={[styles.errorMsg, { flex: 1 }]}>
                      {swapError}
                    </Text>
                  </View>
                ) : null}

                <Pressable
                  onPress={() => {
                    playClick();
                    const amt = swapAmount.trim().replace(",", ".");
                    if (!amt || Number(amt) <= 0) {
                      setSwapError("Informe um valor válido.");
                      return;
                    }
                    setSwapError("");
                    setSwapLoading(true);
                    setSwapStep("signing");
                    (async () => {
                      try {
                        const result = await swapXlmForUsdc(
                          walletAddress!,
                          amt,
                        );
                        setSwapResult(result);
                        await queryClient.invalidateQueries({
                          queryKey: walletKeys.balance(walletAddress!),
                        });
                        setSwapStep("success");
                        playInvestirConfirmacao();
                      } catch (err: any) {
                        setSwapError(
                          err instanceof SwapError
                            ? err.message
                            : (err?.message ?? "Erro ao realizar swap."),
                        );
                        setSwapStep("input");
                        playQuestaoErrada();
                      } finally {
                        setSwapLoading(false);
                      }
                    })();
                  }}
                  disabled={!swapAmount.trim() || swapLoading}
                >
                  <LinearGradient
                    colors={["hsl(150, 80%, 45%)", "hsl(190, 80%, 50%)"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                      styles.confirmBtn,
                      (!swapAmount.trim() || swapLoading) && styles.btnDisabled,
                    ]}
                  >
                    <MaterialIcons name="swap-horiz" size={16} color="#fff" />
                    <Text style={styles.confirmBtnText}>Iniciar Swap</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            )}

            {swapStep === "signing" && (
              <View style={styles.centerBody}>
                <ActivityIndicator color={Accent.secondary} size="large" />
                <Text style={styles.statusTitle}>
                  Assine com sua biometria...
                </Text>
                <Text style={styles.statusSub}>
                  Use Face ID / Touch ID para autorizar a troca
                </Text>
              </View>
            )}

            {swapStep === "success" && swapResult && (
              <View style={styles.centerBody}>
                <LinearGradient
                  colors={[Accent.success, "hsl(145, 70%, 38%)"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.successIcon}
                >
                  <MaterialIcons name="check" size={36} color="#fff" />
                </LinearGradient>
                <Text style={styles.successTitle}>Swap realizado!</Text>
                <Text style={styles.statusSub}>
                  {swapResult.usdcReceived} USDC recebidos{"\n"}
                  Gastou ~{Number(swapResult.xlmSpent).toFixed(2)} XLM (taxa:{" "}
                  {swapResult.rate} XLM/USDC)
                </Text>
                {swapResult.hash ? (
                  <Text style={styles.txHash} numberOfLines={1}>
                    Tx: {swapResult.hash.slice(0, 12)}...
                    {swapResult.hash.slice(-8)}
                  </Text>
                ) : null}
                <Pressable
                  onPress={() => {
                    setShowSwapModal(false);
                    setSwapLoading(false);
                  }}
                  style={{ alignSelf: "stretch" }}
                >
                  <LinearGradient
                    colors={[Accent.success, "hsl(145, 70%, 38%)"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.confirmBtn}
                  >
                    <Text style={styles.confirmBtnText}>Fechar</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
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
  userName: {
    fontSize: FontSize.subheading,
    fontFamily: Font.black,
    color: Colors.foreground,
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

  // PIX
  hint: {
    fontSize: FontSize.label,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
    lineHeight: 18,
  },
  pixInput: {
    height: 48,
  },
  saveBtn: {
    height: 50,
    borderRadius: Radius.md,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: {
    color: "#fff",
    fontSize: FontSize.bodySmall,
    fontFamily: Font.black,
  },

  // Trustline
  trustlineActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  trustlineAction: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.bold,
    color: Accent.secondary,
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

  // Swap Modal styles
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: Spacing[6],
    paddingTop: Spacing[3],
    paddingBottom: Spacing[8],
    borderTopWidth: 1,
    borderColor: Colors.border,
    maxHeight: "92%",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.muted,
    alignSelf: "center",
    marginBottom: Spacing[4],
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  headerTextBlock: { flex: 1, gap: 4 },
  headerTitle: {
    fontSize: FontSize.body,
    fontFamily: Font.black,
    color: Colors.foreground,
  },
  networkBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    backgroundColor: Colors.muted,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  networkDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "hsl(150, 80%, 45%)",
  },
  networkText: {
    fontSize: FontSize.label,
    fontFamily: Font.bold,
    color: Colors.mutedForeground,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.muted,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  body2: { gap: Spacing[4] },
  centerBody: {
    alignItems: "center",
    gap: 16,
    paddingVertical: Spacing[8],
  },
  statusTitle: {
    fontSize: FontSize.subheading,
    fontFamily: Font.black,
    color: Colors.foreground,
    textAlign: "center",
  },
  statusSub: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
    textAlign: "center",
    lineHeight: 22,
  },
  confirmBtn: {
    height: 54,
    borderRadius: Radius.lg,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  btnDisabled: { opacity: 0.35 },
  confirmBtnText: {
    color: "#fff",
    fontSize: FontSize.body,
    fontFamily: Font.black,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  successTitle: {
    fontSize: FontSize.heading,
    fontFamily: Font.black,
    color: Colors.foreground,
  },
  txHash: {
    fontSize: FontSize.label,
    fontFamily: Font.bold,
    color: Colors.mutedForeground,
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  balanceLabel: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
  },
  balanceValue: {
    fontFamily: Font.black,
    color: Colors.foreground,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: Spacing[2],
  },
  amountDollar: {
    fontSize: 36,
    fontFamily: Font.black,
    color: Colors.foreground,
    lineHeight: 46,
  },
  amountInput: {
    minWidth: 60,
    maxWidth: 200,
    fontFamily: Font.black,
    fontSize: 46,
    color: Colors.foreground,
    padding: 0,
    lineHeight: 54,
  },
  amountAsset: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.bold,
    color: Colors.mutedForeground,
    alignSelf: "flex-end",
    paddingBottom: 8,
    marginLeft: 2,
  },
  fieldLabel: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.bold,
    color: Colors.foreground,
  },
  warningRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    backgroundColor: Colors.muted,
    borderRadius: Radius.sm,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  warningText: {
    flex: 1,
    fontSize: FontSize.label,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
    lineHeight: 18,
  },
  errorCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "rgba(220,38,38,0.08)",
    borderRadius: Radius.md,
    padding: Spacing[3],
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.2)",
  },
  errorMsg: {
    fontSize: FontSize.label,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
    lineHeight: 18,
  },
});
