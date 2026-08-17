import { useState, useMemo, useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  Keyboard,
  Animated,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useQueryClient } from "@tanstack/react-query";
import {
  Colors,
  Accent,
  Font,
  FontSize,
  Radius,
  Spacing,
} from "@/constants/theme";
import {
  useCreateWithdrawal,
  useSubmitWithdrawal,
} from "@/lib/queries/withdrawals.queries";
import { vaultKeys } from "@/lib/queries/vaults.queries";
import { walletKeys } from "@/lib/queries/wallets.queries";
import { signXdr } from "@/lib/stellar/kit";
import { authenticateWithDeviceBiometrics } from "@/lib/security/biometrics";
import { useAuthStore } from "@/lib/stores/auth.store";
import { useSound } from "@/hooks/use-sound";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

// Blue → purple gradient exclusive to the withdraw flow
const WITHDRAW_GRADIENT = ["hsl(220, 90%, 58%)", "hsl(270, 80%, 60%)"] as const;

function friendlyError(raw: string): string {
  const s = raw.toLowerCase();
  if (
    s.includes("insufficient") ||
    s.includes("balance") ||
    s.includes("saldo") ||
    s.includes("funds")
  )
    return "Saldo insuficiente no porquinho para realizar o saque.";
  if (
    s.includes("network") ||
    s.includes("timeout") ||
    s.includes("econnrefused") ||
    s.includes("fetch")
  )
    return "Erro de conexao. Verifique sua internet e tente novamente.";
  if (
    s.includes("unauthorized") ||
    s.includes("401") ||
    s.includes("forbidden")
  )
    return "Sessao expirada. Saia e entre novamente no app.";
  if (s.includes("biometria") || s.includes("identidade")) return raw;
  if (s.includes("minimum") || s.includes("minimo") || s.includes("min amount"))
    return "Valor abaixo do minimo permitido para saque.";
  return "Nao foi possivel processar o saque. Tente novamente em instantes.";
}

interface WithdrawModalProps {
  visible: boolean;
  vaultId: string;
  dfTokens: string;
  underlyingBalance: string;
  assetSymbol: string;
  apyValue?: number;
  onClose: () => void;
}

type Step =
  | "input"
  | "authenticating"
  | "processing"
  | "signing"
  | "submitting"
  | "success";

