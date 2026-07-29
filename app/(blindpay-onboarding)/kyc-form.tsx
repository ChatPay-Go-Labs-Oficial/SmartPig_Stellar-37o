import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { usePrivy } from '@privy-io/expo';
import { Colors, Accent, Font, FontSize, Gradients, Radius, Spacing } from '@/constants/theme';
import { StarryBackground } from '@/components/ui';
import { OnboardingBackButton } from '@/components/ui/OnboardingBackButton';
import { useBlindPayStore, type BlindPayKycDraft } from '@/lib/stores/blindpay.store';

const ID_DOC_TYPES: { value: BlindPayKycDraft['idDocType']; label: string }[] = [
  { value: 'ID_CARD', label: 'RG' },
  { value: 'DRIVERS', label: 'CNH' },
  { value: 'PASSPORT', label: 'Passaporte' },
];

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
  const { user } = usePrivy();
  const setKycDraft = useBlindPayStore((s) => s.setKycDraft);
  const draft = useBlindPayStore((s) => s.kycDraft);
  const setCurrentStep = useBlindPayStore((s) => s.setCurrentStep);

  const prefilledEmail = useMemo(() => findPrivyEmail(user), [user]);

  const [firstName, setFirstName] = useState(draft.firstName ?? '');
  const [lastName, setLastName] = useState(draft.lastName ?? '');
  const [email, setEmail] = useState(draft.email ?? '');
  const [taxId, setTaxId] = useState(draft.taxId ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(draft.dateOfBirth ?? '');
  const [addressLine1, setAddressLine1] = useState(draft.addressLine1 ?? '');
  const [addressLine2, setAddressLine2] = useState(draft.addressLine2 ?? '');
  const [city, setCity] = useState(draft.city ?? '');
  const [stateProvinceRegion, setStateProvinceRegion] = useState(draft.stateProvinceRegion ?? '');
  const [postalCode, setPostalCode] = useState(draft.postalCode ?? '');
  const [idDocType, setIdDocType] = useState<BlindPayKycDraft['idDocType']>(
    draft.idDocType ?? 'ID_CARD',
  );
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
    if (!taxId.trim()) {
      setError('CPF é obrigatório');
      return;
    }
    if (!addressLine1.trim() || !city.trim() || !stateProvinceRegion.trim() || !postalCode.trim()) {
      setError('Endereço completo é obrigatório');
      return;
    }
    setError('');

    setKycDraft({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      taxId: taxId.trim(),
      dateOfBirth: dateOfBirth.trim(),
      addressLine1: addressLine1.trim(),
      addressLine2: addressLine2.trim(),
      city: city.trim(),
      stateProvinceRegion: stateProvinceRegion.trim(),
      postalCode: postalCode.trim(),
      idDocCountry: 'BR',
      idDocType,
    });
    setCurrentStep('kyc-documents');
    router.replace('/(blindpay-onboarding)/kyc-documents' as any);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" bounces={false}>
        <StarryBackground />
        <View style={styles.content}>
          <OnboardingBackButton />
          <Text style={styles.title}>Seus dados</Text>
          <Text style={styles.subtitle}>
            Precisamos confirmar sua identidade para liberar depósitos e saques via Pix
          </Text>

          <View style={styles.form}>
            <Text style={styles.sectionTitle}>Dados pessoais</Text>

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

            <Text style={styles.label}>CPF *</Text>
            <TextInput
              style={styles.input}
              placeholder="000.000.000-00"
              placeholderTextColor={Colors.mutedForeground}
              value={taxId}
              onChangeText={setTaxId}
              inputMode="numeric"
              maxLength={14}
            />

            <Text style={styles.label}>Data de nascimento</Text>
            <TextInput
              style={styles.input}
              placeholder="AAAA-MM-DD"
              placeholderTextColor={Colors.mutedForeground}
              value={dateOfBirth}
              onChangeText={setDateOfBirth}
            />

            <Text style={styles.sectionTitle}>Documento</Text>
            <View style={styles.chipRow}>
              {ID_DOC_TYPES.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => setIdDocType(option.value)}
                  style={[styles.chip, idDocType === option.value && styles.chipActive]}
                >
                  <Text
                    style={[styles.chipText, idDocType === option.value && styles.chipTextActive]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Endereço *</Text>

            <Text style={styles.label}>Rua e número</Text>
            <TextInput
              style={styles.input}
              placeholder="Rua e número"
              placeholderTextColor={Colors.mutedForeground}
              value={addressLine1}
              onChangeText={setAddressLine1}
            />

            <Text style={styles.label}>Complemento</Text>
            <TextInput
              style={styles.input}
              placeholder="Apto, bloco (opcional)"
              placeholderTextColor={Colors.mutedForeground}
              value={addressLine2}
              onChangeText={setAddressLine2}
            />

            <Text style={styles.label}>Cidade</Text>
            <TextInput
              style={styles.input}
              placeholder="Cidade"
              placeholderTextColor={Colors.mutedForeground}
              value={city}
              onChangeText={setCity}
            />

            <Text style={styles.label}>Estado</Text>
            <TextInput
              style={styles.input}
              placeholder="UF"
              placeholderTextColor={Colors.mutedForeground}
              value={stateProvinceRegion}
              onChangeText={setStateProvinceRegion}
              autoCapitalize="characters"
              maxLength={2}
            />

            <Text style={styles.label}>CEP</Text>
            <TextInput
              style={styles.input}
              placeholder="00000-000"
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
              style={styles.btn}
            >
              <Text style={styles.btnText} onPress={handleContinue}>
                Continuar
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
  chipRow: {
    flexDirection: 'row',
    gap: Spacing[2],
  },
  chip: {
    paddingHorizontal: Spacing[4],
    paddingVertical: 10,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  chipActive: {
    backgroundColor: 'rgba(244,52,180,0.14)',
    borderColor: Accent.primary,
  },
  chipText: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.bold,
    color: Colors.mutedForeground,
  },
  chipTextActive: {
    color: Accent.primary,
  },
  btn: {
    paddingVertical: 14,
    borderRadius: Radius.sm,
    alignItems: 'center',
    marginTop: Spacing[4],
  },
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
