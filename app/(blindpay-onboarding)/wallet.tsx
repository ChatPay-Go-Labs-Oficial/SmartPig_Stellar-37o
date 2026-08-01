import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors, Accent, Font, FontSize, Gradients, Radius, Spacing } from '@/constants/theme';
import { OnboardingBackButton, OnboardingProgress } from '@/components/ui';
import { PressableScale } from '@/components/ui/PressableScale';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useCreateBlockchainWallet } from '@/lib/queries/blindpay.queries';
import { useSubmitTrustlineXdr } from '@/lib/queries/etherfuse-ramp.queries';
import { signBlindPayXdr } from '@/lib/queries/blindpay-ramp.queries';
import { authenticateWithDeviceBiometrics } from '@/lib/security/biometrics';
import { useBlindPayStore } from '@/lib/stores/blindpay.store';
import { safeReplace } from '@/lib/navigation/safe-replace';

type Step = 'preparing' | 'need-confirmation' | 'confirming' | 'done' | 'error';

export default function WalletScreen() {
  const contractId = useAuthStore((s) => s.contractId);
  const walletAddress = useAuthStore((s) => s.walletAddress);
  const setWallet = useBlindPayStore((s) => s.setWallet);
  const setCurrentStep = useBlindPayStore((s) => s.setCurrentStep);

  const createWallet = useCreateBlockchainWallet();
  const submitTrustline = useSubmitTrustlineXdr();

  const [step, setStep] = useState<Step>('preparing');
  const [error, setError] = useState('');
  const [pendingXdr, setPendingXdr] = useState<string | null>(null);
  const hasStarted = useRef(false);

  async function finish() {
    setWallet(true);
    setCurrentStep('pending');
    safeReplace('/(blindpay-onboarding)/pending');
  }

  async function prepareAccount() {
    if (!contractId || !walletAddress) return;
    setStep('preparing');
    setError('');
    try {
      const result = await createWallet.mutateAsync({
        userId: contractId,
        stellarAddress: walletAddress,
      });
      if (result.trustlineXdr) {
        setPendingXdr(result.trustlineXdr);
        setStep('need-confirmation');
      } else {
        await finish();
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Não foi possível preparar sua conta');
      setStep('error');
    }
  }

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    prepareAccount();
  }, []);

  async function handleConfirm() {
    if (!pendingXdr || !walletAddress) return;
    setError('');
    setStep('confirming');
    try {
      const biometricResult = await authenticateWithDeviceBiometrics({
        promptMessage: 'Confirme para liberar o Pix',
        promptSubtitle: 'Ativação da sua conta PigFi',
        promptDescription: 'Autorize a ativação do recebimento via Pix na sua conta.',
      });

      if (!biometricResult.success) {
        setError(biometricResult.message ?? 'Biometria não confirmada. Tente novamente.');
        setStep('need-confirmation');
        return;
      }

      const signedXdr = await signBlindPayXdr(pendingXdr);
      await submitTrustline.mutateAsync({ signedXdr, stellarAddress: walletAddress });
      await finish();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Não foi possível confirmar. Tente novamente.');
      setStep('need-confirmation');
    }
  }

  return (
    <View style={styles.container}>
      <OnboardingBackButton />
      <OnboardingProgress step={10} total={10} />

      {(step === 'preparing' || step === 'confirming') && (
        <View style={styles.centerBody}>
          <ActivityIndicator color={Accent.primary} size="large" />
          <Text style={styles.title}>
            {step === 'confirming' ? 'Confirmando...' : 'Preparando sua conta'}
          </Text>
          <Text style={styles.subtitle}>
            {step === 'confirming'
              ? 'Use a biometria do aparelho para autorizar'
              : 'Estamos ativando o recebimento via Pix'}
          </Text>
        </View>
      )}

      {step === 'need-confirmation' && (
        <View style={styles.centerBody}>
          <View style={styles.iconWrap}>
            <MaterialIcons name="fingerprint" size={34} color={Accent.primary} />
          </View>
          <Text style={styles.title}>Falta pouco</Text>
          <Text style={styles.subtitle}>
            Confirme com sua biometria para liberar o recebimento via Pix na sua conta
          </Text>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <PressableScale onPress={handleConfirm} style={styles.btnWrap}>
            <LinearGradient
              colors={Gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.btn}
            >
              <Text style={styles.btnText}>Confirmar</Text>
            </LinearGradient>
          </PressableScale>
        </View>
      )}

      {step === 'error' && (
        <View style={styles.centerBody}>
          <Text style={styles.errorText}>{error}</Text>
          <PressableScale onPress={prepareAccount} style={styles.btnWrap}>
            <LinearGradient
              colors={Gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.btn}
            >
              <Text style={styles.btnText}>Tentar novamente</Text>
            </LinearGradient>
          </PressableScale>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing[6],
    paddingTop: 80,
  },
  centerBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingBottom: 100,
  },
  iconWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: FontSize.heading,
    fontFamily: Font.black,
    color: Colors.foreground,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSize.body,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
  errorText: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.regular,
    color: Accent.destructive,
    textAlign: 'center',
    maxWidth: 300,
  },
  btnWrap: {
    width: '100%',
    marginTop: Spacing[4],
  },
  btn: {
    paddingVertical: 14,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  btnText: {
    color: '#fff',
    fontSize: FontSize.body,
    fontWeight: '700',
    fontFamily: Font.bold,
  },
});
