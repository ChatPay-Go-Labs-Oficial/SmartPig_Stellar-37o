import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, KeyboardAvoidingView, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Accent, Font, FontSize, Gradients, Radius, Spacing } from '@/constants/theme';
import { OnboardingStepHeader, OnboardingProgress, PressableScale } from '@/components/ui';
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

/** Valida CPF pelo algoritmo oficial da Receita Federal (dígitos verificadores, módulo 11). */
function isValidCpf(digits: string): boolean {
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;

  const checkDigit = (base: string, factor: number): number => {
    let sum = 0;
    for (const digit of base) sum += Number(digit) * factor--;
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  const d1 = checkDigit(digits.slice(0, 9), 10);
  const d2 = checkDigit(digits.slice(0, 9) + d1, 11);
  return digits === digits.slice(0, 9) + String(d1) + String(d2);
}

/** Valida data de nascimento: existência no calendário + maioridade (18–120 anos). */
function validateBirthDate(isoDate: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return 'Informe a data de nascimento completa';

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  // new Date() "rola" datas inexistentes (ex.: 31/02 vira 02 ou 03/03) — comparar
  // os componentes de volta é como se detecta que a data digitada não existe.
  const date = new Date(Date.UTC(year, month - 1, day));
  const isRealDate =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  if (!isRealDate) return 'Essa data não existe — confira o dia e o mês';

  const now = new Date();
  const eighteenYearsAgo = new Date(Date.UTC(now.getUTCFullYear() - 18, now.getUTCMonth(), now.getUTCDate()));
  const oldestPlausible = new Date(Date.UTC(now.getUTCFullYear() - 120, now.getUTCMonth(), now.getUTCDate()));

  if (date > eighteenYearsAgo) return 'É preciso ser maior de 18 anos para usar o Pix';
  if (date < oldestPlausible) return 'Confira a data de nascimento informada';

  return null;
}

export default function KycDocumentScreen() {
  const insets = useSafeAreaInsets();
  const setKycDraft = useBlindPayStore((s) => s.setKycDraft);
  const draft = useBlindPayStore((s) => s.kycDraft);
  const setCurrentStep = useBlindPayStore((s) => s.setCurrentStep);

  const [taxId, setTaxId] = useState(formatCpf(draft.taxId ?? ''));
  const [dateOfBirth, setDateOfBirth] = useState(isoDateToBr(draft.dateOfBirth ?? ''));
  const [idDocType, setIdDocType] = useState<BlindPayKycDraft['idDocType']>(draft.idDocType ?? 'ID_CARD');
  const [error, setError] = useState('');

  function handleContinue() {
    const taxIdDigits = taxId.replace(/\D/g, '');
    if (taxIdDigits.length !== 11) {
      setError('Informe um CPF válido (11 dígitos)');
      return;
    }
    if (!isValidCpf(taxIdDigits)) {
      setError('Esse CPF não é válido');
      return;
    }

    const isoDateOfBirth = brDateToIso(dateOfBirth);
    const birthDateError = validateBirthDate(isoDateOfBirth);
    if (birthDateError) {
      setError(birthDateError);
      return;
    }

    setError('');
    setKycDraft({
      taxId: taxIdDigits,
      dateOfBirth: isoDateOfBirth,
      idDocCountry: 'BR',
      idDocType,
    });
    setCurrentStep('kyc-address');
    safeReplace('/(blindpay-onboarding)/kyc-address');
  }

  function handleBack() {
    setCurrentStep('kyc-form');
    safeReplace('/(blindpay-onboarding)/kyc-form');
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
