import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { PressableScale } from '@/components/ui/PressableScale';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Colors, Accent, Font, FontSize, Gradients, Radius, Spacing } from '@/constants/theme';
import { StarryBackground } from '@/components/ui';
import { OnboardingBackButton } from '@/components/ui/OnboardingBackButton';
import { useAuthStore } from '@/lib/stores/auth.store';
import {
  useGeneratePresignedUrl,
  useAcceptEsign,
  useAcceptTerms,
  useAcceptCustomerAgreement,
} from '@/lib/queries/etherfuse.queries';
import { useEtherfuseStore } from '@/lib/stores/etherfuse.store';

interface AgreementItem {
  key: 'esign' | 'terms' | 'customer';
  label: string;
  description: string;
}

const agreements: AgreementItem[] = [
  {
    key: 'esign',
    label: 'Assinatura Eletrônica',
    description: 'Autorizo o uso de assinatura eletrônica para este processo',
  },
  {
    key: 'terms',
    label: 'Termos e Condições',
    description: 'Aceito os termos e condições da Etherfuse',
  },
  {
    key: 'customer',
    label: 'Acordo de Cliente',
    description: 'Aceito o acordo de cliente da Etherfuse',
  },
];

export default function AgreementsScreen() {
  const contractId = useAuthStore((s) => s.contractId);
  const walletAddress = useAuthStore((s) => s.walletAddress);
  const setCurrentStep = useEtherfuseStore((s) => s.setCurrentStep);
  const setPresignedUrl = useEtherfuseStore((s) => s.setPresignedUrl);

  const genUrl = useGeneratePresignedUrl();
  const acceptEsign = useAcceptEsign();
  const acceptTerms = useAcceptTerms();
  const acceptCustomer = useAcceptCustomerAgreement();

  const [accepted, setAccepted] = useState<Set<string>>(new Set());
  const [presignedUrl, setLocalPresignedUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  async function handleAccept(item: AgreementItem) {
    setError('');
    setLoadingKey(item.key);
    try {
      let url = presignedUrl;
      if (!url) {
        const result = await genUrl.mutateAsync({
          userId: contractId!,
          pubkey: walletAddress!,
        });
        url = result.presignedUrl;
        setLocalPresignedUrl(url);
        setPresignedUrl(url);
      }

      const dto = { userId: contractId!, presignedUrl: url };

      switch (item.key) {
        case 'esign':
          await acceptEsign.mutateAsync(dto);
          break;
        case 'terms':
          await acceptTerms.mutateAsync(dto);
          break;
        case 'customer':
          await acceptCustomer.mutateAsync(dto);
          break;
      }

      setAccepted((prev) => new Set(prev).add(item.key));
    } catch (e: any) {
      setError(`Erro ao aceitar ${item.label}: ${e?.response?.data?.message || e?.message}`);
    } finally {
      setLoadingKey(null);
    }
  }

  function handleContinue() {
    if (accepted.size < agreements.length) {
      setError('Aceite todos os termos antes de continuar');
      return;
    }
    setCurrentStep('presigned-bank');
    router.replace('/(etherfuse-onboarding)/presigned-bank' as any);
  }

  const allAccepted = accepted.size === agreements.length;

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      bounces={false}
    >
        <StarryBackground />
        <View style={styles.content}>
          <OnboardingBackButton />
          <Text style={styles.title}>Termos e Acordos</Text>
        <Text style={styles.subtitle}>
          Aceite cada termo para prosseguir com o cadastro da conta bancária
        </Text>

        <View style={styles.list}>
          {agreements.map((item) => {
            const isAccepted = accepted.has(item.key);
            const isLoading = loadingKey === item.key;
            return (
              <PressableScale
                key={item.key}
                onPress={() => handleAccept(item)}
                disabled={isAccepted || isLoading}
              >
                <View style={[styles.agreementCard, isAccepted && styles.agreementCardAccepted]}>
                  <View style={styles.agreementContent}>
                    <View style={styles.checkBox}>
                      {isAccepted ? (
                        <Text style={styles.checkMark}>✓</Text>
                      ) : isLoading ? (
                        <Text style={styles.loadingDots}>...</Text>
                      ) : null}
                    </View>
                    <View style={styles.agreementText}>
                      <Text style={styles.agreementLabel}>{item.label}</Text>
                      <Text style={styles.agreementDesc}>{item.description}</Text>
                    </View>
                  </View>
                  {!isAccepted && !isLoading && (
                    <Text style={styles.acceptBtn}>Aceitar</Text>
                  )}
                </View>
              </PressableScale>
            );
          })}
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <LinearGradient
          colors={Gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.btn, !allAccepted && styles.btnDisabled]}
        >
          <Text
            style={styles.btnText}
            onPress={handleContinue}
            disabled={!allAccepted}
          >
            Continuar
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
  list: {
    gap: Spacing[3],
    marginBottom: Spacing[6],
  },
  agreementCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[4],
  },
  agreementCardAccepted: {
    borderColor: Accent.success,
    backgroundColor: 'hsla(145, 80%, 48%, 0.08)',
  },
  agreementContent: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  checkBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkMark: {
    color: Accent.success,
    fontSize: 16,
    fontFamily: Font.black,
  },
  loadingDots: {
    color: Accent.primary,
    fontSize: 16,
    fontFamily: Font.black,
  },
  agreementText: {
    flex: 1,
    gap: 2,
  },
  agreementLabel: {
    fontSize: FontSize.body,
    fontFamily: Font.bold,
    color: Colors.foreground,
  },
  agreementDesc: {
    fontSize: FontSize.label,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
  },
  acceptBtn: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.bold,
    color: Accent.primary,
    marginTop: 8,
    textAlign: 'right',
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
