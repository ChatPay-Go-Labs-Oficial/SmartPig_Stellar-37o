import { useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Clipboard from "expo-clipboard";
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
import {
  normalizeUsdcAmount,
  signAndSubmitTransfer,
  TransferError,
  validateTransferFields,
  validateUsdcDestination,
} from "@/lib/stellar/transfers";
import { useSound } from "@/hooks/use-sound";

interface TransferModalProps {
  visible: boolean;
  onClose: () => void;
}

type Step = "input" | "validating" | "review" | "signing" | "success";

function friendlyError(raw: string): string {
  const s = raw.toLowerCase();
  if (
    s.includes("insufficient") ||
    s.includes("balance") ||
    s.includes("saldo")
  )
    return "Saldo insuficiente para realizar a transferencia.";
  if (s.includes("invalid") && s.includes("address"))
    return "Endereco de destino invalido. Verifique e tente novamente.";
  if (s.includes("no account") || s.includes("not found"))
    return "Conta de destino nao encontrada na rede Stellar.";
  if (s.includes("memo") || s.includes("text too long"))
    return "O campo memo deve ter no maximo 28 caracteres.";
  if (s.includes("network") || s.includes("timeout"))
    return "Erro de conexao. Verifique sua internet e tente novamente.";
  return "Nao foi possivel processar a transferencia. Tente novamente.";
}

function errorMessage(error: unknown): string {
  if (error instanceof TransferError) return error.message;
  const candidate = error as { message?: string };
  return friendlyError(candidate.message ?? "");
}

export function TransferModal({ visible, onClose }: TransferModalProps) {
  const queryClient = useQueryClient();
  const walletAddress = useAuthStore((s) => s.walletAddress);
  const { data: balances } = useWalletBalance(walletAddress);
  const usdcBalance = balances ? findUsdcBalance(balances) : "0";

  const [toAddress, setToAddress] = useState("");
  const [memo, setMemo] = useState("");
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<Step>("input");
  const [errorMsg, setErrorMsg] = useState("");
  const [txHash, setTxHash] = useState("");

  const { playClick, playInvestirConfirmacao, playQuestaoErrada } = useSound();

  const handlePasteAddress = async () => {
    playClick();
    const text = await Clipboard.getStringAsync();
    if (text) setToAddress(text.trim());
  };

  const handleReview = async () => {
    if (!walletAddress || !toAddress.trim() || !amount) return;
    setErrorMsg("");
    setStep("validating");
    try {
      const fields = validateTransferFields({
        fromAddress: walletAddress,
        toAddress,
        amount,
        memo,
      });
      if (Number(fields.amount) > Number(usdcBalance)) {
        throw new TransferError(
          "INSUFFICIENT_BALANCE",
          "Saldo USDC insuficiente.",
        );
      }
      await validateUsdcDestination(fields.toAddress, fields.amount);
      setAmount(fields.amount);
      setToAddress(fields.toAddress);
      setMemo(fields.memo ?? "");
      setStep("review");
    } catch (error) {
      setErrorMsg(errorMessage(error));
      setStep("input");
      playQuestaoErrada();
    }
  };

  const handleConfirm = async () => {
    if (!walletAddress) return;
    setErrorMsg("");
    setStep("signing");
    try {
      const result = await signAndSubmitTransfer({
        fromAddress: walletAddress,
        toAddress,
        amount,
        memo: memo.trim() || undefined,
      });
      setTxHash(result.hash);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: walletKeys.balance(walletAddress),
        }),
        queryClient.invalidateQueries({
          queryKey: walletKeys.transfers(walletAddress),
        }),
      ]);
      setStep("success");
      playInvestirConfirmacao();
    } catch (error) {
      setErrorMsg(errorMessage(error));
      setStep("review");
      playQuestaoErrada();
    }
  };

  const handleClose = () => {
    setToAddress("");
    setMemo("");
    setAmount("");
    setStep("input");
    setErrorMsg("");
    setTxHash("");
    onClose();
  };

  let amountNum = 0;
  try {
    amountNum = Number(normalizeUsdcAmount(amount));
  } catch {}
  const canConfirm =
    !!toAddress.trim() && amountNum > 0 && amountNum <= Number(usdcBalance);
  const isBusy = step === "validating" || step === "signing";
  const shortDestination = toAddress
    ? `${toAddress.slice(0, 10)}...${toAddress.slice(-10)}`
    : "-";
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={isBusy ? undefined : handleClose}
    >
      <Pressable
        style={styles.backdrop}
        onPress={isBusy ? undefined : handleClose}
      >
        <Pressable
          style={[styles.sheet, { paddingBottom: Spacing[8] + insets.bottom }]}
          onPress={() => {}}
        >
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.headerRow}>
            <LinearGradient
              colors={["hsl(220, 90%, 58%)", "hsl(270, 80%, 60%)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerIcon}
            >
              <MaterialIcons name="send" size={18} color="#fff" />
            </LinearGradient>
            <View style={styles.headerTextBlock}>
              <Text style={styles.headerTitle}>Transferir USDC</Text>
              <View style={styles.networkBadge}>
                <View style={styles.networkDot} />
                <Text style={styles.networkText}>Stellar · USDC</Text>
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

          {/* ── Input step ── */}
          {step === "input" && (
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.body}>
                {/* Balance */}
                <View style={styles.balanceRow}>
                  <MaterialIcons
                    name="account-balance-wallet"
                    size={14}
                    color={Colors.mutedForeground}
                  />
                  <Text style={styles.balanceLabel}>
                    Disponivel:{" "}
                    <Text style={styles.balanceValue}>${usdcBalance} USDC</Text>
                  </Text>
                </View>

                {/* Amount */}
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

                {/* Destination address */}
                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>Endereco de destino</Text>
                  <View style={styles.addressInputRow}>
                    <TextInput
                      style={styles.addressInput}
                      placeholder="G... (endereco Stellar)"
                      placeholderTextColor={Colors.mutedForeground}
                      value={toAddress}
                      onChangeText={setToAddress}
                      autoCapitalize="characters"
                      autoCorrect={false}
                      cursorColor={Accent.secondary}
                    />
                    <Pressable
                      onPress={handlePasteAddress}
                      style={styles.pasteBtn}
                      hitSlop={8}
                    >
                      <MaterialIcons
                        name="content-paste"
                        size={16}
                        color={Accent.secondary}
                      />
                      <Text style={styles.pasteBtnText}>Colar</Text>
                    </Pressable>
                  </View>
                </View>

                {/* Memo */}
                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>
                    Memo <Text style={styles.fieldOptional}>(opcional)</Text>
                  </Text>
                  <TextInput
                    style={styles.memoInput}
                    placeholder="Ex: pagamento, referencia..."
                    placeholderTextColor={Colors.mutedForeground}
                    value={memo}
                    onChangeText={setMemo}
                    maxLength={28}
                    autoCorrect={false}
                    cursorColor={Accent.secondary}
                  />
                  <Text style={styles.memoCount}>{memo.length}/28</Text>
                </View>

                {/* Warning */}
                <View style={styles.warningRow}>
                  <MaterialIcons
                    name="info-outline"
                    size={14}
                    color={Colors.mutedForeground}
                  />
                  <Text style={styles.warningText}>
                    Envie somente para enderecos{" "}
                    <Text style={styles.warningBold}>
                      Stellar com trustline USDC
                    </Text>
                    . Transferencias sao irreversiveis.
                  </Text>
                </View>

                {/* Error */}
                {errorMsg ? (
                  <View style={styles.errorCard}>
                    <MaterialIcons
                      name="error-outline"
                      size={18}
                      color={Accent.destructive}
                    />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={styles.errorTitle}>
                        Transferencia nao realizada
                      </Text>
                      <Text style={styles.errorMsg}>
                        {friendlyError(errorMsg)}
                      </Text>
                    </View>
                  </View>
                ) : null}

                {/* Confirm */}
                <Pressable
                  onPress={() => {
                    playClick();
                    handleReview();
                  }}
                  disabled={!canConfirm}
                  style={{ alignSelf: "stretch" }}
                >
                  <LinearGradient
                    colors={["hsl(220, 90%, 58%)", "hsl(270, 80%, 60%)"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                      styles.confirmBtn,
                      !canConfirm && styles.btnDisabled,
                    ]}
                  >
                    <MaterialIcons name="send" size={16} color="#fff" />
                    <Text style={styles.confirmBtnText}>
                      Revisar transferencia
                    </Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </ScrollView>
          )}

          {step === "validating" && (
            <View style={styles.centerBody}>
              <ActivityIndicator color={Accent.secondary} size="large" />
              <Text style={styles.statusTitle}>Validando destino...</Text>
              <Text style={styles.statusSub}>
                Verificando conta e trustline USDC na Stellar
              </Text>
            </View>
          )}

          {step === "review" && (
            <View style={styles.body}>
              <Text style={styles.reviewTitle}>Revise antes de enviar</Text>
              <View style={styles.reviewCard}>
                <ReviewRow
                  label="Valor"
                  value={`$${Number(amount).toFixed(2)} USDC`}
                />
                <ReviewRow label="Destino" value={shortDestination} mono />
                <ReviewRow label="Memo" value={memo || "Sem memo"} />
                <ReviewRow label="Rede" value="Stellar Testnet" />
              </View>
              <View style={styles.warningRow}>
                <MaterialIcons
                  name="warning-amber"
                  size={16}
                  color={Accent.accent}
                />
                <Text style={styles.warningText}>
                  Confira os dados com atenção. Transferências Stellar são
                  irreversíveis.
                </Text>
              </View>
              {errorMsg ? (
                <View style={styles.errorCard}>
                  <MaterialIcons
                    name="error-outline"
                    size={18}
                    color={Accent.destructive}
                  />
                  <Text style={[styles.errorMsg, { flex: 1 }]}>{errorMsg}</Text>
                </View>
              ) : null}
              <View style={styles.reviewActions}>
                <Pressable
                  onPress={() => setStep("input")}
                  style={styles.backBtn}
                >
                  <Text style={styles.backBtnText}>Editar</Text>
                </Pressable>
                <Pressable
                  onPress={handleConfirm}
                  style={styles.reviewConfirmWrap}
                >
                  <LinearGradient
                    colors={["hsl(220, 90%, 58%)", "hsl(270, 80%, 60%)"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.confirmBtn}
                  >
                    <MaterialIcons name="fingerprint" size={18} color="#fff" />
                    <Text style={styles.confirmBtnText}>Assinar e enviar</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </View>
          )}

          {/* ── Signing ── */}
          {step === "signing" && (
            <View style={styles.centerBody}>
              <ActivityIndicator color={Accent.secondary} size="large" />
              <Text style={styles.statusTitle}>
                Assine com sua biometria...
              </Text>
              <Text style={styles.statusSub}>
                Use Face ID / Touch ID para autorizar a transferencia
              </Text>
            </View>
          )}

          {/* ── Success ── */}
          {step === "success" && (
            <View style={styles.centerBody}>
              <LinearGradient
                colors={[Accent.success, "hsl(145, 70%, 38%)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.successIcon}
              >
                <MaterialIcons name="check" size={36} color="#fff" />
              </LinearGradient>
              <Text style={styles.successTitle}>Transferencia enviada!</Text>
              <Text style={styles.statusSub}>
                ${amount} USDC enviados com sucesso{"\n"}para a carteira de
                destino.
              </Text>
              {txHash ? (
                <Text style={styles.txHash} numberOfLines={1}>
                  Tx: {txHash.slice(0, 12)}...{txHash.slice(-8)}
                </Text>
              ) : null}
              <Pressable onPress={handleClose} style={{ alignSelf: "stretch" }}>
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
  );
}

function ReviewRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <View style={styles.reviewRow}>
      <Text style={styles.reviewLabel}>{label}</Text>
      <Text
        style={[styles.reviewValue, mono && styles.reviewMono]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
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

  // Header
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
    backgroundColor: "hsl(220, 90%, 58%)",
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

  // Body
  body: { gap: Spacing[4] },
  reviewTitle: {
    fontSize: FontSize.subheading,
    fontFamily: Font.black,
    color: Colors.foreground,
  },
  reviewCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing[4],
  },
  reviewRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  reviewLabel: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
  },
  reviewValue: {
    flex: 1,
    textAlign: "right",
    fontSize: FontSize.bodySmall,
    fontFamily: Font.bold,
    color: Colors.foreground,
  },
  reviewMono: { fontSize: FontSize.label },
  reviewActions: { flexDirection: "row", gap: 10 },
  backBtn: {
    height: 54,
    minWidth: 88,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.muted,
  },
  backBtnText: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.black,
    color: Colors.foreground,
  },
  reviewConfirmWrap: { flex: 1 },

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

  // Amount
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

  // Fields
  fieldBlock: { gap: 6 },
  fieldLabel: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.bold,
    color: Colors.foreground,
  },
  fieldOptional: {
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
  },

  addressInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  addressInput: {
    flex: 1,
    fontSize: FontSize.label,
    fontFamily: Font.bold,
    color: Colors.foreground,
    padding: 0,
  },
  pasteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(100,100,255,0.1)",
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "rgba(100,100,255,0.2)",
    flexShrink: 0,
  },
  pasteBtnText: {
    fontSize: FontSize.label,
    fontFamily: Font.black,
    color: Accent.secondary,
  },

  memoInput: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: FontSize.bodySmall,
    fontFamily: Font.semiBold,
    color: Colors.foreground,
  },
  memoCount: {
    fontSize: FontSize.label,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
    textAlign: "right",
  },

  // Warning
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

  // Error
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

  // Confirm
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

  // Center states
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
  txHash: {
    fontSize: FontSize.label,
    fontFamily: Font.bold,
    color: Colors.mutedForeground,
  },
});
