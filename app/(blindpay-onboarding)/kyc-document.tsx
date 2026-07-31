import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Accent, Font, FontSize, Gradients, Radius, Spacing } from '@/constants/theme';
import { OnboardingBackButton, OnboardingProgress, PressableScale } from '@/components/ui';
import { useBlindPayStore, type BlindPayKycDraft } from '@/lib/stores/blindpay.store';
import { safeReplace } from '@/lib/navigation/safe-replace';

const ID_DOC_TYPES: { value: BlindPayKycDraft['idDocType']; label: string }[] = [
  { value: 'ID_CARD', label: 'RG' },
  { value: 'DRIVERS', label: 'CNH' },
  { value: 'PASSPORT', label: 'Passaporte' },
];

/** Formata enquanto digita: 000.000.000-00 (limita a 11 dígitos). */
function formatCpf(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length > 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  if (digits.length > 6) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  if (digits.length > 3) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  return digits;
}

/** Formata enquanto digita: DD/MM/AAAA (limita a 8 dígitos). */
function formatDateBR(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length > 4) return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}

/** DD/MM/AAAA (exibido) → AAAA-MM-DD (formato salvo, que kyc-documents.tsx converte pra ISO). */
function brDateToIso(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 8) return '';
  return `${digits.slice(4, 8)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`;
}

/** AAAA-MM-DD (salvo) → DD/MM/AAAA (exibido), para preencher ao voltar nessa tela. */
function isoDateToBr(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '';
}

export default function KycDocumentScreen() {
  const setKycDraft = useBlindPayStore((s) => s.setKycDraft);
  const draft = useBlindPayStore((s) => s.kycDraft);
  const setCurrentStep = useBlindPayStore((s) => s.setCurrentStep);

  const [taxId, setTaxId] = useState(formatCpf(draft.taxId ?? ''));
  const [dateOfBirth, setDateOfBirth] = useState(isoDateToBr(draft.dateOfBirth ?? ''));
  const [idDocType, setIdDocType] = useState<BlindPayKycDraft['idDocType']>(draft.idDocType ?? 'ID_CARD');
  const [error, setError] = useState('');

  function handleContinue() {
    if (taxId.replace(/\D/g, '').length !== 11) {
      setError('Informe um CPF válido (11 dígitos)');
      return;
    }
    setError('');
    setKycDraft({
      taxId,
      dateOfBirth: brDateToIso(dateOfBirth),
      idDocCountry: 'BR',
      idDocType,
    });
    setCurrentStep('kyc-address');
    safeReplace('/(blindpay-onboarding)/kyc-address');
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.container}>
        <OnboardingBackButton />
        <OnboardingProgress step={3} total={10} />
        <Text style={styles.title}>Seu documento</Text>
        <Text style={styles.subtitle}>Precisamos confirmar sua identidade</Text>

        <View style={styles.form}>
          <Text style={styles.label}>CPF *</Text>
          <TextInput
            style={styles.input}
            placeholder="000.000.000-00"
            placeholderTextColor={Colors.mutedForeground}
            value={taxId}
            onChangeText={(text) => setTaxId(formatCpf(text))}
            inputMode="numeric"
          />

          <Text style={styles.label}>Data de nascimento</Text>
          <TextInput
            style={styles.input}
            placeholder="DD/MM/AAAA"
            placeholderTextColor={Colors.mutedForeground}
            value={dateOfBirth}
            onChangeText={(text) => setDateOfBirth(formatDateBR(text))}
            inputMode="numeric"
          />

          <Text style={styles.label}>Qual documento você vai fotografar?</Text>
          <View style={styles.chipRow}>
            {ID_DOC_TYPES.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => setIdDocType(option.value)}
                style={[styles.chip, idDocType === option.value && styles.chipActive]}
              >
                <Text style={[styles.chipText, idDocType === option.value && styles.chipTextActive]}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.hint}>
            No próximo passo você vai fotografar a frente e o verso desse documento.
          </Text>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>

        <View style={styles.footer}>
          <PressableScale onPress={handleContinue}>
            <LinearGradient colors={Gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.btn}>
              <Text style={styles.btnText}>Continuar</Text>
            </LinearGradient>
          </PressableScale>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing[6],
    paddingTop: 60,
    paddingBottom: Spacing[8],
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
  hint: {
    fontSize: FontSize.label,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
  },
  errorText: {
    color: Accent.destructive,
    fontSize: FontSize.bodySmall,
    fontFamily: Font.regular,
  },
  footer: {
    flex: 1,
    justifyContent: 'flex-end',
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
