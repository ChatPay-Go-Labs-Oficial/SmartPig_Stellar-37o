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
import { useUploadKycFile } from "@/lib/queries/blindpay.queries";
import { useBlindPayStore, type IdDocKind } from "@/lib/stores/blindpay.store";
import { pickIdDocument } from "@/lib/media/pick-photo";
import { safeReplace } from "@/lib/navigation/safe-replace";

const DOC_TYPE_LABELS: Record<string, string> = {
  ID_CARD: "RG",
  DRIVERS: "CNH",
  PASSPORT: "passaporte",
};

export default function KycDocFrontScreen() {
  const insets = useSafeAreaInsets();
  const draft = useBlindPayStore((s) => s.kycDraft);
  const idDocFrontUrl = useBlindPayStore((s) => s.idDocFrontUrl);
  const idDocFrontKindSaved = useBlindPayStore((s) => s.idDocFrontKind);
  const setIdDocFrontUrl = useBlindPayStore((s) => s.setIdDocFrontUrl);
  const setPendingPdfDoc = useBlindPayStore((s) => s.setPendingPdfDoc);
  const setCurrentStep = useBlindPayStore((s) => s.setCurrentStep);
  const uploadFile = useUploadKycFile();

  const docLabel = DOC_TYPE_LABELS[draft.idDocType ?? "ID_CARD"] ?? "documento";

  const [uri, setUri] = useState<string | null>(null);
  const [kind, setKind] = useState<IdDocKind | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [picking, setPicking] = useState(false);

  // Se voltou pra esse passo antes e não trocou de arquivo, mostra o que já
  // foi enviado em vez de forçar escolher outro à toa.
  const previewUri = uri ?? idDocFrontUrl ?? null;
  const previewKind = uri ? kind : idDocFrontKindSaved;

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
      if (result.kind === "pdf") {
        setFileName(result.fileName);
        // BlindPay exige o mesmo PDF na etapa do verso — guarda pra oferecer
        // reaproveitar sem reabrir o seletor de arquivos lá.
        setPendingPdfDoc({ uri: result.uri, fileName: result.fileName });
      } else {
        setFileName(null);
      }
      setError("");
    } finally {
      setPicking(false);
    }
  }

  async function handleContinue() {
    if (!uri && !idDocFrontUrl) {
      setError("Adicione a frente do documento para continuar");
      return;
    }
    setError("");
    if (!uri) {
      // Nada mudou desde a última vez — já tem um arquivo enviado, só segue.
      setCurrentStep("kyc-doc-back");
      safeReplace("/(blindpay-onboarding)/kyc-doc-back");
      return;
    }
    try {
      const isPdf = kind === "pdf";
      const { url } = await uploadFile.mutateAsync({
        fileUri: uri,
        fileName: isPdf ? (fileName ?? "documento.pdf") : "id_front.jpg",
        mimeType: isPdf ? "application/pdf" : "image/jpeg",
      });
      setIdDocFrontUrl(url, kind ?? "image");
      setCurrentStep("kyc-doc-back");
      safeReplace("/(blindpay-onboarding)/kyc-doc-back");
    } catch (e: any) {
      setError(
        e?.response?.data?.message ||
          e?.message ||
          "Não foi possível enviar seu arquivo. Tente novamente.",
      );
    }
  }

  function handleBack() {
    setCurrentStep("kyc-selfie");
    safeReplace("/(blindpay-onboarding)/kyc-selfie");
  }

  return (
    <View style={[styles.container, { paddingBottom: Spacing[8] + insets.bottom }]}>
      <OnboardingStepHeader onBack={handleBack} />
      <OnboardingProgress step={7} total={10} />
      <Text style={styles.title}>Agora, a frente do seu documento</Text>
      <Text style={styles.subtitle}>
        Fotografe a frente do seu {docLabel}, com os quatro cantos dentro da
        foto e uma margem em volta. Confira na pré-visualização se nenhuma borda
        ficou de fora.
      </Text>
      <DocPhotoTips />

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
          disabled={picking || uploadFile.isPending}
        >
          <LinearGradient
            colors={Gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.btn,
              (picking || uploadFile.isPending) && styles.btnDisabled,
            ]}
          >
            <Text style={styles.btnText}>
              {uploadFile.isPending ? "Enviando..." : "Continuar"}
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
