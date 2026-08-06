import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
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
import { useAuthStore } from "@/lib/stores/auth.store";
import {
  useBlindPayReceiver,
  useKycStatus,
} from "@/lib/queries/blindpay.queries";
import { KycStatusBadge } from "./KycStatusBadge";

interface RampMethodSelectorProps {
  visible: boolean;
  type: "deposit" | "withdraw";
  onSelectStellar: () => void;
  onSelectRamp: () => void;
  onClose: () => void;
}

export function RampMethodSelector({
  visible,
  type,
  onSelectStellar,
  onSelectRamp,
  onClose,
}: RampMethodSelectorProps) {
  const isDeposit = type === "deposit";
  const contractId = useAuthStore((s) => s.contractId);
  const { data: receiver, isLoading: receiverLoading } = useBlindPayReceiver(
    visible ? contractId : null,
  );
  const { data: kyc, isLoading: kycLoading } = useKycStatus(
    visible ? contractId : null,
  );

  const isLoading = receiverLoading || kycLoading;
  // `approved_rfi` também libera: nesse estado a BlindPay mantém o cliente
  // operacional, o RFI aberto só precisa ser respondido antes do prazo.
  const isKycCleared =
    kyc?.kycStatus === "APPROVED" || kyc?.kycStatus === "APPROVED_RFI";

  function handlePixPress() {
    // Enquanto as consultas ainda estão em andamento os dados são `undefined` —
    // sem essa trava, um toque rápido manda até usuário já cadastrado pro
    // onboarding à toa (o próprio onboarding se autocorrige depois, mas o
    // usuário vê um flash de tela sem motivo aparente).
    if (isLoading) return;

    onClose();
    const hasRampAccounts =
      receiver &&
      (receiver.bankAccounts?.length ?? 0) > 0 &&
      (receiver.blockchainWallets?.length ?? 0) > 0;

    // Ter conta e wallet não basta: um KYC recusado ou em análise deixa os dois
    // registros de pé, e mandar esse usuário para o modal de ramp só produz um
    // erro cru vindo da BlindPay lá na frente.
    if (!hasRampAccounts || !isKycCleared) {
      router.replace("/(blindpay-onboarding)" as any);
      return;
    }
    onSelectRamp();
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
                      ? "Invista USDC direto no seu cofrinho"
                      : "Retire do cofrinho para sua carteira Stellar"}
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
                    <KycStatusBadge status={kyc?.kycStatus} />
                  </View>
                  <Text style={styles.optionDesc}>
                    {kyc?.kycStatus === "REJECTED"
                      ? "Verificação recusada — toque para reenviar seus documentos"
                      : kyc?.kycStatus === "VERIFYING"
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
