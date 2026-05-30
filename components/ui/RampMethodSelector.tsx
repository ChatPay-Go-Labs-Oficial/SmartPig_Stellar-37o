import { useState } from "react";
import { Modal, View, Text, StyleSheet, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
  Colors,
  Accent,
  Font,
  FontSize,
  Gradients,
  Radius,
  Spacing,
} from "@/constants/theme";
import { useEtherfuseStore } from "@/lib/stores/etherfuse.store";
import { useAuthStore } from "@/lib/stores/auth.store";
import { useEtherfuseCustomer } from "@/lib/queries/etherfuse.queries";

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
  const contractId = useAuthStore((s) => s.contractId);
  const { data: customer } = useEtherfuseCustomer(contractId);

  const hasCompliantBank = customer?.bankAccounts?.some((a) => a.isCompliant);
  const isOnboarded =
    (customer?.kycStatus === "APPROVED" ||
      customer?.kycStatus === "APPROVED_CHAIN_DEPLOYING") &&
    hasCompliantBank;

  const isDeposit = type === "deposit";

  function handleRamp() {
    if (!customer) {
      useEtherfuseStore.getState().setCurrentStep("organization");
      router.replace("/(etherfuse-onboarding)" as any);
      return;
    }
    if (!isOnboarded) {
      useEtherfuseStore.getState().setCurrentStep("check-status");
      router.replace("/(etherfuse-onboarding)" as any);
      return;
    }
    onSelectRamp();
  }

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
          <View style={styles.headerRow}>
            <View style={styles.headerIcon}>
              <Text style={styles.headerIconText}>{isDeposit ? "↓" : "↑"}</Text>
            </View>
            <Text style={styles.headerTitle}>
              {isDeposit ? "Depositar fundos" : "Sacar fundos"}
            </Text>
          </View>

          <View style={styles.options}>
            <Pressable style={styles.optionCard} onPress={onSelectStellar}>
              <View style={styles.optionLeft}>
                <View
                  style={[
                    styles.optionIcon,
                    { backgroundColor: "hsla(320, 90%, 58%, 0.15)" },
                  ]}
                >
                  <Text
                    style={[styles.optionIconText, { color: Accent.primary }]}
                  >
                    ⚡
                  </Text>
                </View>
                <View style={styles.optionText}>
                  <Text style={styles.optionLabel}>Cofrinho</Text>
                  <Text style={styles.optionDesc}>
                    {isDeposit
                      ? "Instante — direto no cofinho"
                      : "Instante — direto na sua carteira"}
                  </Text>
                </View>
              </View>
              <Text style={styles.optionArrow}>→</Text>
            </Pressable>

            <Pressable style={styles.optionCard} onPress={handleRamp}>
              <View style={styles.optionLeft}>
                <View
                  style={[
                    styles.optionIcon,
                    { backgroundColor: "hsla(145, 80%, 48%, 0.15)" },
                  ]}
                >
                  <Text
                    style={[styles.optionIconText, { color: Accent.success }]}
                  >
                    🏦
                  </Text>
                </View>
                <View style={styles.optionText}>
                  <Text style={styles.optionLabel}>Via PIX (BRL)</Text>
                  <Text style={styles.optionDesc}>
                    {isDeposit
                      ? "Depósito via Pix — 5-10 min"
                      : "Receba na sua conta bancária"}
                  </Text>
                  {!customer && (
                    <Text style={styles.optionBadge}>Requer cadastro</Text>
                  )}
                  {customer && !isOnboarded && (
                    <Text style={styles.optionBadge}>Complete o cadastro</Text>
                  )}
                </View>
              </View>
              <Text style={styles.optionArrow}>→</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1, 
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "hsla(270, 80%, 60%, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerIconText: {
    fontSize: 18,
    fontWeight: "900",
    color: Accent.secondary,
    fontFamily: Font.black,
  },
  headerTitle: {
    fontSize: FontSize.subheading,
    fontFamily: Font.black,
    color: Colors.foreground,
  },
  options: {
    gap: Spacing[3],
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.muted,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[4],
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  optionIconText: {
    fontSize: 20,
  },
  optionText: {
    gap: 2,
    flex: 1,
  },
  optionLabel: {
    fontSize: FontSize.body,
    fontFamily: Font.bold,
    color: Colors.foreground,
  },
  optionDesc: {
    fontSize: FontSize.label,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
  },
  optionBadge: {
    fontSize: 10,
    fontFamily: Font.bold,
    color: Accent.accent,
    marginTop: 2,
  },
  optionArrow: {
    fontSize: FontSize.body,
    color: Colors.mutedForeground,
    fontFamily: Font.bold,
  },
});
