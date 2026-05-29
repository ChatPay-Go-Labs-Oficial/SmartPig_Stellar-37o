import { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Colors, Accent, Font, FontSize, Gradients, Radius, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useGetKycStatus } from '@/lib/queries/etherfuse.queries';
import { useEtherfuseStore } from '@/lib/stores/etherfuse.store';

export default function PendingScreen() {
  const contractId = useAuthStore((s) => s.contractId);
  const walletAddress = useAuthStore((s) => s.walletAddress);
  const checkStatus = useGetKycStatus();
  const { kycStatus, setKycStatus, setCurrentStep } = useEtherfuseStore();
  const [message, setMessage] = useState('Aguardando aprovação...');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function pollStatus() {
    try {
      const result = await checkStatus.mutateAsync({
        userId: contractId!,
        pubkey: walletAddress!,
      });

      const status = result.status;
      setKycStatus(status as any);

      if (status === 'approved' || status === 'approved_chain_deploying') {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setMessage('KYC aprovado! Redirecionando...');
        setTimeout(() => {
          setCurrentStep('check-status');
          router.replace('/(tabs)' as any);
        }, 2000);
      } else if (status === 'rejected') {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setMessage('KYC rejeitado. Reveja seus dados.');
        setTimeout(() => {
          setCurrentStep('kyc-form');
          router.replace('/(etherfuse-onboarding)/kyc-form' as any);
        }, 3000);
      } else {
        setMessage('Sua verificação está sendo analisada...');
      }
    } catch {
      // Ignora erros de polling
    }
  }

  useEffect(() => {
    pollStatus();
    intervalRef.current = setInterval(pollStatus, 10000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          {kycStatus === 'REJECTED' ? (
            <Text style={styles.icon}>❌</Text>
          ) : (
            <ActivityIndicator color={Accent.primary} size={48} />
          )}
        </View>

        <Text style={styles.title}>
          {kycStatus === 'REJECTED' ? 'Verificação Rejeitada' : 'Verificação em Análise'}
        </Text>
        <Text style={styles.message}>{message}</Text>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Status atual</Text>
          <Text style={styles.infoStatus}>
            {kycStatus === 'NOT_STARTED' && 'Não iniciado'}
            {kycStatus === 'PROPOSED' && 'Em análise'}
            {kycStatus === 'APPROVED' && 'Aprovado'}
            {kycStatus === 'APPROVED_CHAIN_DEPLOYING' && 'Aprovado'}
            {kycStatus === 'REJECTED' && 'Rejeitado'}
            {!kycStatus && 'Aguardando...'}
          </Text>
        </View>

        {kycStatus !== 'REJECTED' && (
          <Text style={styles.hint}>
            Isso pode levar alguns minutos. Você pode fechar o app e voltar depois.
          </Text>
        )}

        {kycStatus === 'REJECTED' && (
          <LinearGradient
            colors={Gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.btn}
          >
            <Text
              style={styles.btnText}
              onPress={() => {
                if (intervalRef.current) clearInterval(intervalRef.current);
                setCurrentStep('kyc-form');
                router.replace('/(etherfuse-onboarding)/kyc-form' as any);
              }}
            >
              Tentar Novamente
            </Text>
          </LinearGradient>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: Spacing[8],
    gap: 16,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  icon: {
    fontSize: 36,
  },
  title: {
    fontSize: FontSize.heading,
    fontFamily: Font.black,
    color: Colors.foreground,
    textAlign: 'center',
  },
  message: {
    fontSize: FontSize.body,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 24,
  },
  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[4],
    alignItems: 'center',
    gap: 4,
    width: '100%',
    marginTop: Spacing[4],
  },
  infoTitle: {
    fontSize: FontSize.label,
    fontFamily: Font.bold,
    color: Colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoStatus: {
    fontSize: FontSize.subheading,
    fontFamily: Font.black,
    color: Colors.foreground,
  },
  hint: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
    textAlign: 'center',
    marginTop: Spacing[4],
  },
  btn: {
    paddingVertical: 14,
    borderRadius: Radius.sm,
    alignItems: 'center',
    width: '100%',
    marginTop: Spacing[4],
  },
  btnText: {
    color: '#fff',
    fontSize: FontSize.body,
    fontWeight: '700',
    fontFamily: Font.bold,
  },
});
