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
import { useSubmitKyc } from '@/lib/queries/etherfuse.queries';
import { useEtherfuseStore } from '@/lib/stores/etherfuse.store';

export default function KycFormScreen() {
  const contractId = useAuthStore((s) => s.contractId);
  const walletAddress = useAuthStore((s) => s.walletAddress);
  const setCurrentStep = useEtherfuseStore((s) => s.setCurrentStep);
  const submitKyc = useSubmitKyc();

  const [givenName, setGivenName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [occupation, setOccupation] = useState('');
  const [cpf, setCpf] = useState('');
  const [dob, setDob] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!givenName.trim() || !familyName.trim()) {
      setError('Nome e sobrenome são obrigatórios');
      return;
    }
    if (!email.trim() || !phone.trim()) {
      setError('Email e telefone são obrigatórios');
      return;
    }
    if (!street.trim() || !city.trim() || !region.trim() || !postalCode.trim()) {
      setError('Endereço completo é obrigatório');
      return;
    }
    setError('');
    try {
      await submitKyc.mutateAsync({
        userId: contractId!,
        pubkey: walletAddress!,
        email: email.trim(),
        phoneNumber: phone.trim(),
        name: { givenName: givenName.trim(), familyName: familyName.trim() },
        address: {
          street: street.trim(),
          city: city.trim(),
          region: region.trim(),
          postalCode: postalCode.trim(),
          country: 'BR',
        },
        occupation: occupation.trim(),
        dateOfBirth: dob.trim() || undefined,
        idNumbers: cpf.trim()
          ? [{ type: 'CPF' as const, value: cpf.trim() }]
          : undefined,
      });
      setCurrentStep('kyc-documents');
      router.replace('/(etherfuse-onboarding)/kyc-documents' as any);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Erro ao enviar dados');
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        <StarryBackground />
        <View style={styles.content}>
          <OnboardingBackButton />
          <Text style={styles.title}>Verificação de Identidade</Text>
          <Text style={styles.subtitle}>
            Preencha seus dados pessoais conforme seu documento de identidade
          </Text>

          <View style={styles.form}>
            <Text style={styles.sectionTitle}>Dados Pessoais</Text>

            <Text style={styles.label}>Nome *</Text>
            <TextInput
              style={styles.input}
              placeholder="Nome"
              placeholderTextColor={Colors.mutedForeground}
              value={givenName}
              onChangeText={setGivenName}
              autoCapitalize="words"
            />

            <Text style={styles.label}>Sobrenome *</Text>
            <TextInput
              style={styles.input}
              placeholder="Sobrenome"
              placeholderTextColor={Colors.mutedForeground}
              value={familyName}
              onChangeText={setFamilyName}
              autoCapitalize="words"
            />

            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={styles.input}
              placeholder="email@exemplo.com"
              placeholderTextColor={Colors.mutedForeground}
              value={email}
              onChangeText={setEmail}
              inputMode="email"
              autoCapitalize="none"
            />

            <Text style={styles.label}>Telefone *</Text>
            <TextInput
              style={styles.input}
              placeholder="+5511999999999"
              placeholderTextColor={Colors.mutedForeground}
              value={phone}
              onChangeText={setPhone}
              inputMode="tel"
            />

            <Text style={styles.label}>Profissão</Text>
            <TextInput
              style={styles.input}
              placeholder="Sua profissão"
              placeholderTextColor={Colors.mutedForeground}
              value={occupation}
              onChangeText={setOccupation}
            />

            <Text style={styles.label}>Data de Nascimento</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.mutedForeground}
              value={dob}
              onChangeText={setDob}
            />

            <Text style={styles.sectionTitle}>Documento</Text>

            <Text style={styles.label}>CPF</Text>
            <TextInput
              style={styles.input}
              placeholder="000.000.000-00"
              placeholderTextColor={Colors.mutedForeground}
              value={cpf}
              onChangeText={setCpf}
              inputMode="numeric"
              maxLength={14}
            />

            <Text style={styles.sectionTitle}>Endereço *</Text>

            <Text style={styles.label}>Rua</Text>
            <TextInput
              style={styles.input}
              placeholder="Rua e número"
              placeholderTextColor={Colors.mutedForeground}
              value={street}
              onChangeText={setStreet}
            />

            <Text style={styles.label}>Cidade</Text>
            <TextInput
              style={styles.input}
              placeholder="Cidade"
              placeholderTextColor={Colors.mutedForeground}
              value={city}
              onChangeText={setCity}
            />

            <Text style={styles.label}>Estado/Região</Text>
            <TextInput
              style={styles.input}
              placeholder="Estado"
              placeholderTextColor={Colors.mutedForeground}
              value={region}
              onChangeText={setRegion}
            />

            <Text style={styles.label}>CEP</Text>
            <TextInput
              style={styles.input}
              placeholder="Código postal"
              placeholderTextColor={Colors.mutedForeground}
              value={postalCode}
              onChangeText={setPostalCode}
              inputMode="numeric"
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <LinearGradient
              colors={Gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.btn, submitKyc.isPending && styles.btnDisabled]}
            >
              <Text
                style={styles.btnText}
                onPress={handleSubmit}
                disabled={submitKyc.isPending}
              >
                {submitKyc.isPending ? 'Enviando...' : 'Enviar Dados'}
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
    marginBottom: Spacing[6],
  },
  form: {
    gap: Spacing[3],
  },
  sectionTitle: {
    fontSize: FontSize.body,
    fontFamily: Font.bold,
    color: Accent.accent,
    marginTop: Spacing[4],
    marginBottom: Spacing[1],
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
