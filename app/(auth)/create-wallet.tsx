import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Colors, Gradients, Spacing, Radius, Font, FontSize, Accent } from '@/constants/theme';
import { useSmartAccount } from '@/hooks/use-smart-account';

export default function CreateWalletScreen() {
  const [name, setName] = useState('');
  const { isConnecting, error, createWallet } = useSmartAccount();

  async function handleCreate() {
    if (!name.trim()) return;
    try {
      await createWallet(name.trim());
      // Navigation handled by _layout.tsx useEffect watching isAuthenticated
    } catch {
      // error is already set in the hook
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Criar carteira</Text>
        <Text style={styles.subtitle}>
          Sua carteira será protegida com biometria.{'\n'}
          Nenhuma senha ou chave privada necessária.
        </Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Seu nome</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: João"
          placeholderTextColor={Colors.mutedForeground}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          autoCorrect={false}
          editable={!isConnecting}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity onPress={handleCreate} disabled={isConnecting || !name.trim()}>
          <LinearGradient
            colors={Gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.btn, (isConnecting || !name.trim()) && styles.btnDisabled]}
          >
            {isConnecting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Criar com Face ID / Touch ID</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkBtn}
          onPress={() => router.push('/(auth)/connect-wallet')}
          disabled={isConnecting}
        >
          <Text style={styles.linkText}>Já tenho uma carteira</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing[8],
    justifyContent: 'space-between',
    paddingTop: 80,
    paddingBottom: 60,
  },
  header: { gap: Spacing[4] },
  title: {
    fontSize: FontSize.heading,
    fontWeight: '800',
    color: Colors.foreground,
    fontFamily: Font.extraBold,
  },
  subtitle: {
    fontSize: FontSize.body,
    color: Colors.mutedForeground,
    lineHeight: 24,
    fontFamily: Font.regular,
  },
  form: { gap: Spacing[2] },
  label: {
    fontSize: FontSize.bodySmall,
    color: Colors.mutedForeground,
    fontFamily: Font.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
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
    fontSize: FontSize.bodySmall,
    color: Accent.destructive,
    fontFamily: Font.regular,
    marginTop: Spacing[1],
  },
  footer: { gap: Spacing[4] },
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
  linkBtn: { alignItems: 'center', paddingVertical: Spacing[2] },
  linkText: {
    color: Colors.mutedForeground,
    fontSize: FontSize.bodySmall,
    fontFamily: Font.semiBold,
  },
});

