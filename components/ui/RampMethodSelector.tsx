import { Modal, View, Text, StyleSheet, Pressable } from "react-native";
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
  onClose,
}: RampMethodSelectorProps) {
  const isDeposit = type === "deposit";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
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
              <MaterialIcons name="close" size={16} color={Colors.mutedForeground} />
            </Pressable>
          </View>

          <View style={styles.options}>
            {/* Investir no porquinho — ativo */}
            <PressableScale onPress={onSelectStellar}>
              <View style={styles.optionCard}>
                <View style={styles.optionIconWrap}>
                  <MaterialIcons name="savings" size={24} color={Accent.primary} />
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
                <MaterialIcons name="chevron-right" size={20} color={Colors.mutedForeground} />
              </View>
            </PressableScale>

            {/* PIX — em breve */}
            <View style={[styles.optionCard, styles.optionCardDisabled]}>
              <View style={[styles.optionIconWrap, styles.optionIconWrapDisabled]}>
                <MaterialIcons name="pix" size={22} color={Colors.mutedForeground} />
              </View>
              <View style={styles.optionText}>
                <View style={styles.optionLabelRow}>
                  <Text style={styles.optionLabelDisabled}>PIX (BRL)</Text>
                  <View style={styles.comingSoonBadge}>
                    <Text style={styles.comingSoonText}>Em breve</Text>
                  </View>
                </View>
                <Text style={styles.optionDesc}>
                  {isDeposit
                    ? "Deposito via Pix em reais"
                    : "Receba na sua conta bancaria"}
                </Text>
              </View>
            </View>
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
  optionIconWrapDisabled: {
    backgroundColor: Colors.muted,
  },
  optionText: {
    flex: 1,
    gap: 3,
  },
  optionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  optionLabel: {
    fontSize: FontSize.body,
    fontFamily: Font.bold,
    color: Colors.foreground,
  },
  optionLabelDisabled: {
    fontSize: FontSize.body,
    fontFamily: Font.bold,
    color: Colors.mutedForeground,
  },
  optionDesc: {
    fontSize: FontSize.label,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
    lineHeight: 18,
  },

  // Em breve badge
  comingSoonBadge: {
    backgroundColor: Colors.muted,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  comingSoonText: {
    fontSize: 10,
    fontFamily: Font.black,
    color: Colors.mutedForeground,
    letterSpacing: 0.3,
  },
});
