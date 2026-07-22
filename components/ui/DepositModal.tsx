import { useState, useEffect, useRef } from "react";
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
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useQueryClient } from "@tanstack/react-query";
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
  useCreateDeposit,
  useSubmitDeposit,
} from "@/lib/queries/deposits.queries";
import { vaultKeys } from "@/lib/queries/vaults.queries";
import { signXdr } from "@/lib/stellar/kit";
import { useSound } from "@/hooks/use-sound";
import { useAuthStore } from "@/lib/stores/auth.store";
import { useWalletBalance } from "@/lib/queries/wallets.queries";
import { findUsdcBalance } from "@/lib/api/wallets";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

const QUICK_VALUES = [10, 50, 100];

function friendlyError(raw: string): string {
  const s = raw.toLowerCase();
  if (s.includes('insufficient') || s.includes('balance') || s.includes('saldo') || s.includes('funds'))
    return 'Saldo insuficiente na carteira. Deposite USDC via "Depositar Fundos" antes de investir.';
  if (s.includes('network') || s.includes('timeout') || s.includes('econnrefused') || s.includes('fetch'))
    return 'Erro de conexao. Verifique sua internet e tente novamente.';
  if (s.includes('unauthorized') || s.includes('401') || s.includes('forbidden'))
    return 'Sessao expirada. Saia e entre novamente no app.';
  if (s.includes('minimum') || s.includes('minimo') || s.includes('min amount'))
    return 'Valor abaixo do minimo permitido.';
  return 'Nao foi possivel processar o investimento. Tente novamente em instantes.';
}

