import { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Share,
  Keyboard,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useQueryClient } from "@tanstack/react-query";
import {
  Colors,
  Accent,
  Font,
  FontSize,
  Radius,
  Spacing,
} from "@/constants/theme";
import { useAuthStore } from "@/lib/stores/auth.store";
import { useWalletBalance, walletKeys } from "@/lib/queries/wallets.queries";
import { findUsdcBalance } from "@/lib/api/wallets";
import { useCreateGift, giftKeys } from "@/lib/queries/gifts.queries";
import { CreatedGift } from "@/lib/api/gifts";
import { normalizeUsdcAmount, TransferError } from "@/lib/stellar/transfers";
import { signAndSubmitGiftFunding } from "@/lib/stellar/gifts";
import { authenticateWithDeviceBiometrics } from "@/lib/security/biometrics";
import { useSound } from "@/hooks/use-sound";

interface GiftModalProps {
  visible: boolean;
  onClose: () => void;
}

type Step = "input" | "creating" | "signing" | "success";

const GIFT_MIN_USD = 1;
const GIFT_MAX_USD = 100;
const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.pigfi.app";

const giftGradient = ["hsl(330, 85%, 58%)", "hsl(270, 80%, 60%)"] as const;

function buildShareMessage(code: string, amount: string): string {
  const referrer = encodeURIComponent(`utm_source=gift&gift_code=${code}`);
  const storeUrl = `${PLAY_STORE_URL}&referrer=${referrer}`;
  return (
    `Te dei um cofrinho com $${amount} em dólar no PigFi! 🐷💸\n\n` +
    `Baixe o app para resgatar: ${storeUrl}\n\n` +
    `Se o app pedir, use o código: ${code}`
  );
}

function errorMessage(error: unknown): string {
  if (error instanceof TransferError) return error.message;
  const status = (error as { response?: { status?: number } }).response?.status;
  const apiMessage = (error as { response?: { data?: { message?: string } } })
    .response?.data?.message;
  if (status === 409 && apiMessage?.includes("pending")) {
    return "Você já tem presentes pendentes demais. Aguarde o resgate ou a expiração.";
  }
  if (status === 503) {
    return "O serviço de presentes está indisponível no momento. Tente mais tarde.";
  }
  const raw = ((error as { message?: string }).message ?? "").toLowerCase();
  if (raw.includes("network") || raw.includes("timeout")) {
    return "Erro de conexão. Verifique sua internet e tente novamente.";
  }
  return "Não foi possível criar o presente. Tente novamente.";
}

