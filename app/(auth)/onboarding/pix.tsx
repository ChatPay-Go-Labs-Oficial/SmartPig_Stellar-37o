import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OnboardingHeader } from '@/components/ui/OnboardingHeader';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { TextInput } from '@/components/ui/TextInput';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useOnboardingStore } from '@/lib/stores/onboarding.store';
import { OnboardingService } from '@/lib/services/onboarding.service';
import { Colors, Font, FontSize, Spacing, Accent } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';

const ChevronRight = () => <IconSymbol name="chevron.right" size={18} color="#fff" />;

export default function PixScreen() {
  const saved = useOnboardingStore((s) => s.pixData);
  const savePixData = useOnboardingStore((s) => s.savePixData);

  const [keyName, setKeyName] = useState(saved?.keyName ?? '');
  const [pixKey, setPixKey] = useState(saved?.pixKey ?? '');
  const [keyDetected, setKeyDetected] = useState(!!saved?.pixKey);
  const [loading, setLoading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (saved?.pixKey) return;
    setDetecting(true);
    OnboardingService.detectPixKey()
      .then(({ pixKey: detected }) => {
        setPixKey(detected);
        setKeyDetected(true);
      })
      .finally(() => setDetecting(false));
  }, []);

  function validate() {
    const e: Record<string, string> = {};
    if (!keyName.trim()) e.keyName = 'Dê um nome para essa chave';
    if (!pixKey.trim()) e.pixKey = 'Chave PIX obrigatória';
    return e;
  }

  async function handleFinish() {
    const e = validate();
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }
    setLoading(true);
    try {
      const data = { keyName: keyName.trim(), pixKey: pixKey.trim() };
      await OnboardingService.submitPixKey(data);
      savePixData(data);
      router.push('/(auth)/onboarding/complete');
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
          <ProgressBar currentStep={4} />
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Vincule sua chave PIX</Text>
          <Text style={styles.description}>
            Use a mesma chave vinculada ao seu CPF para depósitos instantâneos.
          </Text>

          <View style={styles.form}>
            <TextInput
              label="Nome da Chave"
              placeholder="Ex: Banco Principal"
              value={keyName}
              onChangeText={(v) => { setKeyName(v); setErrors((e) => ({ ...e, keyName: '' })); }}
              error={errors.keyName}
            />

            <View style={styles.pixFieldWrapper}>
              <TextInput
                label="Código PIX / Chave"
                placeholder={detecting ? 'Detectando...' : '000.000.000-00'}
                value={pixKey}
                onChangeText={(v) => { setPixKey(v); setErrors((e) => ({ ...e, pixKey: '' })); }}
                error={errors.pixKey}
                keyboardType="default"
                rightElement={
                  keyDetected ? <Badge label="Chave Válida" variant="sucesso" /> : undefined
                }
              />
              {keyDetected && (
                <Text style={styles.autoDetected}>
                  Sua chave CPF foi detectada automaticamente.
                </Text>
              )}
            </View>
          </View>

          <View style={styles.notice}>
            <IconSymbol name="lock.fill" size={16} color={Colors.mutedForeground} />
            <Text style={styles.noticeText}>
              Suas informações são criptografadas de ponta a ponta e usadas apenas para processar
              suas transações no PigFi.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            label="Finalizar Configuração"
            rightIcon={<ChevronRight />}
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            onPress={handleFinish}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  headerArea: {
    paddingHorizontal: Spacing[6],
    gap: Spacing[3],
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
  pixFieldWrapper: {
    gap: 6,
  },
  autoDetected: {
    fontFamily: Font.regular,
    fontSize: FontSize.bodySmall,
    color: Accent.success,
    paddingLeft: 2,
  },
  notice: {
    flexDirection: 'row',
    gap: Spacing[3],
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: Spacing[4],
    alignItems: 'flex-start',
  },
  noticeText: {
    flex: 1,
    fontFamily: Font.regular,
    fontSize: FontSize.bodySmall,
    color: Colors.mutedForeground,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: Spacing[6],
    paddingBottom: Spacing[8],
    paddingTop: Spacing[3],
  },
});
