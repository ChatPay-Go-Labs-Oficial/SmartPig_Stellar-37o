import { useState } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors, Accent, Font, FontSize, Gradients, Radius, Spacing } from '@/constants/theme';
import { OnboardingBackButton, OnboardingProgress, PressableScale } from '@/components/ui';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useCreateBlindPayReceiver, useUploadKycFile } from '@/lib/queries/blindpay.queries';
import { useBlindPayStore } from '@/lib/stores/blindpay.store';
import { pickPhoto } from '@/lib/media/pick-photo';
import { safeReplace } from '@/lib/navigation/safe-replace';

const DOC_TYPE_LABELS: Record<string, string> = {
  ID_CARD: 'RG',
  DRIVERS: 'CNH',
  PASSPORT: 'passaporte',
};

function toIso8601(dateOnly: string): string | undefined {
  const trimmed = dateOnly.trim();
  if (!trimmed) return undefined;
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? `${trimmed}T00:00:00Z` : trimmed;
}

export default function KycDocBackScreen() {
  const contractId = useAuthStore((s) => s.contractId);
  const {
    kycDraft: draft,
    tosId,
    selfieFileUrl,
    idDocFrontUrl,
    setIdDocBackUrl,
    setReceiver,
    setCurrentStep,
  } = useBlindPayStore();
  const uploadFile = useUploadKycFile();
  const createReceiver = useCreateBlindPayReceiver();

  const docLabel = DOC_TYPE_LABELS[draft.idDocType ?? 'ID_CARD'] ?? 'documento';
  const submitting = uploadFile.isPending || createReceiver.isPending;

  const [uri, setUri] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [picking, setPicking] = useState(false);

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
    if (!uri) {
      setError('Tire uma foto para continuar');
      return;
    }
    if (!contractId) {
      setError('Sessão expirada. Saia e entre novamente.');
      return;
    }
    setError('');
    try {
      const { url: idDocBackUrl } = await uploadFile.mutateAsync({
        fileUri: uri,
        fileName: 'id_back.jpg',
        mimeType: 'image/jpeg',
      });
      setIdDocBackUrl(idDocBackUrl);

      const receiver = await createReceiver.mutateAsync({
        userId: contractId,
        email: draft.email ?? '',
        firstName: draft.firstName,
        lastName: draft.lastName,
        taxId: draft.taxId,
        country: 'BR',
        type: 'individual',
        kycType: 'standard',
        addressLine1: draft.addressLine1,
        addressLine2: draft.addressLine2 || undefined,
        city: draft.city,
        stateProvinceRegion: draft.stateProvinceRegion,
        postalCode: draft.postalCode,
        dateOfBirth: toIso8601(draft.dateOfBirth ?? ''),
        idDocCountry: draft.idDocCountry ?? 'BR',
        idDocType: draft.idDocType,
        selfieFileUrl: selfieFileUrl ?? '',
        idDocFrontUrl: idDocFrontUrl ?? '',
        idDocBackUrl,
        tosId: tosId ?? undefined,
      });

      setReceiver(receiver.id);
      setCurrentStep('bank-account');
      safeReplace('/(blindpay-onboarding)/bank-account');
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Erro ao enviar seus dados. Tente novamente.');
    }
  }

  return (
    <View style={styles.container}>
      <OnboardingBackButton />
      <OnboardingProgress step={8} total={10} />
      <Text style={styles.title}>Por último, o verso</Text>
      <Text style={styles.subtitle}>Fotografe o verso do seu {docLabel}, sem cortes nas bordas.</Text>

      <View style={styles.captureWrap}>
        <PressableScale onPress={pickImage} disabled={picking}>
          <View style={styles.captureCard}>
            {picking ? (
              <View style={styles.capturePlaceholder}>
                <ActivityIndicator color={Accent.primary} />
                <Text style={styles.captureHint}>Selecionando foto...</Text>
              </View>
            ) : uri ? (
              <Image source={{ uri }} style={styles.preview} />
            ) : (
              <View style={styles.capturePlaceholder}>
                <MaterialIcons name="credit-card" size={40} color={Colors.mutedForeground} />
                <Text style={styles.captureHint}>Toque para tirar a foto</Text>
              </View>
            )}
          </View>
        </PressableScale>
        {uri && !picking ? (
          <PressableScale onPress={pickImage} style={styles.retakeBtn} disabled={picking}>
            <Text style={styles.retakeText}>Tirar outra foto</Text>
          </PressableScale>
        ) : null}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.footer}>
        <PressableScale onPress={handleContinue} disabled={picking || submitting}>
          <LinearGradient
            colors={Gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.btn, (picking || submitting) && styles.btnDisabled]}
          >
            <Text style={styles.btnText}>{submitting ? 'Enviando...' : 'Concluir envio'}</Text>
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
    width: '70%',
    aspectRatio: 3 / 4,
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
    resizeMode: 'cover',
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
