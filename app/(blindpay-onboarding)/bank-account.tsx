import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Accent, Font, FontSize, Gradients, Radius, Spacing } from '@/constants/theme';
import { OnboardingStepHeader, OnboardingProgress, PressableScale } from '@/components/ui';
import { useAuthStore } from '@/lib/stores/auth.store';
import { usePixStore } from '@/lib/stores/pix.store';
import { useCreateBankAccount } from '@/lib/queries/blindpay.queries';
import { useBlindPayStore } from '@/lib/stores/blindpay.store';
import { safeReplace } from '@/lib/navigation/safe-replace';

export default function BankAccountScreen() {
  const insets = useSafeAreaInsets();
  const contractId = useAuthStore((s) => s.contractId);
  const savedPixKey = usePixStore((s) => s.pixKey);
  const setPixKey = usePixStore((s) => s.setPixKey);
  const setBankAccount = useBlindPayStore((s) => s.setBankAccount);
  const setCurrentStep = useBlindPayStore((s) => s.setCurrentStep);
  const createBankAccount = useCreateBankAccount();

  const [name, setName] = useState('Minha conta Pix');
  const [pixKey, setPixKeyInput] = useState(savedPixKey ?? '');
  const [error, setError] = useState('');

  async function handleContinue() {
    if (!pixKey.trim()) {
      setError('Informe sua chave Pix');
      return;
    }
    if (!contractId) {
      setError('Sessão expirada. Saia e entre novamente.');
      return;
    }
    setError('');
    try {
      await createBankAccount.mutateAsync({
        userId: contractId,
        name: name.trim() || 'Minha conta Pix',
        pixKey: pixKey.trim(),
      });
      setPixKey(pixKey.trim());
      setBankAccount(true);
      setCurrentStep('wallet');
      safeReplace('/(blindpay-onboarding)/wallet');
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Não foi possível salvar sua chave Pix');
    }
  }

  function handleBack() {
    setCurrentStep('kyc-doc-back');
    safeReplace('/(blindpay-onboarding)/kyc-doc-back');
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
        <OnboardingProgress step={9} total={10} />
        <Text style={styles.title}>Sua chave Pix</Text>
        <Text style={styles.subtitle}>É para onde o dinheiro vai quando você sacar do seu porquinho</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Nome da conta</Text>
          <TextInput
            style={styles.input}
            placeholder="Minha conta Pix"
            placeholderTextColor={Colors.mutedForeground}
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.label}>Chave Pix *</Text>
          <TextInput
            style={styles.input}
            placeholder="CPF, e-mail, telefone ou chave aleatória"
            placeholderTextColor={Colors.mutedForeground}
            value={pixKey}
            onChangeText={setPixKeyInput}
            autoCapitalize="none"
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Spacing[8] + insets.bottom }]}>
        <PressableScale onPress={handleContinue} disabled={createBankAccount.isPending}>
          <LinearGradient
            colors={Gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.btn, createBankAccount.isPending && styles.btnDisabled]}
          >
            <Text style={styles.btnText}>
              {createBankAccount.isPending ? 'Salvando...' : 'Continuar'}
            </Text>
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
    lineHeight: 20,
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
  btnDisabled: { opacity: 0.5 },
  btnText: {
    color: '#fff',
    fontSize: FontSize.body,
    fontWeight: '700',
    fontFamily: Font.bold,
  },
});
