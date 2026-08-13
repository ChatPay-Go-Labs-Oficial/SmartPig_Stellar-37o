import { useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from "react-native";
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
import { PressableScale } from "@/components/ui";
import { safeReplace } from "@/lib/navigation/safe-replace";
import { useAuthStore } from "@/lib/stores/auth.store";
import { useBlindPayStore } from "@/lib/stores/blindpay.store";
import { useKycStatus } from "@/lib/queries/blindpay.queries";

export default function PendingScreen() {
  const contractId = useAuthStore((s) => s.contractId);
  const clearKycDraft = useBlindPayStore((s) => s.clearKycDraft);
  const startKycRetry = useBlindPayStore((s) => s.startKycRetry);

  // `useKycStatus` faz poll sozinho enquanto o status não é terminal e para
  // quando chega a aprovado/recusado — por isso não há setInterval aqui.
  const { data: kyc, isLoading } = useKycStatus(contractId);
  const isRejected = kyc?.kycStatus === "REJECTED";
  const isApproved =
    kyc?.kycStatus === "APPROVED" || kyc?.kycStatus === "APPROVED_RFI";

  // Aprovado é o único ponto em que o rascunho de KYC deixa de ser útil: até
  // aqui ele é o que permite refazer o envio sem redigitar tudo.
  useEffect(() => {
    if (isApproved) clearKycDraft();
  }, [isApproved, clearKycDraft]);

  // O reenvio recomeça nos Termos de Uso, não nas fotos: o customer novo exige
  // um `tos_id` novo, e o aceite anterior ficou preso ao cadastro recusado.
  // O rascunho sobrevive, então os formulários seguintes já vêm preenchidos.
  function handleRetry() {
    startKycRetry();
    safeReplace("/(blindpay-onboarding)/tos");
  }

  // Sem isso, a primeira renderização cai no ramo "nem aprovado nem recusado"
  // e mostra "Recebemos seus dados!" por um instante antes do status real
  // chegar — pisca uma tela errada quando a aprovação é rápida.
  if (isLoading) {
    return (
      <View style={[styles.outer, styles.loadingCenter]}>
        <ActivityIndicator color={Accent.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.outer}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <MaterialIcons
            name={
              isRejected
                ? "error-outline"
                : isApproved
                  ? "verified"
                  : "check-circle"
            }
            size={40}
            color={isRejected ? Accent.destructive : Accent.success}
          />
        </View>

        <Text style={styles.title}>
          {isRejected
            ? "Não conseguimos aprovar seus documentos"
            : isApproved
              ? "Tudo certo!"
              : "Recebemos seus dados!"}
        </Text>
        <Text style={styles.message}>
          {isRejected
            ? "Você pode enviar novamente com fotos corrigidas."
            : isApproved
              ? "Sua identidade foi verificada. Depósitos e saques via Pix estão liberados."
              : "A análise pode levar algumas horas. Assim que for concluída, os depósitos e saques via Pix ficam liberados automaticamente, você não precisa fazer mais nada."}
        </Text>

        {isRejected && kyc?.canResubmit && (
          <PressableScale onPress={handleRetry} style={styles.btnWrap}>
            <LinearGradient
              colors={Gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.btn}
            >
              <Text style={styles.btnText}>Enviar novamente</Text>
            </LinearGradient>
          </PressableScale>
        )}

        <PressableScale
          onPress={() => safeReplace("/(tabs)")}
          style={styles.btnWrap}
        >
          {isRejected ? (
            <View style={[styles.btn, styles.btnSecondary]}>
              <Text style={styles.btnSecondaryText}>Agora não</Text>
            </View>
          ) : (
            <LinearGradient
              colors={Gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.btn}
            >
              <Text style={styles.btnText}>Ir para o app</Text>
            </LinearGradient>
          )}
        </PressableScale>
      </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingCenter: {
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing[8],
  },
  content: {
    alignItems: "center",
    paddingHorizontal: Spacing[8],
    gap: 16,
    width: "100%",
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  title: {
    fontSize: FontSize.heading,
    fontFamily: Font.black,
    color: Colors.foreground,
    textAlign: "center",
  },
  message: {
    fontSize: FontSize.body,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
    textAlign: "center",
    lineHeight: 24,
  },
  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[4],
    width: "100%",
    marginTop: Spacing[2],
  },
  infoText: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
    textAlign: "center",
    lineHeight: 20,
  },
  btnWrap: {
    width: "100%",
    marginTop: Spacing[4],
  },
  btn: {
    paddingVertical: 14,
    borderRadius: Radius.sm,
    alignItems: "center",
    width: "100%",
  },
  btnSecondary: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  btnSecondaryText: {
    color: Colors.mutedForeground,
    fontSize: FontSize.body,
    fontFamily: Font.bold,
  },
  btnText: {
    color: "#fff",
    fontSize: FontSize.body,
    fontWeight: "700",
    fontFamily: Font.bold,
  },
});
