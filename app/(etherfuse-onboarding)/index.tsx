import { useEffect, useRef } from 'react';
import {
  View,
  ActivityIndicator,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { Colors, Accent, Font, FontSize, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useEtherfuseCustomer } from '@/lib/queries/etherfuse.queries';
import { useEtherfuseStore } from '@/lib/stores/etherfuse.store';

export default function EtherfuseOnboardingIndex() {
  const contractId = useAuthStore((s) => s.contractId);
  const { setCustomer, setKycStatus, setCurrentStep } = useEtherfuseStore();

  const {
    data: customer,
    isLoading,
    error,
    refetch,
  } = useEtherfuseCustomer(contractId);

  const hasRouted = useRef(false);

  useEffect(() => {
    if (isLoading || hasRouted.current) return;

    // Novo usuário (404) → criar conta
    if (customer === null) {
      setCurrentStep('organization');
      router.replace('/(etherfuse-onboarding)/organization' as any);
      hasRouted.current = true;
      return;
    }

    // Erro na consulta → mostrar tela de erro
    if (error || !customer) return;

    hasRouted.current = true;
    setCustomer(customer.id, customer.etherfuseOrgId);
    setKycStatus(customer.kycStatus);

    const hasCompliantBank = customer.bankAccounts?.some((a) => a.isCompliant);

    // Totalmente onboarded → home
    if (
      (customer.kycStatus === 'APPROVED' || customer.kycStatus === 'APPROVED_CHAIN_DEPLOYING') &&
      hasCompliantBank
    ) {
      setCurrentStep('check-status');
      router.replace('/(tabs)' as any);
      return;
    }

    switch (customer.kycStatus) {
      case 'NOT_STARTED':
        setCurrentStep('kyc-form');
        router.replace('/(etherfuse-onboarding)/kyc-form' as any);
        break;
      case 'PROPOSED':
        setCurrentStep('pending');
        router.replace('/(etherfuse-onboarding)/pending' as any);
        break;
      case 'REJECTED':
        setCurrentStep('kyc-form');
        router.replace('/(etherfuse-onboarding)/kyc-form' as any);
        break;
      case 'APPROVED':
      case 'APPROVED_CHAIN_DEPLOYING':
        setCurrentStep('presigned-bank');
        router.replace('/(etherfuse-onboarding)/agreements' as any);
        break;
      default:
        setCurrentStep('pending');
        router.replace('/(etherfuse-onboarding)/pending' as any);
    }
  }, [customer, isLoading, error]);

  if (error && !customer) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Erro ao verificar status da conta</Text>
        <Pressable onPress={() => refetch()}>
          <Text style={styles.retryBtn}>Tentar novamente</Text>
        </Pressable>
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
