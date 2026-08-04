import { useState } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors, Accent, Font, FontSize, Gradients, Radius, Spacing } from '@/constants/theme';
import { OnboardingStepHeader, OnboardingProgress, PressableScale, DocPhotoTips } from '@/components/ui';
import { useUploadKycFile } from '@/lib/queries/blindpay.queries';
import { useBlindPayStore } from '@/lib/stores/blindpay.store';
import { pickPhoto } from '@/lib/media/pick-photo';
import { safeReplace } from '@/lib/navigation/safe-replace';

const DOC_TYPE_LABELS: Record<string, string> = {
  ID_CARD: 'RG',
  DRIVERS: 'CNH',
  PASSPORT: 'passaporte',
};

export default function KycDocFrontScreen() {
  const draft = useBlindPayStore((s) => s.kycDraft);
  const idDocFrontUrl = useBlindPayStore((s) => s.idDocFrontUrl);
  const setIdDocFrontUrl = useBlindPayStore((s) => s.setIdDocFrontUrl);
  const setCurrentStep = useBlindPayStore((s) => s.setCurrentStep);
  const uploadFile = useUploadKycFile();

  const docLabel = DOC_TYPE_LABELS[draft.idDocType ?? 'ID_CARD'] ?? 'documento';

  const [uri, setUri] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [picking, setPicking] = useState(false);

  // Se voltou pra esse passo antes e não trocou de foto, mostra a que já foi
  // enviada em vez de forçar tirar outra à toa.
  const previewUri = uri ?? idDocFrontUrl ?? null;

  async function pickImage() {
    setPicking(true);
    try {
      const result = await pickPhoto();
      if (!result) return;
      if ('error' in result) {
        setError(result.error);
        return;
      }
      setUri(result.uri);
      setError('');
    } finally {
      setPicking(false);
    }
  }

  async function handleContinue() {
    if (!uri && !idDocFrontUrl) {
      setError('Tire uma foto para continuar');
      return;
    }
    setError('');
    if (!uri) {
      // Nada mudou desde a última vez — já tem uma foto enviada, só segue.
      setCurrentStep('kyc-doc-back');
      safeReplace('/(blindpay-onboarding)/kyc-doc-back');
      return;
    }
    try {
      const { url } = await uploadFile.mutateAsync({
        fileUri: uri,
        fileName: 'id_front.jpg',
        mimeType: 'image/jpeg',
      });
      setIdDocFrontUrl(url);
      setCurrentStep('kyc-doc-back');
      safeReplace('/(blindpay-onboarding)/kyc-doc-back');
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Não foi possível enviar sua foto. Tente novamente.');
    }
  }

  function handleBack() {
    setCurrentStep('kyc-selfie');
    safeReplace('/(blindpay-onboarding)/kyc-selfie');
  }

  return (
    <View style={styles.container}>
      <OnboardingStepHeader onBack={handleBack} />
      <OnboardingProgress step={7} total={10} />
      <Text style={styles.title}>Agora, a frente do seu documento</Text>
      <Text style={styles.subtitle}>
        Fotografe a frente do seu {docLabel}, com os quatro cantos dentro da
        foto e uma margem em volta. Confira na pré-visualização se nenhuma
        borda ficou de fora.
      </Text>
      <DocPhotoTips />

      <View style={styles.captureWrap}>
        <PressableScale onPress={pickImage} disabled={picking}>
          <View style={styles.captureCard}>
            {picking ? (
              <View style={styles.capturePlaceholder}>
                <ActivityIndicator color={Accent.primary} />
                <Text style={styles.captureHint}>Selecionando foto...</Text>
              </View>
            ) : previewUri ? (
              <Image source={{ uri: previewUri }} style={styles.preview} />
            ) : (
              <View style={styles.capturePlaceholder}>
                <MaterialIcons name="credit-card" size={40} color={Colors.mutedForeground} />
                <Text style={styles.captureHint}>Toque para tirar a foto</Text>
              </View>
            )}
          </View>
        </PressableScale>
        {previewUri && !picking ? (
          <PressableScale onPress={pickImage} style={styles.retakeBtn} disabled={picking}>
            <Text style={styles.retakeText}>Tirar outra foto</Text>
          </PressableScale>
        ) : null}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.footer}>
        <PressableScale onPress={handleContinue} disabled={picking || uploadFile.isPending}>
          <LinearGradient
            colors={Gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.btn, (picking || uploadFile.isPending) && styles.btnDisabled]}
          >
            <Text style={styles.btnText}>{uploadFile.isPending ? 'Enviando...' : 'Continuar'}</Text>
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
    alignSelf: 'center',
    // Documento é deitado — um quadro retrato empurrava a foto para uma faixa
    // estreita e ilegível depois que o preview passou a mostrar tudo.
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  retakeBtn: {
    alignSelf: 'center',
  },
  capturePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  captureHint: {
    fontSize: FontSize.label,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
  },
  preview: {
    width: '100%',
    height: '100%',
    // 'contain', nunca 'cover': com cover o preview descarta as bordas da foto
    // — exatamente a região que a BlindPay checa — e o usuário aprovava uma
    // imagem com os cantos cortados sem ter como enxergar isso.
    resizeMode: 'contain',
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
    textAlign: 'center',
    marginTop: Spacing[4],
  },
  footer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  btn: {
    paddingVertical: 14,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  btnText: {
    color: '#fff',
    fontSize: FontSize.body,
    fontWeight: '700',
    fontFamily: Font.bold,
  },
});
