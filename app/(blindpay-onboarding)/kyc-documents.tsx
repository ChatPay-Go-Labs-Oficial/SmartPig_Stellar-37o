import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { PressableScale } from '@/components/ui/PressableScale';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Accent, Font, FontSize, Gradients, Radius, Spacing } from '@/constants/theme';
import { StarryBackground } from '@/components/ui';
import { OnboardingBackButton } from '@/components/ui/OnboardingBackButton';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useCreateBlindPayReceiver, useUploadKycFile } from '@/lib/queries/blindpay.queries';
import { useBlindPayStore } from '@/lib/stores/blindpay.store';

type DocType = 'selfie' | 'id_front' | 'id_back';
interface DocEntry {
  type: DocType;
  label: string;
  uri: string | null;
}

function toIso8601(dateOnly: string): string | undefined {
  const trimmed = dateOnly.trim();
  if (!trimmed) return undefined;
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? `${trimmed}T00:00:00Z` : trimmed;
}

export default function KycDocumentsScreen() {
  const contractId = useAuthStore((s) => s.contractId);
  const { kycDraft: draft, tosId, setSelfieFileUrl, setIdDocFrontUrl, setIdDocBackUrl, setReceiver, setCurrentStep } =
    useBlindPayStore();
  const uploadFile = useUploadKycFile();
  const createReceiver = useCreateBlindPayReceiver();

  const [docs, setDocs] = useState<DocEntry[]>([
    { type: 'selfie', label: 'Selfie segurando seu documento', uri: null },
    { type: 'id_front', label: 'Frente do documento', uri: null },
    { type: 'id_back', label: 'Verso do documento', uri: null },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function pickImage(docType: DocType) {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setDocs((prev) => prev.map((d) => (d.type === docType ? { ...d, uri: result.assets[0].uri } : d)));
    }
  }

  async function handleSubmit() {
    const missing = docs.filter((d) => !d.uri);
    if (missing.length > 0) {
      setError(`Faltam: ${missing.map((d) => d.label).join(', ')}`);
      return;
    }
    if (!contractId) {
      setError('Sessão expirada. Saia e entre novamente.');
      return;
    }
    setError('');
    setSubmitting(true);

    try {
      const urls: Record<DocType, string> = { selfie: '', id_front: '', id_back: '' };

      for (const doc of docs) {
        const response = await fetch(doc.uri!);
        const blob = await response.blob();
        const { url } = await uploadFile.mutateAsync({
          fileBlob: blob,
          fileName: `${doc.type}.jpg`,
          mimeType: 'image/jpeg',
        });
        urls[doc.type] = url;
      }

      setSelfieFileUrl(urls.selfie);
      setIdDocFrontUrl(urls.id_front);
      setIdDocBackUrl(urls.id_back);

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
        selfieFileUrl: urls.selfie,
        idDocFrontUrl: urls.id_front,
        idDocBackUrl: urls.id_back,
        tosId: tosId ?? undefined,
      });

      setReceiver(receiver.id);
      setCurrentStep('bank-account');
      router.replace('/(blindpay-onboarding)/bank-account' as any);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Erro ao enviar seus dados. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  const allFilled = docs.every((d) => d.uri);

  return (
    <ScrollView contentContainerStyle={styles.container} bounces={false}>
      <StarryBackground />
      <View style={styles.content}>
        <OnboardingBackButton />
        <Text style={styles.title}>Envie seus documentos</Text>
        <Text style={styles.subtitle}>3 fotos para confirmar sua identidade</Text>

        <View style={styles.docsList}>
          {docs.map((doc) => (
            <PressableScale key={doc.type} onPress={() => pickImage(doc.type)}>
              <View style={styles.docCard}>
                {doc.uri ? (
                  <Image source={{ uri: doc.uri }} style={styles.docImage} />
                ) : (
                  <View style={styles.docPlaceholder}>
                    <Text style={styles.docPlaceholderIcon}>📷</Text>
                    <Text style={styles.docPlaceholderText}>{doc.label}</Text>
                  </View>
                )}
              </View>
            </PressableScale>
          ))}
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <LinearGradient
          colors={Gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.btn, (!allFilled || submitting) && styles.btnDisabled]}
        >
          <Text style={styles.btnText} onPress={handleSubmit}>
            {submitting ? 'Enviando...' : 'Enviar documentos'}
          </Text>
        </LinearGradient>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: Colors.background,
    minHeight: '100%',
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing[6],
    paddingTop: 80,
    paddingBottom: 60,
    zIndex: 10,
  },
  title: {
    fontSize: FontSize.heading,
    fontFamily: Font.black,
    color: Colors.foreground,
    marginBottom: Spacing[2],
  },
  subtitle: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
    lineHeight: 22,
    marginBottom: Spacing[6],
  },
  docsList: {
    gap: Spacing[4],
    marginBottom: Spacing[6],
  },
  docCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    height: 180,
  },
  docImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  docPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  docPlaceholderIcon: {
    fontSize: 32,
  },
  docPlaceholderText: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
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
  errorText: {
    color: Accent.destructive,
    fontSize: FontSize.bodySmall,
    fontFamily: Font.regular,
    marginBottom: Spacing[3],
  },
});