export function GiftModal({ visible, onClose }: GiftModalProps) {
  const { height: windowHeight } = useWindowDimensions();
  const queryClient = useQueryClient();
  const walletAddress = useAuthStore((s) => s.walletAddress);
  const contractId = useAuthStore((s) => s.contractId);
  const { data: balances } = useWalletBalance(walletAddress);
  const usdcBalance = balances ? findUsdcBalance(balances) : "0";

  const createGift = useCreateGift();

  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<Step>("input");
  const [errorMsg, setErrorMsg] = useState("");
  const [gift, setGift] = useState<CreatedGift | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const { playClick, playInvestirConfirmacao, playQuestaoErrada } = useSound();

  useEffect(() => {
    const onShow = (e: { endCoordinates: { height: number } }) =>
      setKeyboardHeight(e.endCoordinates.height);
    const onHide = () => setKeyboardHeight(0);
    const subs = [
      Keyboard.addListener("keyboardWillShow", onShow),
      Keyboard.addListener("keyboardWillHide", onHide),
      Keyboard.addListener("keyboardDidShow", onShow),
      Keyboard.addListener("keyboardDidHide", onHide),
    ];
    return () => subs.forEach((s) => s.remove());
  }, []);

  const handleSend = async () => {
    if (!walletAddress) return;
    setErrorMsg("");

    let normalized: string;
    try {
      normalized = normalizeUsdcAmount(amount);
      const value = Number(normalized);
      if (value < GIFT_MIN_USD || value > GIFT_MAX_USD) {
        throw new TransferError(
          "INVALID_AMOUNT",
          `O presente deve ser entre $${GIFT_MIN_USD} e $${GIFT_MAX_USD}.`,
        );
      }
      if (value > Number(usdcBalance)) {
        throw new TransferError(
          "INSUFFICIENT_BALANCE",
          "Saldo USDC insuficiente.",
        );
      }
    } catch (error) {
      setErrorMsg(errorMessage(error));
      playQuestaoErrada();
      return;
    }

    const auth = await authenticateWithDeviceBiometrics({
      promptMessage: "Confirme para presentear",
      promptDescription: `Enviar $${normalized} USDC como presente`,
    });
    if (!auth.success) {
      setErrorMsg(auth.message ?? "Não foi possível confirmar sua identidade.");
      playQuestaoErrada();
      return;
    }

    try {
      // Reuse the intent if the on-chain step failed on a previous attempt
      // (avoids creating a duplicate gift for the same modal session).
      let created = gift;
      if (!created || created.amount !== normalized) {
        setStep("creating");
        created = await createGift.mutateAsync({ amount: normalized });
        setGift(created);
      }

      setStep("signing");
      await signAndSubmitGiftFunding({
        fromAddress: walletAddress,
        claimAgentAddress: created.claimAgentAddress,
        amount: created.amount,
        memo: created.memo,
        expiresAt: created.expiresAt,
      });

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: walletKeys.balance(walletAddress),
        }),
        queryClient.invalidateQueries({
          queryKey: giftKeys.all(contractId ?? ""),
        }),
      ]);
      setStep("success");
      playInvestirConfirmacao();
    } catch (error) {
      setErrorMsg(errorMessage(error));
      setStep("input");
      playQuestaoErrada();
    }
  };

  const handleShare = async () => {
    if (!gift) return;
    playClick();
    await Share.share({ message: buildShareMessage(gift.code, gift.amount) });
  };

  const handleClose = () => {
    setAmount("");
    setStep("input");
    setErrorMsg("");
    setGift(null);
    onClose();
  };

  let amountNum = 0;
  try {
    amountNum = Number(normalizeUsdcAmount(amount));
  } catch {}
  const canSend =
    amountNum >= GIFT_MIN_USD &&
    amountNum <= GIFT_MAX_USD &&
    amountNum <= Number(usdcBalance);
  const isBusy = step === "creating" || step === "signing";

  // O sheet precisa caber na área visível com o teclado aberto. O campo de valor
  // tem autoFocus, então o teclado sobe assim que o modal abre; com um maxHeight
  // fixo em 92% da tela, o sheet (que é empurrado pelo paddingBottom do teclado)
  // passava do limite visível e o botão "Presentear", no fim do ScrollView, ficava
  // escondido atrás do teclado. Quando o teclado fecha, o teto volta aos 94%.
  const sheetMaxHeight = Math.min(
    windowHeight * 0.94,
    Math.max(
      windowHeight * 0.5,
      windowHeight - keyboardHeight - Spacing[3],
    ),
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={isBusy ? undefined : handleClose}
    >
      <Pressable
        style={styles.backdrop}
        onPress={isBusy ? undefined : handleClose}
      >
        <View style={{ paddingBottom: keyboardHeight }}>
          <Pressable
            style={[styles.sheet, { maxHeight: sheetMaxHeight }]}
            onPress={() => {}}
          >
            <View style={styles.handle} />

            <View style={styles.headerRow}>
              <LinearGradient
                colors={giftGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.headerIcon}
              >
                <MaterialIcons name="card-giftcard" size={18} color="#fff" />
              </LinearGradient>
              <View style={styles.headerTextBlock}>
                <Text style={styles.headerTitle}>Presentear alguém</Text>
                <View style={styles.networkBadge}>
                  <View style={styles.networkDot} />
                  <Text style={styles.networkText}>
                    Cofrinho em dólar · USDC
                  </Text>
                </View>
              </View>
              {!isBusy && (
                <Pressable
                  onPress={handleClose}
                  hitSlop={12}
                  style={styles.closeBtn}
                >
                  <MaterialIcons
                    name="close"
                    size={16}
                    color={Colors.mutedForeground}
                  />
                </Pressable>
              )}
            </View>

            {step === "input" && (
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.body}>
                  <View style={styles.balanceRow}>
                    <MaterialIcons
                      name="account-balance-wallet"
                      size={14}
                      color={Colors.mutedForeground}
                    />
                    <Text style={styles.balanceLabel}>
                      Disponível:{" "}
                      <Text style={styles.balanceValue}>
                        ${usdcBalance} USDC
                      </Text>
                    </Text>
                  </View>

                  <View style={styles.amountRow}>
                    <Text style={styles.amountDollar}>$</Text>
                    <TextInput
                      style={styles.amountInput}
                      placeholder="0.00"
                      placeholderTextColor="rgba(255,255,255,0.2)"
                      value={amount}
                      onChangeText={setAmount}
                      keyboardType="decimal-pad"
                      autoFocus
                      cursorColor={Accent.secondary}
                      // O campo é centralizado e sempre focado, então o caret
                      // fica piscando sozinho no meio do valor sem indicar nada
                      // útil — o teclado já sinaliza que o campo está ativo.
                      caretHidden
                    />
                    <Text style={styles.amountAsset}>USDC</Text>
                  </View>

                  <View style={styles.warningRow}>
                    <MaterialIcons
                      name="card-giftcard"
                      size={14}
                      color={Colors.mutedForeground}
                    />
                    <Text style={styles.warningText}>
                      O presente vale para{" "}
                      <Text style={styles.warningBold}>
                        quem ainda não tem o PigFi
                      </Text>
                      . Quem receber tem{" "}
                      <Text style={styles.warningBold}>7 dias</Text> para
                      resgatar — depois disso o valor volta para você. Valor
                      entre ${GIFT_MIN_USD} e ${GIFT_MAX_USD}.
                    </Text>
                  </View>

                  {errorMsg ? (
                    <View style={styles.errorCard}>
                      <MaterialIcons
                        name="error-outline"
                        size={18}
                        color={Accent.destructive}
                      />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={styles.errorTitle}>
                          Presente não criado
                        </Text>
                        <Text style={styles.errorMsg}>{errorMsg}</Text>
                      </View>
                    </View>
                  ) : null}

                  <Pressable
                    onPress={() => {
                      playClick();
                      handleSend();
                    }}
                    disabled={!canSend}
                    style={{ alignSelf: "stretch" }}
                  >
                    <LinearGradient
                      colors={giftGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[
                        styles.confirmBtn,
                        !canSend && styles.btnDisabled,
                      ]}
                    >
                      <MaterialIcons
                        name="card-giftcard"
                        size={16}
                        color="#fff"
                      />
                      <Text style={styles.confirmBtnText}>Presentear</Text>
                    </LinearGradient>
                  </Pressable>
                </View>
              </ScrollView>
            )}

            {step === "creating" && (
              <View style={styles.centerBody}>
                <ActivityIndicator color={Accent.secondary} size="large" />
                <Text style={styles.statusTitle}>Preparando o presente...</Text>
                <Text style={styles.statusSub}>
                  Criando o cofrinho de presente no PigFi
                </Text>
              </View>
            )}

            {step === "signing" && (
              <View style={styles.centerBody}>
                <ActivityIndicator color={Accent.secondary} size="large" />
                <Text style={styles.statusTitle}>
                  Embrulhando o presente...
                </Text>
                <Text style={styles.statusSub}>
                  Reservando ${gift?.amount ?? amount} USDC na rede Stellar
                </Text>
              </View>
            )}

            {step === "success" && (
              <View style={styles.centerBody}>
                <LinearGradient
                  colors={giftGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.successIcon}
                >
                  <MaterialIcons name="card-giftcard" size={36} color="#fff" />
                </LinearGradient>
                <Text style={styles.successTitle}>Presente pronto!</Text>
                <Text style={styles.statusSub}>
                  ${gift?.amount} USDC embrulhados com sucesso.{"\n"}
                  Agora é só enviar o link para a pessoa presenteada.
                </Text>
                <Pressable
                  onPress={handleShare}
                  style={{ alignSelf: "stretch" }}
                >
                  <LinearGradient
                    colors={giftGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.confirmBtn}
                  >
                    <MaterialIcons name="share" size={16} color="#fff" />
                    <Text style={styles.confirmBtnText}>
                      Compartilhar presente
                    </Text>
                  </LinearGradient>
                </Pressable>
                <Pressable onPress={handleClose} style={styles.secondaryBtn}>
                  <Text style={styles.secondaryBtnText}>Fechar</Text>
                </Pressable>
              </View>
            )}
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: "hsl(330, 85%, 58%)",
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
  body: { gap: Spacing[4] },
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
  warningBold: {
    fontFamily: Font.black,
    color: Colors.foreground,
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
  errorTitle: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.black,
    color: Accent.destructive,
  },
  errorMsg: {
    fontSize: FontSize.label,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
    lineHeight: 18,
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
  secondaryBtn: {
    height: 44,
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.muted,
  },
  secondaryBtnText: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.black,
    color: Colors.foreground,
  },
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
});
