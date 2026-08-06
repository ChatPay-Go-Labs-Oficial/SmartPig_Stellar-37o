import { useState } from "react";
import { View, Text, StyleSheet, Image, ActivityIndicator } from "react-native";
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
import {
  OnboardingStepHeader,
  OnboardingProgress,
  PressableScale,
  DocPhotoTips,
} from "@/components/ui";
import { useAuthStore } from "@/lib/stores/auth.store";
import {
  useCreateBlindPayReceiver,
  useKycStatus,
  useResubmitKyc,
  useUploadKycFile,
} from "@/lib/queries/blindpay.queries";
import { useBlindPayStore, type IdDocKind } from "@/lib/stores/blindpay.store";
import { pickIdDocument } from "@/lib/media/pick-photo";
import { safeReplace } from "@/lib/navigation/safe-replace";

const DOC_TYPE_LABELS: Record<string, string> = {
  ID_CARD: "RG",
  DRIVERS: "CNH",
  PASSPORT: "passaporte",
};

function toIso8601(dateOnly: string): string | undefined {
  const trimmed = dateOnly.trim();
  if (!trimmed) return undefined;
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? `${trimmed}T00:00:00Z` : trimmed;
}

export default function KycDocBackScreen() {
  const insets = useSafeAreaInsets();
  const contractId = useAuthStore((s) => s.contractId);
  const {
    kycDraft: draft,
    tosId,
    selfieFileUrl,
    idDocFrontUrl,
    idDocBackUrl,
    idDocBackKind: idDocBackKindSaved,
    pendingPdfDoc,
    setIdDocBackUrl,
    setPendingPdfDoc,
    setReceiver,
    setCurrentStep,
  } = useBlindPayStore();
  const uploadFile = useUploadKycFile();
  const createReceiver = useCreateBlindPayReceiver();
  const resubmitKyc = useResubmitKyc();
  const { data: kyc } = useKycStatus(contractId);

  const docLabel = DOC_TYPE_LABELS[draft.idDocType ?? "ID_CARD"] ?? "documento";
  const submitting =
    uploadFile.isPending || createReceiver.isPending || resubmitKyc.isPending;

  const [uri, setUri] = useState<string | null>(null);
  const [kind, setKind] = useState<IdDocKind | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [picking, setPicking] = useState(false);

  // Se voltou pra esse passo antes e não trocou de arquivo, mostra o que já
  // foi enviado em vez de forçar escolher outro à toa.
  const previewUri = uri ?? idDocBackUrl ?? null;
  const previewKind = uri ? kind : idDocBackKindSaved;

  async function pickDocument() {
    setPicking(true);
    try {
      const result = await pickIdDocument();
      if (!result) return;
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setUri(result.uri);
      setKind(result.kind);
      setFileName(result.kind === "pdf" ? result.fileName : null);
      setError("");
    } finally {
      setPicking(false);
    }
  }

  // A frente foi enviada em PDF — a BlindPay exige o mesmo arquivo no verso,
  // então reaproveita em vez de fazer a pessoa procurá-lo de novo.
  function useSamePdfAsFront() {
    if (!pendingPdfDoc) return;
    setUri(pendingPdfDoc.uri);
    setKind("pdf");
    setFileName(pendingPdfDoc.fileName);
    setError("");
  }

  async function handleContinue() {
    if (!uri && !idDocBackUrl) {
      setError("Adicione o verso do documento para continuar");
      return;
    }
    if (!contractId) {
      setError("Sessão expirada. Saia e entre novamente.");
      return;
    }
    setError("");
    try {
      // Se voltou nesse passo e não trocou o arquivo, reaproveita a URL já
      // enviada em vez de subir de novo à toa.
      let finalIdDocBackUrl = idDocBackUrl;
      if (uri) {
        const isPdf = kind === "pdf";
        const { url } = await uploadFile.mutateAsync({
          fileUri: uri,
          fileName: isPdf ? (fileName ?? "documento.pdf") : "id_back.jpg",
          mimeType: isPdf ? "application/pdf" : "image/jpeg",
        });
        finalIdDocBackUrl = url;
        setIdDocBackUrl(url, kind ?? "image");
      }

      // Um KYC recusado não pode ser corrigido no mesmo customer da BlindPay —
      // a rota de reenvio cria um novo e recria a conta Pix e a wallet contra
      // ele. Chamar `createReceiver` aqui devolveria "User already has a
      // BlindPay receiver" e travaria o usuário de novo.
      const isRetry = kyc?.kycStatus === "REJECTED";
      const submit = isRetry ? resubmitKyc : createReceiver;

      const receiver = await submit.mutateAsync({
        userId: contractId,
        email: draft.email ?? "",
        firstName: draft.firstName,
        lastName: draft.lastName,
        taxId: draft.taxId,
        country: "BR",
        type: "individual",
        kycType: "standard",
        addressLine1: draft.addressLine1,
        addressLine2: draft.addressLine2 || undefined,
        city: draft.city,
        stateProvinceRegion: draft.stateProvinceRegion,
        postalCode: draft.postalCode,
        dateOfBirth: toIso8601(draft.dateOfBirth ?? ""),
        idDocCountry: draft.idDocCountry ?? "BR",
        idDocType: draft.idDocType,
        selfieFileUrl: selfieFileUrl ?? "",
        idDocFrontUrl: idDocFrontUrl ?? "",
        idDocBackUrl: finalIdDocBackUrl ?? "",
        tosId: tosId ?? undefined,
      });

      setReceiver(receiver.id);
      // Já foi usado (ou o usuário optou por outro arquivo) — não faz mais
      // sentido sugerir de novo num eventual reenvio de KYC.
      setPendingPdfDoc(null);

      // O rascunho NÃO é apagado aqui. Enquanto a BlindPay não aprovar, ele é
      // exatamente o que permite refazer o KYC sem redigitar CPF, endereço e
      // data de nascimento. Quem limpa é a tela de pending, ao ver `APPROVED`.
      if (isRetry) {
        // No reenvio o backend já recriou conta Pix e wallet contra o customer
        // novo, então não há mais nada para o usuário preencher.
        setCurrentStep("pending");
        safeReplace("/(blindpay-onboarding)/pending");
        return;
      }

      setCurrentStep("bank-account");
      safeReplace("/(blindpay-onboarding)/bank-account");
    } catch (e: any) {
      setError(
        e?.response?.data?.message ||
          e?.message ||
          "Erro ao enviar seus dados. Tente novamente.",
      );
    }
  }

  function handleBack() {
    setCurrentStep("kyc-doc-front");
    safeReplace("/(blindpay-onboarding)/kyc-doc-front");
  }

  return (
    <View style={[styles.container, { paddingBottom: Spacing[8] + insets.bottom }]}>
      <OnboardingStepHeader onBack={handleBack} />
      <OnboardingProgress step={8} total={10} />
      <Text style={styles.title}>Por último, o verso</Text>
      <Text style={styles.subtitle}>
        Fotografe o verso do seu {docLabel}, com os quatro cantos dentro da foto
        e uma margem em volta. Confira na pré-visualização se nenhuma borda
        ficou de fora.
      </Text>
      <DocPhotoTips />

      {pendingPdfDoc && previewKind !== "pdf" ? (
        <PressableScale
          onPress={useSamePdfAsFront}
          style={styles.reuseBtn}
          disabled={picking}
        >
          <MaterialIcons
            name="picture-as-pdf"
            size={16}
            color={Accent.primary}
          />
          <Text style={styles.reuseText} numberOfLines={1}>
            Usar o mesmo PDF enviado na frente ({pendingPdfDoc.fileName})
          </Text>
        </PressableScale>
      ) : null}

      <View style={styles.captureWrap}>
        <PressableScale onPress={pickDocument} disabled={picking}>
          <View style={styles.captureCard}>
            {picking ? (
              <View style={styles.capturePlaceholder}>
                <ActivityIndicator color={Accent.primary} />
                <Text style={styles.captureHint}>Selecionando...</Text>
              </View>
            ) : previewKind === "pdf" ? (
              <View style={styles.capturePlaceholder}>
                <MaterialIcons
                  name="picture-as-pdf"
                  size={40}
                  color={Accent.primary}
                />
                <Text style={styles.captureHint} numberOfLines={1}>
                  {fileName ?? "Documento em PDF"}
                </Text>
              </View>
            ) : previewUri ? (
              <Image source={{ uri: previewUri }} style={styles.preview} />
            ) : (
              <View style={styles.capturePlaceholder}>
                <MaterialIcons
                  name="credit-card"
                  size={40}
                  color={Colors.mutedForeground}
                />
                <Text style={styles.captureHint}>
                  Toque para tirar a foto ou enviar um PDF
                </Text>
              </View>
            )}
          </View>
        </PressableScale>
        {previewUri && !picking ? (
          <PressableScale
            onPress={pickDocument}
            style={styles.retakeBtn}
            disabled={picking}
          >
            <Text style={styles.retakeText}>
              {previewKind === "pdf"
                ? "Escolher outro arquivo"
                : "Tirar outra foto"}
            </Text>
          </PressableScale>
        ) : null}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.footer}>
        <PressableScale
          onPress={handleContinue}
          disabled={picking || submitting}
        >
          <LinearGradient
            colors={Gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.btn, (picking || submitting) && styles.btnDisabled]}
          >
            <Text style={styles.btnText}>
              {submitting ? "Enviando..." : "Concluir envio"}
            </Text>
          </LinearGradient>
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing[6],
    paddingTop: 60,
    paddingBottom: Spacing[8],
  },
  title: {
    fontSize: FontSize.heading,
    fontFamily: Font.black,
    color: Colors.foreground,
    marginBottom: Spacing[1],
  },
  subtitle: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
    lineHeight: 20,
    marginBottom: Spacing[6],
  },
  reuseBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(244,52,180,0.12)",
    borderWidth: 1,
    borderColor: Accent.primary,
    borderRadius: Radius.sm,
    padding: 12,
    marginBottom: Spacing[4],
  },
  reuseText: {
    flex: 1,
    fontSize: FontSize.bodySmall,
    fontFamily: Font.bold,
    color: Accent.primary,
  },
  captureWrap: {
    gap: 12,
  },
  captureCard: {
    alignSelf: "center",
    // Documento é deitado — um quadro retrato empurrava a foto para uma faixa
    // estreita e ilegível depois que o preview passou a mostrar tudo.
    width: "100%",
    aspectRatio: 4 / 3,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  retakeBtn: {
    alignSelf: "center",
  },
  capturePlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: Spacing[4],
  },
  captureHint: {
    fontSize: FontSize.label,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
    textAlign: "center",
  },
  preview: {
    width: "100%",
    height: "100%",
    // 'contain', nunca 'cover': com cover o preview descarta as bordas da foto
    // — exatamente a região que a BlindPay checa — e o usuário aprovava uma
    // imagem com os cantos cortados sem ter como enxergar isso.
    resizeMode: "contain",
  },
  retakeText: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.bold,
    color: Accent.primary,
  },
  errorText: {
    color: Accent.destructive,
    fontSize: FontSize.bodySmall,
    fontFamily: Font.regular,
    textAlign: "center",
    marginTop: Spacing[4],
  },
  footer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  btn: {
    paddingVertical: 14,
    borderRadius: Radius.sm,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.5 },
  btnText: {
    color: "#fff",
    fontSize: FontSize.body,
    fontWeight: "700",
    fontFamily: Font.bold,
  },
});