interface DepositModalProps {
  visible: boolean;
  vaultId: string;
  assetSymbol: string;
  apyValue?: number;
  /** Pre-fills the amount when the modal opens (e.g. chained from a gift claim). */
  initialAmount?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

type Step = "input" | "processing" | "signing" | "submitting" | "success";

export function DepositModal({
  visible,
  vaultId,
  assetSymbol,
  apyValue = 0,
  initialAmount,
  onClose,
  onSuccess,
}: DepositModalProps) {
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<Step>("input");
  const [errorMsg, setError] = useState("");
  const walletAddress = useAuthStore((s) => s.walletAddress);
  const createDeposit = useCreateDeposit();
  const submitDeposit = useSubmitDeposit();
  const qc = useQueryClient();
  const { data: walletBalances } = useWalletBalance(walletAddress);
  const usdcBalance = walletBalances ? findUsdcBalance(walletBalances) : "0";

  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const { playClick, playInvestirConfirmacao, playInvestirCoin } = useSound();

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const floatLoop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (visible && initialAmount) setAmount(initialAmount);
  }, [visible, initialAmount]);

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
          Animated.timing(floatAnim, { toValue: -12, duration: 1400, useNativeDriver: true }),
          Animated.timing(floatAnim, { toValue: 0,   duration: 1400, useNativeDriver: true }),
        ])
      );
      floatLoop.current.start();

      playInvestirConfirmacao();
      setTimeout(() => playInvestirCoin(), 350);
      setTimeout(() => playInvestirCoin(), 800);
      setTimeout(() => playInvestirCoin(), 1200);
    } else {
      floatLoop.current?.stop();
    }
  }, [step]);

  const handleConfirm = async () => {
    const value = parseFloat(amount);
    if (!value || value <= 0 || !vaultId) return;
    setError("");
    setStep("processing");
    try {
      const result = await createDeposit.mutateAsync({ vaultId, amount: value, assetSymbol });

      if (!result.unsignedXdr) {
        setError("Falha ao gerar transação. Tente novamente.");
        setStep("input");
        return;
      }

      setStep("signing");
      const signedXdr = await signXdr(result.unsignedXdr);

      setStep("submitting");
      await submitDeposit.mutateAsync({ depositId: result.id, signedXdr });

      setStep("success");
      qc.invalidateQueries({ queryKey: vaultKeys.all });
      if (walletAddress) {
        qc.invalidateQueries({ queryKey: vaultKeys.balance(vaultId, walletAddress) });
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Erro ao processar depósito");
      setStep("input");
    }
  };

  const handleClose = () => {
    setStep("input");
    setAmount("");
    setError("");
    onClose();
    onSuccess?.();
  };

  const amountNum = parseFloat(amount || "0");
  const annualYield = amountNum * (apyValue / 100);
  const isConfirmEnabled = !!amount && amountNum > 0;
  const isBlocked = step === "processing" || step === "signing" || step === "submitting";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={isBlocked ? undefined : handleClose}
    >
      <Pressable style={styles.backdrop} onPress={isBlocked ? undefined : handleClose}>
        <View style={{ paddingBottom: keyboardHeight }}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.handle} />

            {/* ── Header ── */}
            <View style={styles.headerRow}>
              <View style={styles.headerIcon}>
                <MaterialIcons name="arrow-downward" size={20} color={Accent.primary} />
              </View>
              <View style={styles.headerTextBlock}>
                <Text style={styles.headerTitle}>Investir no porquinho</Text>
                {apyValue > 0 && (
                  <Text style={styles.headerSub}>
                    Porquinho do PigFi · {apyValue.toFixed(2).replace(".", ",")}%/ano
                  </Text>
                )}
              </View>
              {!isBlocked && (
                <Pressable onPress={handleClose} hitSlop={12} style={styles.closeBtn}>
                  <MaterialIcons name="close" size={16} color={Colors.mutedForeground} />
                </Pressable>
              )}
            </View>

            {/* ── Input step ── */}
            {step === "input" && (
              <View style={styles.body}>
                <Text style={styles.availableLabel}>
                  Disponível na carteira:{" "}
                  <Text style={styles.availableValue}>${usdcBalance}</Text>
                </Text>

                {/* Big amount */}
                <View style={styles.amountRow}>
                  <Text style={styles.amountDollar}>$</Text>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="0,00"
                    placeholderTextColor="rgba(255,255,255,0.2)"
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="decimal-pad"
                    autoFocus
                    cursorColor={Accent.primary}
                  />
                </View>

                {/* Quick chips */}
                <View style={styles.quickRow}>
                  {QUICK_VALUES.map((v) => {
                    const isActive = amount === String(v);
                    return (
                      <Pressable
                        key={v}
                        onPress={() => { playClick(); setAmount(String(v)); }}
                        style={{ flex: 1 }}
                      >
                        {isActive ? (
                          <LinearGradient
                            colors={Gradients.primary}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={[styles.quickBtn, styles.quickBtnActive]}
                          >
                            <Text style={[styles.quickText, styles.quickTextActive]}>${v}</Text>
                          </LinearGradient>
                        ) : (
                          <View style={styles.quickBtn}>
                            <Text style={styles.quickText}>${v}</Text>
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                  {/* Tudo */}
                  <Pressable
                    onPress={() => { playClick(); setAmount(usdcBalance); }}
                    style={{ flex: 1 }}
                  >
                    {amount === usdcBalance && usdcBalance !== "0" ? (
                      <LinearGradient
                        colors={Gradients.primary}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.quickBtn, styles.quickBtnActive]}
                      >
                        <Text style={[styles.quickText, styles.quickTextActive]}>Tudo</Text>
                      </LinearGradient>
                    ) : (
                      <View style={styles.quickBtn}>
                        <Text style={styles.quickText}>Tudo</Text>
                      </View>
                    )}
                  </Pressable>
                </View>

                {/* Yield estimate */}
                <Text style={styles.yieldLabel}>
                  Rende cerca de{" "}
                  <Text style={styles.yieldValue}>${annualYield.toFixed(2)}</Text>
                  {" "}por ano
                </Text>

                {errorMsg ? (
                  <View style={styles.errorCard}>
                    <MaterialIcons name="error-outline" size={18} color={Accent.destructive} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={styles.errorCardTitle}>Ops, algo deu errado</Text>
                      <Text style={styles.errorCardMsg}>{friendlyError(errorMsg)}</Text>
                    </View>
                  </View>
                ) : null}

                {/* Confirm */}
                <Pressable
                  onPress={() => { playClick(); handleConfirm(); }}
                  disabled={!isConfirmEnabled}
                  style={{ alignSelf: "stretch" }}
                >
                  <LinearGradient
                    colors={Gradients.primary}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.confirmBtn, !isConfirmEnabled && styles.btnDisabled]}
                  >
                    <Text style={styles.confirmBtnText}>Confirmar investimento</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            )}

            {/* ── Processing / signing / submitting ── */}
            {isBlocked && (
              <View style={styles.centerBody}>
                <ActivityIndicator color={Accent.primary} size="large" />
                <Text style={styles.statusTitle}>
                  {step === "processing" && "Gerando transação..."}
                  {step === "signing" && "Assine com sua biometria..."}
                  {step === "submitting" && "Confirmando na Stellar..."}
                </Text>
                <Text style={styles.statusSub}>
                  {step === "processing" && "Preparando depósito no vault"}
                  {step === "signing" && "Use Face ID / Touch ID para autorizar"}
                  {step === "submitting" && "Transação em menos de 1s ⚡"}
                </Text>
              </View>
            )}

            {/* ── Success ── */}
            {step === "success" && (
              <View style={styles.centerBody}>
                <Animated.View style={{
                  transform: [
                    { scale: scaleAnim },
                    { translateY: floatAnim },
                  ],
                }}>
                  <Image
                    source={require("@/assets/images/pigfi_investir_porquinho.png")}
                    style={styles.successPig}
                    resizeMode="contain"
                  />
                </Animated.View>
                <Text style={styles.successTitle}>Investimento feito!</Text>
                <Text style={styles.statusSub}>
                  ${amount} já estão no seu porquinho,{"\n"}rendendo todo dia.
                </Text>
                <Pressable
                  onPress={() => { handleClose(); router.navigate("/(tabs)"); }}
                  style={{ alignSelf: "stretch" }}
                >
                  <LinearGradient
                    colors={Gradients.primary}
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
    backgroundColor: "rgba(244,52,180,0.15)",
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
  yieldLabel: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
    textAlign: "center",
  },
  yieldValue: {
    fontFamily: Font.black,
    color: Accent.success,
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
