import { useEffect, useRef } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { PressableScale } from '@/components/ui/PressableScale';
import { router } from 'expo-router';
import { Colors, Accent, Font, FontSize, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useBlindPayReceiver } from '@/lib/queries/blindpay.queries';
import { useBlindPayStore } from '@/lib/stores/blindpay.store';

export default function BlindPayOnboardingIndex() {
  const contractId = useAuthStore((s) => s.contractId);
  const { tosId, setReceiver, setBankAccount, setWallet, setCurrentStep } = useBlindPayStore();

  const { data: receiver, isLoading, error, refetch } = useBlindPayReceiver(contractId);

  const hasRouted = useRef(false);

  useEffect(() => {
    if (isLoading || hasRouted.current) return;

    // Ainda sem cadastro → começa pelos Termos de Uso (ou pula direto pros
    // dados se o usuário já aceitou antes e saiu no meio do fluxo).
    if (receiver === null) {
      hasRouted.current = true;
      if (tosId) {
        setCurrentStep('kyc-form');
        router.replace('/(blindpay-onboarding)/kyc-form' as any);
      } else {
        setCurrentStep('tos');
        router.replace('/(blindpay-onboarding)/tos' as any);
      }
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
      router.replace('/(blindpay-onboarding)/bank-account' as any);
      return;
    }

    if (!hasWallet) {
      setCurrentStep('wallet');
      router.replace('/(blindpay-onboarding)/wallet' as any);
      return;
    }

    setCurrentStep('check-status');
    router.replace('/(tabs)' as any);
  }, [receiver, isLoading, error]);

  if (error && !receiver) {
    return (
      <View style={styles.container}>
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
