import { Colors, Font, FontSize, Gradients, Radius, Spacing } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { StarryBackground } from '@/components/ui';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useLoginWithEmail, usePrivy } from '@privy-io/expo';
import { useCreateWallet } from '@privy-io/expo/extended-chains';
import { useLoginWithPasskey, useSignupWithPasskey } from '@privy-io/expo/passkey';

const RELYING_PARTY = process.env.EXPO_PUBLIC_RELYING_PARTY;

if (!RELYING_PARTY) {
  throw new Error('EXPO_PUBLIC_RELYING_PARTY not defined in environment variables');
}

export default function OnboardingScreen() {
  const [loading, setLoading] = useState<'create' | 'passkey' | 'email' | null>(null);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setAuth = useAuthStore((s) => s.setAuth);
  const setWalletAddress = useAuthStore((s) => s.setWalletAddress);
  const { createWallet } = useCreateWallet();
  const { loginWithPasskey } = useLoginWithPasskey();
  const { signupWithPasskey } = useSignupWithPasskey();
  const { sendCode, loginWithCode } = useLoginWithEmail();
  const { isReady, user } = usePrivy();

  async function createAndAuth() {
    if (user) {
      const existingWallet = (user.linked_accounts as any[]).find(
        (account) =>
          account.chain_type === 'stellar' && account.address,
      );
      if (existingWallet?.address) {
        setAuth(existingWallet.address);
        setWalletAddress(existingWallet.address);
        router.replace('/(tabs)');
        return;
      }
    }
    const { wallet } = await createWallet({ chainType: 'stellar' });
    setAuth(wallet.address);
    setWalletAddress(wallet.address);
    router.replace('/(tabs)');
  }

  async function handleCreateWallet() {
    setLoading('create');
    try {
      await createAndAuth();
    } catch (err) {
      setError('Erro ao criar carteira');
      console.error(err);
    } finally {
      setLoading(null);
    }
  }

  async function handleConnectPrivy() {
    setLoading('passkey');
    setError(null);
    try {
      if (!user) {
        try {
          await loginWithPasskey({ relyingParty: RELYING_PARTY! });
        } catch {
          await signupWithPasskey({ relyingParty: RELYING_PARTY! });
        }
      }
      await createAndAuth();
    } catch (err) {
      setError('Erro ao conectar com passkey');
      console.error(err);
    } finally {
      setLoading(null);
    }
  }

  async function handleSendCode() {
    if (!email.trim()) return;
    setLoading('email');
    setError(null);
    try {
      await sendCode({ email: email.trim() });
      setCodeSent(true);
    } catch (err) {
      setError('Erro ao enviar código. Verifique o email.');
      console.error(err);
    } finally {
      setLoading(null);
    }
  }

  async function handleLoginWithCode() {
    if (!code.trim()) return;
    setLoading('email');
    setError(null);
    try {
      if (!user) {
        await loginWithCode({ code: code.trim(), email: email.trim() });
      }
      await createAndAuth();
    } catch (err: any) {
      if (err?.message?.includes?.('Already logged in')) {
        try {
          await createAndAuth();
          return;
        } catch (createErr) {
          setError('Erro ao criar carteira');
          console.error(createErr);
        }
        return;
      }
      setError('Código inválido. Tente novamente.');
      console.error(err);
    } finally {
      setLoading(null);
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
        <View style={styles.hero}>
          <Text style={styles.title}>PigFi</Text>
          <Text style={styles.subtitle}>
            Sua poupança inteligente na{'\n'}rede Stellar
          </Text>
        </View>

        <Image source={require('@/assets/images/pig1.png')} style={styles.image} />

        <View style={styles.actions}>
          <LinearGradient
            colors={Gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.btn, styles.btnPrimary, loading === 'passkey' && styles.btnDisabled]}
          >
            <Text
              style={styles.btnPrimaryText}
              onPress={handleConnectPrivy}
              disabled={!isReady || loading !== null}
            >
              {loading === 'passkey' ? 'Conectando...' : 'Conectar com Passkey'}
            </Text>
          </LinearGradient>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ou</Text>
            <View style={styles.dividerLine} />
          </View>

          {!codeSent ? (
            <View style={styles.emailForm}>
              <TextInput
                style={styles.input}
                placeholder="seu@email.com"
                placeholderTextColor={Colors.mutedForeground}
                value={email}
                onChangeText={setEmail}
                inputMode="email"
                autoCapitalize="none"
                editable={loading === null}
              />
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <View style={[styles.btnOutline, loading === 'email' && styles.btnDisabled]}>
                <Text
                  style={styles.btnOutlineText}
                  onPress={handleSendCode}
                  disabled={loading !== null || !email.trim()}
                >
                  {loading === 'email' ? 'Enviando...' : 'Entrar com email'}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.emailForm}>
              <Text style={styles.codeSentText}>Código enviado para {email}</Text>
              <TextInput
                style={styles.input}
                placeholder="Código de 6 dígitos"
                placeholderTextColor={Colors.mutedForeground}
                value={code}
                onChangeText={setCode}
                inputMode="numeric"
                maxLength={6}
                editable={loading === null}
              />
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <View style={[styles.btnOutline, loading === 'email' && styles.btnDisabled]}>
                <Text
                  style={styles.btnOutlineText}
                  onPress={handleLoginWithCode}
                  disabled={loading !== null || !code.trim()}
                >
                  {loading === 'email' ? 'Verificando...' : 'Verificar código'}
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing[8],
    justifyContent: 'space-between',
    paddingTop: 100,
    paddingBottom: 60,
  },
  hero: {
    alignItems: 'center',
    gap: Spacing[4],
    zIndex: 10,
  },
  image: {
    width: 400,
    height: 400,
    resizeMode: 'contain',
    alignSelf: 'center',
  },
  actions: {
    gap: Spacing[3],
    zIndex: 10,
  },
  title: {
    fontSize: 48,
    fontWeight: '900',
    color: Colors.foreground,
    fontFamily: Font.black,
  },
  subtitle: {
    fontSize: FontSize.body,
    color: Colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: Font.regular,
  },
  btn: {
    paddingVertical: 14,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  btnPrimary: {},
  btnOutline: {
    paddingVertical: 14,
    borderRadius: Radius.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  btnOutlineText: {
    color: Colors.foreground,
    fontSize: FontSize.body,
    fontWeight: '600',
    fontFamily: Font.semiBold,
  },
  btnDisabled: { opacity: 0.5 },
  btnPrimaryText: {
    color: '#fff',
    fontSize: FontSize.body,
    fontWeight: '700',
    fontFamily: Font.bold,
  },
  btnSecondary: {
    paddingVertical: 14,
    borderRadius: Radius.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  btnSecondaryText: {
    color: Colors.foreground,
    fontSize: FontSize.body,
    fontWeight: '600',
    fontFamily: Font.semiBold,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    color: Colors.mutedForeground,
    fontSize: FontSize.bodySmall,
    fontFamily: Font.regular,
  },
  emailForm: {
    gap: Spacing[2],
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
  codeSentText: {
    color: Colors.mutedForeground,
    fontSize: FontSize.bodySmall,
    fontFamily: Font.regular,
  },
  errorText: {
    color: '#EF4444',
    fontSize: FontSize.bodySmall,
    fontFamily: Font.regular,
  },
});
