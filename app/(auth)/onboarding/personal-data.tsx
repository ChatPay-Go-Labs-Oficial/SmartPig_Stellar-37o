import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OnboardingHeader } from '@/components/ui/OnboardingHeader';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { TextInput } from '@/components/ui/TextInput';
import { Button } from '@/components/ui/Button';
import { useOnboardingStore } from '@/lib/stores/onboarding.store';
import { OnboardingService } from '@/lib/services/onboarding.service';
import { Colors, Font, FontSize, Spacing, Accent } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';

const ChevronRight = () => <IconSymbol name="chevron.right" size={18} color="#fff" />;

export default function PersonalDataScreen() {
  const saved = useOnboardingStore((s) => s.personalData);
  const savePersonalData = useOnboardingStore((s) => s.savePersonalData);

  const [firstName, setFirstName] = useState(saved?.firstName ?? '');
  const [lastName, setLastName] = useState(saved?.lastName ?? '');
  const [email, setEmail] = useState(saved?.email ?? '');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!firstName.trim()) e.firstName = 'Campo obrigatório';
    if (!lastName.trim()) e.lastName = 'Campo obrigatório';
    if (!email.trim() || !email.includes('@')) e.email = 'E-mail inválido';
    return e;
  }

  async function handleNext() {
    const e = validate();
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }
    setLoading(true);
    try {
      const data = { firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim() };
      await OnboardingService.submitPersonalData(data);
      savePersonalData(data);
      router.push('/(auth)/onboarding/address');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <OnboardingHeader />
          <ProgressBar currentStep={2} />
          <Text style={styles.stepLabel}>PASSO 1/2</Text>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Dados Pessoais</Text>
          <Text style={styles.description}>
            Para começar, precisamos conhecer um pouco mais sobre você.
          </Text>

          <View style={styles.form}>
            <TextInput
              label="Nome"
              placeholder="Seu nome"
              value={firstName}
              onChangeText={(v) => { setFirstName(v); setErrors((e) => ({ ...e, firstName: '' })); }}
              error={errors.firstName}
              autoCapitalize="words"
            />
            <TextInput
              label="Sobrenome"
              placeholder="Seu sobrenome"
              value={lastName}
              onChangeText={(v) => { setLastName(v); setErrors((e) => ({ ...e, lastName: '' })); }}
              error={errors.lastName}
              autoCapitalize="words"
            />
            <TextInput
              label="Email"
              placeholder="seu@email.com"
              value={email}
              onChangeText={(v) => { setEmail(v); setErrors((e) => ({ ...e, email: '' })); }}
              error={errors.email}
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon={<IconSymbol name="envelope.fill" size={18} color={Colors.mutedForeground} />}
            />
          </View>

          <View style={styles.security}>
            <IconSymbol name="lock.fill" size={14} color={Colors.mutedForeground} />
            <Text style={styles.securityText}>Seus dados são protegidos por criptografia</Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            label="Próximo: Endereço"
            rightIcon={<ChevronRight />}
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            onPress={handleNext}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  header: {
    paddingHorizontal: Spacing[6],
    gap: Spacing[3],
  },
  stepLabel: {
    fontFamily: Font.bold,
    fontSize: FontSize.label,
    color: Accent.primary,
    letterSpacing: 1,
  },
  scroll: {
    paddingHorizontal: Spacing[6],
    paddingTop: Spacing[4],
    paddingBottom: Spacing[8],
    gap: Spacing[4],
  },
  title: {
    fontFamily: Font.black,
    fontSize: FontSize.heading,
    color: Colors.foreground,
  },
  description: {
    fontFamily: Font.regular,
    fontSize: FontSize.body,
    color: Colors.mutedForeground,
    lineHeight: 24,
  },
  form: {
    gap: Spacing[4],
    marginTop: Spacing[2],
  },
  security: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    marginTop: Spacing[2],
  },
  securityText: {
    fontFamily: Font.regular,
    fontSize: FontSize.bodySmall,
    color: Colors.mutedForeground,
  },
  footer: {
    paddingHorizontal: Spacing[6],
    paddingBottom: Spacing[8],
    paddingTop: Spacing[3],
  },
});
