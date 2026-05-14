import { useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Button } from '@/components/ui/Button';
import { StepItem } from '@/components/ui/StepItem';

const ChevronRight = () => <IconSymbol name="chevron.right" size={18} color="#fff" />;
import { GradientText } from '@/components/ui/GradientText';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useOnboardingStore } from '@/lib/stores/onboarding.store';
import { OnboardingService } from '@/lib/services/onboarding.service';
import { Colors, Font, FontSize, Spacing } from '@/constants/theme';

export default function OnboardingCompleteScreen() {
  const setOnboarded = useAuthStore((s) => s.setOnboarded);
  const reset = useOnboardingStore((s) => s.reset);
  const [loading, setLoading] = useState(false);

  async function handleGoToDashboard() {
    setLoading(true);
    try {
      await OnboardingService.completeOnboarding();
      reset();
      setOnboarded(); // root layout detecta isAuthenticated && isOnboarded e vai para /(tabs)
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.hero}>
          <View style={styles.logoWrapper}>
            <Image
              source={require('@/assets/images/pig.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <View style={styles.checkBadge}>
              <IconSymbol name="checkmark" size={14} color={Colors.background} />
            </View>
          </View>

          <GradientText variant="primary" style={{ textAlign: 'center' }}>
            Tudo Pronto!
          </GradientText>
          <Text style={styles.description}>
            Sua conta foi configurada com sucesso. Agora você já pode começar a economizar e
            gerenciar suas finanças com inteligência.
          </Text>
        </View>

        <View style={styles.steps}>
          <StepItem icon="doc.text.fill"              title="Aceite de Termos" status="complete" />
          <StepItem icon="person.fill"               title="Dados Pessoais"  status="complete" />
          <StepItem icon="person.text.rectangle.fill" title="Documentos"      status="complete" />
          <StepItem icon="wallet.pass.fill"           title="Chave PIX"       status="complete" />
        </View>

        <Button
          label="IR PARA O DASHBOARD"
          rightIcon={<ChevronRight />}
          variant="primary"
          size="lg"
          fullWidth
          loading={loading}
          onPress={handleGoToDashboard}
        />
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
    paddingTop: Spacing[8],
    gap: Spacing[6],
  },
  hero: {
    alignItems: 'center',
    gap: Spacing[3],
  },
  logoWrapper: {
    position: 'relative',
    marginBottom: Spacing[2],
  },
  logo: {
    width: 100,
    height: 100,
  },
  checkBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'hsl(145, 80%, 48%)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
  },
  description: {
    fontFamily: Font.regular,
    fontSize: FontSize.body,
    color: Colors.mutedForeground,
    lineHeight: 24,
    textAlign: 'center',
  },
  steps: {
    flex: 1,
    gap: Spacing[3],
  },
});
