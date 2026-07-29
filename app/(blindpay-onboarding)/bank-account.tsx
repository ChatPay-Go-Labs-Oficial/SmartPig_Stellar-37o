import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Colors, Accent, Font, FontSize, Gradients, Radius, Spacing } from '@/constants/theme';
import { StarryBackground } from '@/components/ui';
import { OnboardingBackButton } from '@/components/ui/OnboardingBackButton';
import { useAuthStore } from '@/lib/stores/auth.store';
import { usePixStore } from '@/lib/stores/pix.store';
import { useCreateBankAccount } from '@/lib/queries/blindpay.queries';
import { useBlindPayStore } from '@/lib/stores/blindpay.store';

export default function BankAccountScreen() {
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
      router.replace('/(blindpay-onboarding)/wallet' as any);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Não foi possível salvar sua chave Pix');
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" bounces={false}>
        <StarryBackground />
        <View style={styles.content}>
          <OnboardingBackButton />
          <Text style={styles.title}>Sua chave Pix</Text>
          <Text style={styles.subtitle}>
            É para onde o dinheiro vai quando você sacar do seu porquinho
          </Text>

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

            <LinearGradient
              colors={Gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.btn, createBankAccount.isPending && styles.btnDisabled]}
            >
              <Text style={styles.btnText} onPress={handleContinue}>
                {createBankAccount.isPending ? 'Salvando...' : 'Continuar'}
              </Text>
            </LinearGradient>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    marginBottom: Spacing[8],
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
  btn: {
    paddingVertical: 14,
    borderRadius: Radius.sm,
    alignItems: 'center',
    marginTop: Spacing[4],
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
  },
});
