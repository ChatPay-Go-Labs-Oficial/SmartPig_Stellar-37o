import { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { usePrivy } from '@privy-io/expo';
import { Colors, Accent, Font, FontSize, Gradients, Radius, Spacing } from '@/constants/theme';
import { OnboardingStepHeader, OnboardingProgress, PressableScale } from '@/components/ui';
import { useBlindPayStore } from '@/lib/stores/blindpay.store';
import { safeReplace } from '@/lib/navigation/safe-replace';

function findPrivyEmail(user: unknown): string {
  const accounts = (user as { linked_accounts?: unknown[] } | null)?.linked_accounts ?? [];
  for (const account of accounts as { type?: string; address?: string }[]) {
    if (account?.type === 'email' && typeof account.address === 'string') {
      return account.address;
    }
  }
  return '';
}

export default function KycFormScreen() {
  const insets = useSafeAreaInsets();
  const { user } = usePrivy();
  const setKycDraft = useBlindPayStore((s) => s.setKycDraft);
  const draft = useBlindPayStore((s) => s.kycDraft);
  const setCurrentStep = useBlindPayStore((s) => s.setCurrentStep);

  const prefilledEmail = useMemo(() => findPrivyEmail(user), [user]);

  const [firstName, setFirstName] = useState(draft.firstName ?? '');
  const [lastName, setLastName] = useState(draft.lastName ?? '');
  const [email, setEmail] = useState(draft.email ?? '');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!email && prefilledEmail) setEmail(prefilledEmail);
  }, [prefilledEmail]);

  function handleContinue() {
    if (!firstName.trim() || !lastName.trim()) {
      setError('Nome e sobrenome são obrigatórios');
      return;
    }
    if (!email.trim()) {
      setError('E-mail é obrigatório');
      return;
    }
    setError('');
    setKycDraft({ firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim() });
    setCurrentStep('kyc-document');
    safeReplace('/(blindpay-onboarding)/kyc-document');
  }

  function handleBack() {
    setCurrentStep('tos');
    safeReplace('/(blindpay-onboarding)/tos');
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <OnboardingStepHeader onBack={handleBack} />
        <OnboardingProgress step={2} total={10} />
        <Text style={styles.title}>Como podemos te chamar?</Text>
        <Text style={styles.subtitle}>Seus dados básicos, pra começar</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Nome *</Text>
          <TextInput
            style={styles.input}
            placeholder="Nome"
            placeholderTextColor={Colors.mutedForeground}
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
          />

          <Text style={styles.label}>Sobrenome *</Text>
          <TextInput
            style={styles.input}
            placeholder="Sobrenome"
            placeholderTextColor={Colors.mutedForeground}
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
          />

          <Text style={styles.label}>E-mail *</Text>
          <TextInput
            style={styles.input}
            placeholder="email@exemplo.com"
            placeholderTextColor={Colors.mutedForeground}
            value={email}
            onChangeText={setEmail}
            inputMode="email"
            autoCapitalize="none"
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Spacing[8] + insets.bottom }]}>
        <PressableScale onPress={handleContinue}>
          <LinearGradient colors={Gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.btn}>
            <Text style={styles.btnText}>Continuar</Text>
          </LinearGradient>
        </PressableScale>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  container: {
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing[6],
    paddingTop: 60,
    paddingBottom: Spacing[4],
  },
  title: {
    fontSize: FontSize.heading,
    fontFamily: Font.black,
    color: Colors.foreground,
    marginBottom: Spacing[1],
  },
  subtitle: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
    marginBottom: Spacing[6],
  },
  form: {
    gap: Spacing[3],
  },
  label: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.bold,
    color: Colors.mutedForeground,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing[4],
    paddingVertical: 14,
    color: Colors.foreground,
    fontSize: FontSize.body,
    fontFamily: Font.regular,
  },
  errorText: {
    color: Accent.destructive,
    fontSize: FontSize.bodySmall,
    fontFamily: Font.regular,
  },
  footer: {
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing[6],
    paddingTop: Spacing[4],
    paddingBottom: Spacing[8],
  },
  btn: {
    paddingVertical: 14,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  btnText: {
    color: '#fff',
    fontSize: FontSize.body,
    fontWeight: '700',
    fontFamily: Font.bold,
  },
});
