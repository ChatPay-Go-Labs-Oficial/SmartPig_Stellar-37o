import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Accent, Font, FontSize, Gradients, Radius, Spacing } from '@/constants/theme';
import { OnboardingStepHeader, OnboardingProgress, PressableScale } from '@/components/ui';
import { useBlindPayStore } from '@/lib/stores/blindpay.store';
import { safeReplace } from '@/lib/navigation/safe-replace';

export default function KycAddressScreen() {
  const insets = useSafeAreaInsets();
  const setKycDraft = useBlindPayStore((s) => s.setKycDraft);
  const draft = useBlindPayStore((s) => s.kycDraft);
  const setCurrentStep = useBlindPayStore((s) => s.setCurrentStep);

  const [addressLine1, setAddressLine1] = useState(draft.addressLine1 ?? '');
  const [addressLine2, setAddressLine2] = useState(draft.addressLine2 ?? '');
  const [city, setCity] = useState(draft.city ?? '');
  const [stateProvinceRegion, setStateProvinceRegion] = useState(draft.stateProvinceRegion ?? '');
  const [postalCode, setPostalCode] = useState(draft.postalCode ?? '');
  const [error, setError] = useState('');

  function handleContinue() {
    if (!addressLine1.trim() || !city.trim() || !stateProvinceRegion.trim() || !postalCode.trim()) {
      setError('Endereço completo é obrigatório');
      return;
    }
    setError('');
    setKycDraft({
      addressLine1: addressLine1.trim(),
      addressLine2: addressLine2.trim(),
      city: city.trim(),
      stateProvinceRegion: stateProvinceRegion.trim(),
      postalCode: postalCode.trim(),
    });
    setCurrentStep('kyc-documents-intro');
    safeReplace('/(blindpay-onboarding)/kyc-documents-intro');
  }

  function handleBack() {
    setCurrentStep('kyc-document');
    safeReplace('/(blindpay-onboarding)/kyc-document');
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
        <OnboardingProgress step={4} total={10} />
        <Text style={styles.title}>Seu endereço</Text>
        <Text style={styles.subtitle}>Onde você mora atualmente</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Rua e número *</Text>
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

          <View style={styles.row}>
            <View style={styles.rowItemGrow}>
              <Text style={styles.label}>Cidade *</Text>
              <TextInput
                style={styles.input}
                placeholder="Cidade"
                placeholderTextColor={Colors.mutedForeground}
                value={city}
                onChangeText={setCity}
              />
            </View>
            <View style={styles.rowItemSmall}>
              <Text style={styles.label}>UF *</Text>
              <TextInput
                style={styles.input}
                placeholder="UF"
                placeholderTextColor={Colors.mutedForeground}
                value={stateProvinceRegion}
                onChangeText={setStateProvinceRegion}
                autoCapitalize="characters"
                maxLength={2}
              />
            </View>
          </View>

          <Text style={styles.label}>CEP *</Text>
          <TextInput
            style={styles.input}
            placeholder="00000-000"
            placeholderTextColor={Colors.mutedForeground}
            value={postalCode}
            onChangeText={setPostalCode}
            inputMode="numeric"
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
  row: {
    flexDirection: 'row',
    gap: Spacing[3],
  },
  rowItemGrow: {
    flex: 2,
    gap: Spacing[3],
  },
  rowItemSmall: {
    flex: 1,
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
