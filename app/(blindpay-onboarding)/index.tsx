import { useEffect, useRef } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { PressableScale } from '@/components/ui/PressableScale';
import { OnboardingBackButton } from '@/components/ui/OnboardingBackButton';
import { Colors, Accent, Font, FontSize, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useBlindPayReceiver } from '@/lib/queries/blindpay.queries';
import { useBlindPayStore, type BlindPayOnboardingStep } from '@/lib/stores/blindpay.store';
import { safeReplace } from '@/lib/navigation/safe-replace';

// Passos preenchidos localmente, antes do cadastro existir no backend.
// Cada tela grava o próprio nome em setCurrentStep(...) ao avançar, então
// esse valor reflete fielmente onde o usuário parou — reabrir o app deve
// retomar daqui, em vez de recomeçar do zero.
const LOCAL_STEPS: BlindPayOnboardingStep[] = [
  'tos',
  'kyc-form',
  'kyc-document',
  'kyc-address',
  'kyc-documents-intro',
  'kyc-selfie',
  'kyc-doc-front',
  'kyc-doc-back',
];

export default function BlindPayOnboardingIndex() {
  const contractId = useAuthStore((s) => s.contractId);
  const {
    tosId,
    currentStep,
    setReceiver,
    setBankAccount,
    setWallet,
    setCurrentStep,
    hydrateSecureFields,
  } = useBlindPayStore();

  const { data: receiver, isLoading, error, refetch } = useBlindPayReceiver(contractId);

  const hasRouted = useRef(false);

  // O rascunho de KYC (CPF, endereço, data de nascimento) e as URLs dos
  // documentos enviados vivem no SecureStore, fora da rehidratação automática
  // do zustand — repõe no estado uma vez aqui, antes de qualquer tela de
  // formulário do onboarding montar.
  useEffect(() => {
    hydrateSecureFields();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isLoading || hasRouted.current) return;

    // Ainda sem cadastro no backend → retoma no passo local onde o usuário
    // parou (currentStep), ou começa pelos Termos de Uso se for a primeira vez.
    if (receiver === null) {
      hasRouted.current = true;
      const resumeStep = LOCAL_STEPS.includes(currentStep)
        ? currentStep
        : tosId
          ? 'kyc-form'
          : 'tos';
      setCurrentStep(resumeStep);
      safeReplace(`/(blindpay-onboarding)/${resumeStep}`);
      return;
    }

    if (error || !receiver) return;

    hasRouted.current = true;
    setReceiver(receiver.id);

    const hasBankAccount = (receiver.bankAccounts?.length ?? 0) > 0;
    const hasWallet = (receiver.blockchainWallets?.length ?? 0) > 0;
    setBankAccount(hasBankAccount);
    setWallet(hasWallet);

    if (!hasBankAccount) {
      setCurrentStep('bank-account');
      safeReplace('/(blindpay-onboarding)/bank-account');
      return;
    }

    if (!hasWallet) {
      setCurrentStep('wallet');
      safeReplace('/(blindpay-onboarding)/wallet');
      return;
    }

    setCurrentStep('check-status');
    safeReplace('/(tabs)');
  }, [receiver, isLoading, error]);

  if (error && !receiver) {
    return (
      <View style={styles.container}>
        <View style={styles.backBtnWrap}>
          <OnboardingBackButton />
        </View>
        <Text style={styles.errorText}>Não foi possível verificar sua conta</Text>
        <PressableScale onPress={() => refetch()}>
          <Text style={styles.retryBtn}>Tentar novamente</Text>
        </PressableScale>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator color={Accent.primary} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing[6],
    gap: 16,
  },
  backBtnWrap: {
    position: 'absolute',
    top: 60,
    left: Spacing[6],
  },
  errorText: {
    fontSize: FontSize.body,
    fontFamily: Font.regular,
    color: Accent.destructive,
    textAlign: 'center',
  },
  retryBtn: {
    fontSize: FontSize.body,
    fontFamily: Font.bold,
    color: Accent.primary,
  },
});
