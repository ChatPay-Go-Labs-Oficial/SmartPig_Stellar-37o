import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
} from 'react-native';
import { PressableScale } from '@/components/ui/PressableScale';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Accent, Font, FontSize, Gradients, Radius, Spacing, scaleFont } from '@/constants/theme';
import { StarryBackground } from '@/components/ui';
import { OnboardingBackButton } from '@/components/ui/OnboardingBackButton';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useUploadKycDocument } from '@/lib/queries/etherfuse.queries';
import { useEtherfuseStore } from '@/lib/stores/etherfuse.store';

type DocType = 'selfie' | 'id_front' | 'id_back';
interface DocEntry {
  type: DocType;
  label: string;
  uri: string | null;
}

export default function KycDocumentsScreen() {
  const contractId = useAuthStore((s) => s.contractId);
  const walletAddress = useAuthStore((s) => s.walletAddress);
  const setCurrentStep = useEtherfuseStore((s) => s.setCurrentStep);
  const uploadDoc = useUploadKycDocument();

  const [docs, setDocs] = useState<DocEntry[]>([
    { type: 'selfie', label: 'Selfie com seu documento', uri: null },
    { type: 'id_front', label: 'Frente do documento', uri: null },
    { type: 'id_back', label: 'Verso do documento', uri: null },
  ]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function pickImage(docType: DocType) {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setDocs((prev) =>
        prev.map((d) => (d.type === docType ? { ...d, uri: result.assets[0].uri } : d)),
      );
    }
  }

  async function handleSubmit() {
    const missing = docs.filter((d) => !d.uri);
    if (missing.length > 0) {
      setError(`Faltam: ${missing.map((d) => d.label).join(', ')}`);
      return;
    }
    setError('');
    setUploading(true);

    try {
      for (const doc of docs) {
        const response = await fetch(doc.uri!);
        const blob = await response.blob();
        const fileName = `${doc.type}.jpg`;
        await uploadDoc.mutateAsync({
          dto: {
            userId: contractId!,
            pubkey: walletAddress!,
            documentType: doc.type,
          },
          fileBuffer: blob,
          fileName,
          mimeType: 'image/jpeg',
        });
      }
      setCurrentStep('agreements');
      router.replace('/(etherfuse-onboarding)/agreements' as any);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Erro ao enviar documentos');
    } finally {
      setUploading(false);
    }
  }

  const allFilled = docs.every((d) => d.uri);

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      bounces={false}
    >
      <StarryBackground />
      <View style={styles.content}>
        <OnboardingBackButton />
        <Text style={styles.title}>Upload de Documentos</Text>
        <Text style={styles.subtitle}>
          Envie 3 fotos para verificação de identidade
        </Text>

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
          style={[styles.btn, (!allFilled || uploading) && styles.btnDisabled]}
        >
          <Text
            style={styles.btnText}
            onPress={handleSubmit}
            disabled={!allFilled || uploading}
          >
            {uploading ? 'Enviando...' : 'Enviar Documentos'}
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
    fontSize: scaleFont(32),
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
