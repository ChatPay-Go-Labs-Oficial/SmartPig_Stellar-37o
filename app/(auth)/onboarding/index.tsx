import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { StepItem } from '@/components/ui/StepItem';
import { IconSymbol } from '@/components/ui/icon-symbol';

const ChevronRight = () => <IconSymbol name="chevron.right" size={18} color="#fff" />;
import { Colors, Font, FontSize, Spacing, Accent } from '@/constants/theme';

const STEPS = [
  { icon: 'doc.text.fill',             title: 'Aceite de Termos', subtitle: 'Para sua segurança' },
  { icon: 'person.fill',               title: 'Dados Pessoais',   subtitle: 'Precisamos conhecer você' },
  { icon: 'person.text.rectangle.fill', title: 'Documentos',       subtitle: 'Verificação de identidade' },
  { icon: 'wallet.pass.fill',          title: 'Chave PIX',        subtitle: 'Para seus saques e depósitos' },
] as const;

export default function OnboardingWelcomeScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <View style={styles.headerSpacer} />
          <Pressable onPress={() => router.replace('/(auth)')} hitSlop={12}>
            <IconSymbol name="xmark" size={22} color={Colors.mutedForeground} />
          </Pressable>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>Seja bem-vindo!</Text>
          <Text style={styles.subtitle}>
            Vamos configurar sua conta em poucos passos para você começar a economizar.
          </Text>

          <View style={styles.steps}>
            {STEPS.map((step, i) => (
              <StepItem
                key={step.title}
                icon={step.icon}
                title={step.title}
                subtitle={step.subtitle}
                status="pending"
                highlighted={i === 0}
                showConnector={i < STEPS.length - 1}
              />
            ))}
          </View>
        </View>

        <Button
          label="Começar"
          rightIcon={<ChevronRight />}
          variant="primary"
          size="lg"
          fullWidth
          onPress={() => router.push('/(auth)/onboarding/terms')}
        />
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
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingVertical: Spacing[4],
  },
  headerSpacer: {
    flex: 1,
  },
  content: {
    flex: 1,
    gap: Spacing[6],
    paddingTop: Spacing[4],
  },
  title: {
    fontFamily: Font.black,
    fontSize: FontSize.displaySm,
    color: Colors.foreground,
  },
  subtitle: {
    fontFamily: Font.regular,
    fontSize: FontSize.body,
    color: Colors.mutedForeground,
    lineHeight: 24,
  },
  steps: {
    marginTop: Spacing[2],
  },
});
