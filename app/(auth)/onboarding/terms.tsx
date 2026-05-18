import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { openBrowserAsync } from 'expo-web-browser';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OnboardingHeader } from '@/components/ui/OnboardingHeader';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Button } from '@/components/ui/Button';
import { IconSymbol } from '@/components/ui/icon-symbol';

const ChevronRight = () => <IconSymbol name="chevron.right" size={18} color="#fff" />;
import { useOnboardingStore } from '@/lib/stores/onboarding.store';
import { Colors, Font, FontSize, Spacing, Accent } from '@/constants/theme';

const TERMS_URL = 'https://pigfi.app/termos';

export default function TermsScreen() {
  const [termsOpened, setTermsOpened] = useState(false);
  const [browserOpen, setBrowserOpen] = useState(false);
  const acceptTerms = useOnboardingStore((s) => s.acceptTerms);

  async function handleOpenTerms() {
    setBrowserOpen(true);
    await openBrowserAsync(TERMS_URL);
    setBrowserOpen(false);
    setTermsOpened(true);
  }

  function handleAccept() {
    acceptTerms();
    router.push('/(auth)/onboarding/personal-data');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <OnboardingHeader />
        <ProgressBar currentStep={1} />

        <View style={styles.body}>
          <View style={styles.iconCircle}>
            <IconSymbol name="doc.text.fill" size={32} color={Accent.primary} />
          </View>

          <Text style={styles.title}>Termos e Condições</Text>
          <Text style={styles.description}>
            Para garantir sua segurança digital e cumprir com as diretrizes regulatórias,
            você será redirecionado para um ambiente externo seguro.
          </Text>

          <View style={styles.notice}>
            <IconSymbol name="shield.fill" size={18} color={Accent.primary} />
            <Text style={styles.noticeText}>
              Leia atentamente o documento antes de aceitar.
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          {browserOpen && (
            <Text style={styles.browserHint}>
              Após ler os termos, feche o navegador para continuar.
            </Text>
          )}
          {!termsOpened ? (
            <Button
              label="Continuar para os Termos"
              rightIcon={<ChevronRight />}
              variant="primary"
              size="lg"
              fullWidth
              loading={browserOpen}
              onPress={handleOpenTerms}
            />
          ) : (
            <Button
              label="Li e aceito os Termos"
              rightIcon={<ChevronRight />}
              variant="primary"
              size="lg"
              fullWidth
              onPress={handleAccept}
            />
          )}
          <Button
            label="Cancelar"
            variant="ghost"
            size="lg"
            fullWidth
            onPress={() => router.back()}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: Spacing[6],
    paddingBottom: Spacing[8],
    gap: Spacing[4],
  },
  body: {
    flex: 1,
    gap: Spacing[4],
    paddingTop: Spacing[4],
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(244, 52, 180, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
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
  notice: {
    flexDirection: 'row',
    gap: Spacing[3],
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: Spacing[4],
    alignItems: 'flex-start',
    marginTop: Spacing[4],
  },
  browserHint: {
    fontFamily: Font.regular,
    fontSize: FontSize.bodySmall,
    color: Colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 20,
  },
  noticeText: {
    flex: 1,
    fontFamily: Font.regular,
    fontSize: FontSize.bodySmall,
    color: Colors.mutedForeground,
    lineHeight: 20,
  },
  actions: {
    gap: Spacing[3],
  },
});
