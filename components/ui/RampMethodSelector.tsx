import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
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
import { PressableScale } from "./PressableScale";
import { KycStatusBadge } from "./KycStatusBadge";
import { useTerms } from "@/hooks/use-terms";
import { usePixRampGate } from "@/hooks/use-pix-ramp-gate";

interface RampMethodSelectorProps {
  visible: boolean;
  type: "deposit" | "withdraw";
  onSelectStellar: () => void;
  onSelectRamp: () => void;
  onClose: () => void;
  /**
   * Transferência para outro endereço da rede. Só aparece no saque, e só no
   * modo Pro: é o único caminho aqui que exige entender o que é uma carteira.
   */
  onSelectTransfer?: () => void;
}

export function RampMethodSelector({
  visible,
  type,
  onSelectStellar,
  onSelectRamp,
  onClose,
  onSelectTransfer,
}: RampMethodSelectorProps) {
  const { t, isPro } = useTerms();
  const isDeposit = type === "deposit";
  const pixGate = usePixRampGate(visible);
  const isLoading = pixGate.isLoading;
  const kycStatus = pixGate.kycStatus;

  function handlePixPress() {
    if (isLoading) return;
    onClose();
    pixGate.proceed(onSelectRamp);
  }

  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { paddingBottom: Spacing[8] + insets.bottom }]}
          onPress={() => {}}
        >
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.headerRow}>
            <LinearGradient
              colors={Gradients.primary as any}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerIcon}
            >
              <MaterialIcons
                name={isDeposit ? "arrow-downward" : "arrow-upward"}
                size={18}
                color="#fff"
              />
            </LinearGradient>
            <Text style={styles.headerTitle}>
              {isDeposit ? "Depositar fundos" : "Sacar fundos"}
            </Text>
            <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
              <MaterialIcons
                name="close"
                size={16}
                color={Colors.mutedForeground}
              />
            </Pressable>
          </View>

          <View style={styles.options}>
            {/* Investir no porquinho — ativo */}
            <PressableScale onPress={onSelectStellar}>
              <View style={styles.optionCard}>
                <View style={styles.optionIconWrap}>
                  <MaterialIcons
                    name="savings"
                    size={24}
                    color={Accent.primary}
                  />
                </View>
                <View style={styles.optionText}>
                  <Text style={styles.optionLabel}>
                    {isDeposit ? "Investir no porquinho" : "Sacar do porquinho"}
                  </Text>
                  <Text style={styles.optionDesc}>
                    {isDeposit
                      ? t("ramp.deposit.fromWallet")
                      : t("ramp.withdraw.toWallet")}
                  </Text>
                </View>
                <MaterialIcons
                  name="chevron-right"
                  size={20}
                  color={Colors.mutedForeground}
                />
              </View>
            </PressableScale>

            {/* PIX */}
            <PressableScale onPress={handlePixPress} disabled={isLoading}>
              <View
                style={[
                  styles.optionCard,
                  isLoading && styles.optionCardDisabled,
                ]}
              >
                <View style={styles.optionIconWrap}>
                  <MaterialIcons name="pix" size={22} color={Accent.primary} />
                </View>
                <View style={styles.optionText}>
                  <View style={styles.optionLabelRow}>
                    <Text style={styles.optionLabel}>PIX (BRL)</Text>
                    <KycStatusBadge status={kycStatus} />
                  </View>
                  <Text style={styles.optionDesc}>
                    {kycStatus === "REJECTED"
                      ? "Verificação recusada — toque para reenviar seus documentos"
                      : kycStatus === "VERIFYING"
                        ? "Verificação em análise. Avisamos assim que sair o resultado"
                        : isDeposit
                          ? "Deposite via Pix em reais"
                          : "Receba na sua conta via Pix"}
                  </Text>
                </View>
                {isLoading ? (
                  <ActivityIndicator
                    size="small"
                    color={Colors.mutedForeground}
                  />
                ) : (
                  <MaterialIcons
                    name="chevron-right"
                    size={20}
                    color={Colors.mutedForeground}
                  />
                )}
              </View>
            </PressableScale>

            {/* Transferir para outra carteira */}
            {!isDeposit && isPro && onSelectTransfer && (
              <PressableScale onPress={onSelectTransfer}>
                <View style={styles.optionCard}>
                  <View style={styles.optionIconWrap}>
                    <MaterialIcons
                      name="send"
                      size={22}
                      color={Accent.primary}
                    />
                  </View>
                  <View style={styles.optionText}>
                    <Text style={styles.optionLabel}>
                      Transferir para outra carteira
                    </Text>
                    <Text style={styles.optionDesc}>
                      Envie USDC para outro endereço da rede
                    </Text>
                  </View>
                  <MaterialIcons
                    name="chevron-right"
                    size={20}
                    color={Colors.mutedForeground}
                  />
                </View>
              </PressableScale>
            )}
          </View>
        </Pressable>
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

  // Header
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: Spacing[6],
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  headerTitle: {
    flex: 1,
    fontSize: FontSize.body,
    fontFamily: Font.black,
    color: Colors.foreground,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.muted,
    justifyContent: "center",
    alignItems: "center",
  },

  // Options
  options: {
    gap: Spacing[3],
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[4],
  },
  optionCardDisabled: {
    opacity: 0.5,
  },
  optionIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "rgba(244,52,180,0.12)",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  optionText: {
    flex: 1,
    gap: 3,
  },
  optionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  optionLabel: {
    fontSize: FontSize.body,
    fontFamily: Font.bold,
    color: Colors.foreground,
  },
  optionDesc: {
    fontSize: FontSize.label,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
    lineHeight: 18,
  },
});
