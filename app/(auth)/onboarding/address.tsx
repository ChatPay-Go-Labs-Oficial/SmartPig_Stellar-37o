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

export default function AddressScreen() {
  const saved = useOnboardingStore((s) => s.addressData);
  const saveAddress = useOnboardingStore((s) => s.saveAddress);

  const [cep, setCep] = useState(saved?.cep ?? '');
  const [street, setStreet] = useState(saved?.street ?? '');
  const [number, setNumber] = useState(saved?.number ?? '');
  const [complement, setComplement] = useState(saved?.complement ?? '');
  const [neighborhood, setNeighborhood] = useState(saved?.neighborhood ?? '');
  const [city, setCity] = useState(saved?.city ?? '');
  const [state, setState] = useState(saved?.state ?? '');
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleCepBlur() {
    const cleaned = cep.replace(/\D/g, '');
    if (cleaned.length < 8) return;
    setCepLoading(true);
    try {
      const data = await OnboardingService.fetchAddressByCep(cleaned);
      if (data.street) setStreet(data.street);
      if (data.neighborhood) setNeighborhood(data.neighborhood);
      if (data.city) setCity(data.city);
      if (data.state) setState(data.state);
    } finally {
      setCepLoading(false);
    }
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!cep.trim()) e.cep = 'Campo obrigatório';
    if (!street.trim()) e.street = 'Campo obrigatório';
    if (!number.trim()) e.number = 'Campo obrigatório';
    if (!neighborhood.trim()) e.neighborhood = 'Campo obrigatório';
    if (!city.trim()) e.city = 'Campo obrigatório';
    if (!state.trim()) e.state = 'Campo obrigatório';
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
      const data = { cep, street, number, complement, neighborhood, city, state };
      await OnboardingService.submitAddress(data);
      saveAddress(data);
      router.push('/(auth)/onboarding/documents');
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
        <View style={styles.headerArea}>
          <OnboardingHeader />
          <ProgressBar currentStep={2} />
          <Text style={styles.stepLabel}>PASSO 2/2</Text>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Dados de Endereço</Text>
          <Text style={styles.description}>
            Informe onde você mora para continuarmos seu cadastro.
          </Text>

          <View style={styles.form}>
            <TextInput
              label="CEP"
              placeholder="00000-000"
              value={cep}
              onChangeText={(v) => { setCep(v); setErrors((e) => ({ ...e, cep: '' })); }}
              onBlur={handleCepBlur}
              error={errors.cep}
              keyboardType="numeric"
              maxLength={9}
              rightElement={cepLoading ? <Text style={styles.loadingDots}>...</Text> : undefined}
            />
            <TextInput
              label="Logradouro"
              placeholder="Rua, Avenida, etc."
              value={street}
              onChangeText={(v) => { setStreet(v); setErrors((e) => ({ ...e, street: '' })); }}
              error={errors.street}
              autoCapitalize="words"
            />
            <View style={styles.row}>
              <View style={styles.flex}>
                <TextInput
                  label="Número"
                  placeholder="123"
                  value={number}
                  onChangeText={(v) => { setNumber(v); setErrors((e) => ({ ...e, number: '' })); }}
                  error={errors.number}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.flex, styles.flex2]}>
                <TextInput
                  label="Complemento"
                  placeholder="Apto, Casa, etc."
                  value={complement}
                  onChangeText={setComplement}
                />
              </View>
            </View>
            <TextInput
              label="Bairro"
              placeholder="Seu bairro"
              value={neighborhood}
              onChangeText={(v) => { setNeighborhood(v); setErrors((e) => ({ ...e, neighborhood: '' })); }}
              error={errors.neighborhood}
              autoCapitalize="words"
            />
            <View style={styles.row}>
              <View style={[styles.flex, styles.flex2]}>
                <TextInput
                  label="Cidade"
                  placeholder="Sua cidade"
                  value={city}
                  onChangeText={(v) => { setCity(v); setErrors((e) => ({ ...e, city: '' })); }}
                  error={errors.city}
                  autoCapitalize="words"
                />
              </View>
              <View style={styles.flex}>
                <TextInput
                  label="Estado"
                  placeholder="UF"
                  value={state}
                  onChangeText={(v) => { setState(v.toUpperCase()); setErrors((e) => ({ ...e, state: '' })); }}
                  error={errors.state}
                  autoCapitalize="characters"
                  maxLength={2}
                />
              </View>
            </View>
          </View>

          <View style={styles.security}>
            <IconSymbol name="lock.fill" size={14} color={Colors.mutedForeground} />
            <Text style={styles.securityText}>Seus dados são protegidos por criptografia</Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            label="Continuar"
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
  flex2: { flex: 2 },
  headerArea: {
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
  row: {
    flexDirection: 'row',
    gap: Spacing[3],
  },
  loadingDots: {
    fontFamily: Font.bold,
    color: Colors.mutedForeground,
    fontSize: FontSize.body,
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
