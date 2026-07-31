import { useState } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors, Accent, Font, FontSize, Gradients, Radius, Spacing } from '@/constants/theme';
import { OnboardingBackButton, OnboardingProgress, PressableScale } from '@/components/ui';
import { useUploadKycFile } from '@/lib/queries/blindpay.queries';
import { useBlindPayStore } from '@/lib/stores/blindpay.store';
import { pickPhoto } from '@/lib/media/pick-photo';
import { safeReplace } from '@/lib/navigation/safe-replace';

export default function KycSelfieScreen() {
  const setSelfieFileUrl = useBlindPayStore((s) => s.setSelfieFileUrl);
  const setCurrentStep = useBlindPayStore((s) => s.setCurrentStep);
  const uploadFile = useUploadKycFile();

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
      setError('Tire uma selfie para continuar');
      return;
    }
    setError('');
    try {
      const { url } = await uploadFile.mutateAsync({
        fileUri: uri,
        fileName: 'selfie.jpg',
        mimeType: 'image/jpeg',
      });
      setSelfieFileUrl(url);
      setCurrentStep('kyc-doc-front');
      safeReplace('/(blindpay-onboarding)/kyc-doc-front');
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Não foi possível enviar sua foto. Tente novamente.');
    }
  }

  return (
    <View style={styles.container}>
      <OnboardingBackButton />
      <OnboardingProgress step={6} total={10} />
      <Text style={styles.title}>Vamos começar com uma selfie</Text>
      <Text style={styles.subtitle}>
        Seu rosto visível, sem óculos escuros ou boné, em um lugar bem iluminado.
      </Text>

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
                <MaterialIcons name="face" size={40} color={Colors.mutedForeground} />
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
