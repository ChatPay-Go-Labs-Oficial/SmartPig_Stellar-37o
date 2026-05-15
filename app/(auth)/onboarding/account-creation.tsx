import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { openBrowserAsync } from 'expo-web-browser';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { OnboardingHeader } from '@/components/ui/OnboardingHeader';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Button } from '@/components/ui/Button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useOnboardingStore } from '@/lib/stores/onboarding.store';
import { useUIStore } from '@/lib/stores/ui.store';
import { OnboardingService } from '@/lib/services/onboarding.service';
import { Colors, Font, FontSize, Spacing, Accent, Radius, Gradients } from '@/constants/theme';

const ChevronRight = () => <IconSymbol name="chevron.right" size={18} color="#fff" />;

const STEPS = [
  {
    icon: 'checkmark.shield.fill' as const,
    label: 'Confirme seus dados',
    description: 'Revise as informações que você forneceu',
  },
  {
    icon: 'doc.text.fill' as const,
    label: 'Assine o contrato',
    description: 'Aceite os termos da plataforma Etherfuse',
  },
  {
    icon: 'arrow.uturn.left' as const,
    label: 'Retorne ao app',
    description: 'Feche o navegador para voltar e finalizar',
  },
];

export default function AccountCreationScreen() {
  const userId = useAuthStore((s) => s.userId);
  const contractId = useAuthStore((s) => s.contractId);
  const saveBankAccountId = useOnboardingStore((s) => s.saveBankAccountId);
  const addToast = useUIStore((s) => s.addToast);
  const [loading, setLoading] = useState(false);

  async function handleCreateAccount() {
    if (!userId || !contractId) {
      addToast('Sessão inválida. Reconecte sua carteira.', 'error');
      return;
    }

    setLoading(true);
    try {
      const { presignedUrl, bankAccountId } = await OnboardingService.getPresignedUrl(
        userId,
        contractId,
      );
      saveBankAccountId(bankAccountId);
      await openBrowserAsync(presignedUrl);
      router.replace('/(auth)/onboarding/complete');
    } catch {
      addToast('Erro ao gerar o link de criação de conta. Tente novamente.', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <OnboardingHeader />
          <ProgressBar currentStep={2} totalSteps={2} />
          <Text style={styles.stepLabel}>PASSO 2 DE 2</Text>
        </View>

        <View style={styles.body}>
          <LinearGradient
            colors={Gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconCircle}
          >
            <IconSymbol name="globe" size={36} color="#fff" />
          </LinearGradient>

          <Text style={styles.title}>Criação da sua conta</Text>
          <Text style={styles.description}>
            O próximo passo acontece em uma página segura externa. Você será redirecionado para
            o ambiente da Etherfuse para finalizar o cadastro.
          </Text>

          <View style={styles.stepsCard}>
            {STEPS.map((step, i) => (
              <View key={step.label} style={styles.stepRow}>
                <View style={styles.stepIconWrapper}>
                  <IconSymbol name={step.icon} size={18} color={Accent.primary} />
                </View>
                <View style={styles.stepText}>
                  <Text style={styles.stepLabel2}>{step.label}</Text>
                  <Text style={styles.stepDescription}>{step.description}</Text>
                </View>
                {i < STEPS.length - 1 && <View style={styles.stepDivider} />}
              </View>
            ))}
          </View>

          <View style={styles.notice}>
            <IconSymbol name="lock.fill" size={14} color={Accent.success} />
            <Text style={styles.noticeText}>
              Ambiente 100% seguro. Seus dados são protegidos com criptografia.
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Button
            label="Criar minha conta"
            rightIcon={<ChevronRight />}
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            onPress={handleCreateAccount}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: {
    flex: 1,
    paddingHorizontal: Spacing[6],
    paddingBottom: Spacing[8],
  },
  header: {
    gap: Spacing[3],
  },
  body: {
    flex: 1,
    gap: Spacing[6],
    paddingTop: Spacing[6],
    alignItems: 'center',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: Font.black,
    fontSize: FontSize.heading,
    color: Colors.foreground,
    textAlign: 'center',
  },
  description: {
    fontFamily: Font.regular,
    fontSize: FontSize.body,
    color: Colors.mutedForeground,
    lineHeight: 24,
    textAlign: 'center',
  },
  stepsCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingVertical: Spacing[2],
    paddingHorizontal: Spacing[4],
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing[3],
    paddingVertical: Spacing[3],
  },
  stepIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(244, 52, 180, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepText: {
    flex: 1,
    gap: 2,
  },
  stepLabel2: {
    fontFamily: Font.bold,
    fontSize: FontSize.bodySmall,
    color: Colors.foreground,
  },
  stepDescription: {
    fontFamily: Font.regular,
    fontSize: FontSize.label,
    color: Colors.mutedForeground,
    lineHeight: 18,
  },
  stepDivider: {
    position: 'absolute',
    bottom: 0,
    left: Spacing[4],
    right: 0,
    height: 1,
    backgroundColor: Colors.border,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  noticeText: {
    flex: 1,
    fontFamily: Font.regular,
    fontSize: FontSize.bodySmall,
    color: Colors.mutedForeground,
    lineHeight: 20,
  },
  stepLabel: {
    fontFamily: Font.bold,
    fontSize: FontSize.label,
    color: Accent.primary,
    letterSpacing: 1,
  },
  footer: {
    paddingTop: Spacing[3],
  },
});