export function WithdrawModal({
  visible,
  vaultId,
  dfTokens,
  underlyingBalance,
  assetSymbol,
  apyValue = 0,
  onClose,
}: WithdrawModalProps) {
  const [amount, setAmount] = useState("");
  const [activeChip, setActiveChip] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("input");
  const [errorMsg, setError] = useState("");
  const walletAddress = useAuthStore((s) => s.walletAddress);
  const createWithdrawal = useCreateWithdrawal();
  const submitWithdrawal = useSubmitWithdrawal();
  const qc = useQueryClient();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const { playClick, playRetirarConfirmacao, playInvestirCoin } = useSound();

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const floatLoop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    const onShow = (e: any) => setKeyboardHeight(e.endCoordinates.height);
    const onHide = () => setKeyboardHeight(0);
    const subs = [
      Keyboard.addListener("keyboardWillShow", onShow),
      Keyboard.addListener("keyboardWillHide", onHide),
      Keyboard.addListener("keyboardDidShow", onShow),
      Keyboard.addListener("keyboardDidHide", onHide),
    ];
    return () => subs.forEach((s) => s.remove());
  }, []);

  useEffect(() => {
    if (step === "success") {
      scaleAnim.setValue(0);
      floatAnim.setValue(0);

      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        damping: 7,
        mass: 0.7,
        stiffness: 130,
      }).start();

      floatLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, {
            toValue: -12,
            duration: 1400,
            useNativeDriver: true,
          }),
          Animated.timing(floatAnim, {
            toValue: 0,
            duration: 1400,
            useNativeDriver: true,
          }),
        ]),
      );
      floatLoop.current.start();

      playRetirarConfirmacao();
      setTimeout(() => playInvestirCoin(), 350);
      setTimeout(() => playInvestirCoin(), 800);
      setTimeout(() => playInvestirCoin(), 1200);
    } else {
      floatLoop.current?.stop();
    }
  }, [step]);

  const parsedUnderlying = parseFloat(underlyingBalance || "0");
  const parsedDfTokens = parseFloat(dfTokens || "0");
  const parsedAmount = parseFloat(amount || "0");

  // O chip "all" exibe o saldo arredondado a 2 casas (para caber no campo),
  // que pode arredondar pra cima e ficar levemente maior que o saldo real
  // (ex.: 34.7091061 -> "34.71"). Nesse caso o saque em si já usa o valor
  // exato via shareAmount/parsedDfTokens abaixo, então a validação de limite
  // deve ignorar o texto exibido e só checar se há saldo.
  const isWithinBalance =
    activeChip === "all"
      ? parsedUnderlying > 0
      : parsedAmount <= parsedUnderlying + 1e-6;

  const shareAmount = useMemo(() => {
    if (!parsedAmount || parsedUnderlying <= 0 || parsedDfTokens <= 0) return 0;
    if (activeChip === "all") return parsedDfTokens;
    return (parsedAmount / parsedUnderlying) * parsedDfTokens;
  }, [parsedAmount, parsedUnderlying, parsedDfTokens, activeChip]);

  const handleChipSelect = (chip: string) => {
    playClick();
    setActiveChip(chip);
    if (chip === "25") setAmount((parsedUnderlying * 0.25).toFixed(2));
    if (chip === "50") setAmount((parsedUnderlying * 0.5).toFixed(2));
    if (chip === "all") setAmount(parsedUnderlying.toFixed(2));
  };

  const handleAmountChange = (text: string) => {
    setAmount(text);
    setActiveChip(null);
  };

  const handleWithdraw = async () => {
    if (parsedAmount <= 0 || !isWithinBalance) return;
    setError("");
    setStep("authenticating");
    try {
      const biometricResult = await authenticateWithDeviceBiometrics({
        promptMessage: "Confirme o saque",
        promptSubtitle: "Saque do porquinho PigFi",
        promptDescription: `Autorize o saque de $${parsedAmount.toFixed(2)} ${assetSymbol}.`,
      });

      if (!biometricResult.success) {
        setError(
          biometricResult.message ??
            "Biometria não confirmada. Tente novamente.",
        );
        setStep("input");
        return;
      }

      setStep("processing");
      const result = await createWithdrawal.mutateAsync({
        vaultId,
        shares: shareAmount,
      });

      if (!result.unsignedXdr) throw new Error("XDR não gerado");

      setStep("signing");
      const signedXdr = await signXdr(result.unsignedXdr);

      setStep("submitting");
      await submitWithdrawal.mutateAsync({
        withdrawalId: result.id,
        signedXdr,
      });

      setStep("success");
      qc.invalidateQueries({ queryKey: vaultKeys.all });
      if (walletAddress) {
        qc.invalidateQueries({
          queryKey: vaultKeys.balance(vaultId, walletAddress),
        });
        qc.invalidateQueries({ queryKey: walletKeys.balance(walletAddress) });
      }
    } catch (e: any) {
      setError(
        e?.response?.data?.message || e?.message || "Erro ao processar saque",
      );
      setStep("input");
    }
  };

  const handleClose = () => {
    if (isBlocked) return;
    setStep("input");
    setAmount("");
    setActiveChip(null);
    setError("");
    onClose();
  };

  const isConfirmEnabled = !!amount && parsedAmount > 0 && isWithinBalance;
  const isBlocked =
    step === "authenticating" ||
    step === "processing" ||
    step === "signing" ||
    step === "submitting";
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={isBlocked ? undefined : handleClose}
    >
      <Pressable
        style={styles.backdrop}
        onPress={isBlocked ? undefined : handleClose}
      >
        <View style={{ paddingBottom: keyboardHeight }}>
          <Pressable
            style={[styles.sheet, { paddingBottom: Spacing[8] + insets.bottom }]}
            onPress={() => {}}
          >
            <View style={styles.handle} />

            {/* ── Header ── */}
            <View style={styles.headerRow}>
              <View style={styles.headerIcon}>
                <MaterialIcons
                  name="arrow-upward"
                  size={20}
                  color={WITHDRAW_GRADIENT[0]}
                />
              </View>
              <View style={styles.headerTextBlock}>
                <Text style={styles.headerTitle}>Sacar do porquinho</Text>
                {apyValue > 0 && (
                  <Text style={styles.headerSub}>
                    Porquinho do PigFi · {apyValue.toFixed(2).replace(".", ",")}
                    %/ano
                  </Text>
                )}
              </View>
              {!isBlocked && (
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

            {/* ── Input step ── */}
            {step === "input" && (
              <View style={styles.body}>
                {/* Invested balance */}
                <Text style={styles.availableLabel}>
                  Investido neste porquinho:{" "}
                  <Text style={styles.availableValue}>
                    ${parsedUnderlying.toFixed(2)}
                  </Text>
                </Text>

                {/* Big amount */}
                <View style={styles.amountRow}>
                  <Text style={styles.amountDollar}>$</Text>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="0,00"
                    placeholderTextColor="rgba(255,255,255,0.2)"
                    value={amount}
                    onChangeText={handleAmountChange}
                    keyboardType="decimal-pad"
                    autoFocus
                    cursorColor={WITHDRAW_GRADIENT[0]}
                    // O campo é centralizado e sempre focado, então o caret
                    // fica piscando sozinho no meio do valor sem indicar nada
                    // útil — o teclado já sinaliza que o campo está ativo.
                    caretHidden
                  />
                </View>

                {/* Percentage chips */}
                <View style={styles.quickRow}>
                  {(["25", "50"] as const).map((chip) => {
                    const isActive = activeChip === chip;
                    return (
                      <Pressable
                        key={chip}
                        onPress={() => handleChipSelect(chip)}
                        style={{ flex: 1 }}
                      >
                        {isActive ? (
                          <LinearGradient
                            colors={WITHDRAW_GRADIENT}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={[styles.quickBtn, styles.quickBtnActive]}
                          >
                            <Text
                              style={[styles.quickText, styles.quickTextActive]}
                            >
                              {chip}%
                            </Text>
                          </LinearGradient>
                        ) : (
                          <View style={styles.quickBtn}>
                            <Text style={styles.quickText}>{chip}%</Text>
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                  {/* Tudo */}
                  <Pressable
                    onPress={() => handleChipSelect("all")}
                    style={{ flex: 1 }}
                  >
                    {activeChip === "all" ? (
                      <LinearGradient
                        colors={WITHDRAW_GRADIENT}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.quickBtn, styles.quickBtnActive]}
                      >
                        <Text
                          style={[styles.quickText, styles.quickTextActive]}
                        >
                          Tudo
                        </Text>
                      </LinearGradient>
                    ) : (
                      <View style={styles.quickBtn}>
                        <Text style={styles.quickText}>Tudo</Text>
                      </View>
                    )}
                  </Pressable>
                </View>

                {/* Hint */}
                <Text style={styles.hintLabel}>
                  Cai na sua carteira{" "}
                  <Text style={styles.hintBold}>na hora</Text>
                </Text>

                {errorMsg ? (
                  <View style={styles.errorCard}>
                    <MaterialIcons
                      name="error-outline"
                      size={18}
                      color={Accent.destructive}
                    />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={styles.errorCardTitle}>
                        Ops, algo deu errado
                      </Text>
                      <Text style={styles.errorCardMsg}>
                        {friendlyError(errorMsg)}
                      </Text>
                    </View>
                  </View>
                ) : null}

                {/* Confirm button */}
                <Pressable
                  onPress={() => {
                    playClick();
                    handleWithdraw();
                  }}
                  disabled={!isConfirmEnabled}
                  style={{ alignSelf: "stretch" }}
                >
                  <LinearGradient
                    colors={WITHDRAW_GRADIENT}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                      styles.confirmBtn,
                      !isConfirmEnabled && styles.btnDisabled,
                    ]}
                  >
                    <Text style={styles.confirmBtnText}>Confirmar saque</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            )}

            {/* ── Processing / signing / submitting ── */}
            {isBlocked && (
              <View style={styles.centerBody}>
                <ActivityIndicator color={WITHDRAW_GRADIENT[0]} size="large" />
                <Text style={styles.statusTitle}>
                  {step === "authenticating" && "Confirme com sua biometria..."}
                  {step === "processing" && "Gerando transação..."}
                  {step === "signing" && "Assine com sua biometria..."}
                  {step === "submitting" && "Processando na Stellar..."}
                </Text>
                <Text style={styles.statusSub}>
                  {step === "authenticating" &&
                    "Protegendo seu saque antes de continuar"}
                  {step === "processing" && "Preparando saque do vault"}
                  {step === "signing" &&
                    "Use Face ID / Touch ID para autorizar"}
                  {step === "submitting" && "Enviando para sua carteira ⚡"}
                </Text>
              </View>
            )}

            {/* ── Success ── */}
            {step === "success" && (
              <View style={styles.centerBody}>
                <Animated.View
                  style={{
                    transform: [
                      { scale: scaleAnim },
                      { translateY: floatAnim },
                    ],
                  }}
                >
                  <Image
                    source={require("@/assets/images/pigfi_tirar_do_porquinho.png")}
                    style={styles.successPig}
                    resizeMode="contain"
                  />
                </Animated.View>
                <Text style={styles.successTitle}>Saque concluído!</Text>
                <Text style={styles.statusSub}>
                  ${parsedAmount.toFixed(2)} já caíram na sua carteira.
                </Text>
                <Pressable
                  onPress={() => {
                    handleClose();
                    router.navigate("/(tabs)");
                  }}
                  style={{ alignSelf: "stretch" }}
                >
                  <LinearGradient
                    colors={WITHDRAW_GRADIENT}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.confirmBtn}
                  >
                    <Text style={styles.confirmBtnText}>Ir para início</Text>
                  </LinearGradient>
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
    backgroundColor: "rgba(0,0,0,0.7)",
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
    gap: 10,
    marginBottom: Spacing[6],
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "rgba(100,140,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  headerTextBlock: {
    flex: 1,
    gap: 3,
  },
  headerTitle: {
    fontSize: FontSize.body,
    fontFamily: Font.black,
    color: Colors.foreground,
  },
  headerSub: {
    fontSize: FontSize.label,
    fontFamily: Font.semiBold,
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
  body: {
    gap: Spacing[4],
  },
  availableLabel: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
    textAlign: "center",
  },
  availableValue: {
    fontFamily: Font.bold,
    color: Colors.foreground,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingVertical: Spacing[2],
  },
  amountDollar: {
    fontSize: 38,
    fontFamily: Font.black,
    color: Colors.foreground,
    lineHeight: 48,
  },
  amountInput: {
    minWidth: 60,
    maxWidth: 240,
    fontFamily: Font.black,
    fontSize: 48,
    color: Colors.foreground,
    padding: 0,
    lineHeight: 56,
  },
  quickRow: {
    flexDirection: "row",
    gap: 8,
  },
  quickBtn: {
    height: 42,
    borderRadius: Radius.md,
    backgroundColor: Colors.muted,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  quickBtnActive: {
    backgroundColor: "transparent",
    borderColor: "transparent",
  },
  quickText: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.black,
    color: Colors.mutedForeground,
  },
  quickTextActive: {
    color: "#fff",
  },
  hintLabel: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
    textAlign: "center",
  },
  hintBold: {
    fontFamily: Font.black,
    color: Colors.foreground,
  },
  confirmBtn: {
    height: 54,
    borderRadius: Radius.lg,
    justifyContent: "center",
    alignItems: "center",
  },
  btnDisabled: {
    opacity: 0.35,
  },
  confirmBtnText: {
    color: "#fff",
    fontSize: FontSize.body,
    fontFamily: Font.black,
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
  errorCardTitle: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.black,
    color: Accent.destructive,
  },
  errorCardMsg: {
    fontSize: FontSize.label,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
    lineHeight: 18,
  },
  centerBody: {
    alignItems: "center",
    gap: 14,
    paddingVertical: Spacing[8],
  },
  statusTitle: {
    fontSize: FontSize.subheading,
    fontFamily: Font.black,
    color: Colors.foreground,
    textAlign: "center",
  },
  successTitle: {
    fontSize: FontSize.heading,
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
  successPig: {
    width: 200,
    height: 200,
  },
});
