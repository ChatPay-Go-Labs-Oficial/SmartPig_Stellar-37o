import { Colors, Font, FontSize, Spacing } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { StarryBackground } from '@/components/ui';
import { useAuthStore } from '@/lib/stores/auth.store';
import { walletLogin } from '@/lib/api/auth';
import { getActivationXdr, submitActivation } from '@/lib/api/wallets';
import { signXdr } from '@/lib/stellar/kit';
import { useLoginWithEmail, useLoginWithOAuth, usePrivy } from '@privy-io/expo';
import { useCreateWallet } from '@privy-io/expo/extended-chains';
import { useLoginWithPasskey, useSignupWithPasskey } from '@privy-io/expo/passkey';

const SHOW_PASSKEY_LOGIN = false;
const GOOGLE_OAUTH_REDIRECT_PATH = '/oauth/callback';
const RELYING_PARTY = process.env.EXPO_PUBLIC_RELYING_PARTY;
const PRIVY_APP_ID = process.env.EXPO_PUBLIC_PRIVY_APP_ID;
const PRIVY_CLIENT_ID = process.env.EXPO_PUBLIC_PRIVY_CLIENT_ID;
const PRIVY_CONFIGURED = Boolean(
  PRIVY_APP_ID &&
  PRIVY_CLIENT_ID,
);

function getErrorDetail(err: unknown) {
  if (err && typeof err === 'object') {
    const error = err as {
      code?: string;
      error?: string;
      message?: string;
      response?: { data?: { message?: string } };
    };
    return error.response?.data?.message ?? error.error ?? error.message ?? error.code;
  }

  return undefined;
}

interface StellarLinkedAccount {
  address?: string;
  chain_type?: string;
  first_verified_at?: number | null;
  verified_at?: number | null;
  wallet_index?: number | null;
}

// Privy pode manter mais de uma embedded wallet Stellar para o mesmo usuário e
// não garante a ordem de `linked_accounts` entre sessões. Sempre resolve para a
// primeira wallet criada (menor wallet_index) para o login ser determinístico.
function selectPrimaryStellarAddress(linkedAccounts: unknown[]): string | null {
  const stellarWallets = (linkedAccounts as StellarLinkedAccount[]).filter(
    (account) => account?.chain_type === 'stellar' && Boolean(account?.address),
  );

  if (stellarWallets.length === 0) return null;

  const [primary] = [...stellarWallets].sort((a, b) => {
    const indexDiff = (a.wallet_index ?? 0) - (b.wallet_index ?? 0);
    if (indexDiff !== 0) return indexDiff;
    return (a.first_verified_at ?? a.verified_at ?? 0) - (b.first_verified_at ?? b.verified_at ?? 0);
  });

  if (stellarWallets.length > 1) {
    console.warn('[auth:multiple-stellar-wallets]', {
      selected: primary.address,
      wallets: stellarWallets.map((w) => `${w.wallet_index ?? '?'}:${w.address}`),
    });
  }

  return primary.address ?? null;
}

// Se `createWallet` tem sucesso mas o login no backend falha, uma nova tentativa
// precisa reutilizar a wallet já criada para este usuário Privy — nunca criar outra.
const stellarWalletCreationByUser = new Map<string, Promise<string>>();

function createStellarWalletOnce(
  privyUserId: string,
  createWallet: (args: { chainType: 'stellar' }) => Promise<{ wallet: { address: string } }>,
): Promise<string> {
  const pending = stellarWalletCreationByUser.get(privyUserId);
  if (pending) return pending;

  const creation = createWallet({ chainType: 'stellar' }).then(({ wallet }) => wallet.address);
  creation.catch(() => stellarWalletCreationByUser.delete(privyUserId));
  stellarWalletCreationByUser.set(privyUserId, creation);
  return creation;
}

export default function OnboardingScreen() {
  const [loading, setLoading] = useState<'google' | 'passkey' | 'email' | null>(null);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const setAuth = useAuthStore((s) => s.setAuth);
  const setWalletAddress = useAuthStore((s) => s.setWalletAddress);
  const setWalletAccountId = useAuthStore((s) => s.setWalletAccountId);
  const setIsActivated = useAuthStore((s) => s.setIsActivated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const authPromiseRef = useRef<Promise<void> | null>(null);
  const reconciledUserIdRef = useRef<string | null>(null);
  const pendingOAuthTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { createWallet } = useCreateWallet();
  const { loginWithPasskey } = useLoginWithPasskey();
  const { signupWithPasskey } = useSignupWithPasskey();
  const { sendCode, loginWithCode } = useLoginWithEmail();
  const { login: loginWithOAuth } = useLoginWithOAuth();
  const { error: privyError, isReady, user, logout } = usePrivy();
  const canUsePrivy = PRIVY_CONFIGURED && isReady && !privyError;
  const privyErrorDetail = getErrorDetail(privyError);
  const authStatusMessage = !PRIVY_CONFIGURED
    ? 'Login indisponível: configuração Privy ausente neste build.'
    : privyError
      ? `Login indisponível: ${privyErrorDetail ?? 'não foi possível inicializar o Privy.'}`
      : !isReady
        ? 'Preparando login seguro...'
        : null;

  const createAndAuth = useCallback(async (privyUser?: NonNullable<typeof user>) => {
    const effectiveUser = privyUser ?? user;

    const existingAddress = effectiveUser
      ? selectPrimaryStellarAddress(effectiveUser.linked_accounts as unknown[])
      : null;

    const address = existingAddress
      ?? await createStellarWalletOnce(effectiveUser?.id ?? 'pending-user', createWallet);

    let loginResult: Awaited<ReturnType<typeof walletLogin>>;
    try {
      loginResult = await walletLogin(address);
    } catch (e: any) {
      if (!e?.response) {
        await new Promise(r => setTimeout(r, 1000));
        loginResult = await walletLogin(address);
      } else {
        throw e;
      }
    }
    const { user: backendUser, wallet, needsActivation } = loginResult;
    setWalletAddress(address);
    setWalletAccountId(wallet.id);
    setAuth(backendUser.id);

    let activationMsg: string | null = null;
    if (needsActivation) {
      try {
        const { unsignedXdr } = await getActivationXdr({
          userId: backendUser.id,
          walletAccountId: wallet.id,
          stellarAddress: address,
        });
        const signedXdr = await signXdr(unsignedXdr);
        await submitActivation({
          walletAccountId: wallet.id,
          signedXdr,
        });
        setIsActivated(true);
      } catch (activationErr: any) {
        const detail = activationErr?.response?.data?.message ?? activationErr?.message ?? 'Unknown';
        console.warn('Account activation failed:', detail);
        activationMsg = detail;
        setIsActivated(false);
      }
    } else {
      setIsActivated(true);
    }

    router.replace('/(tabs)');

    if (activationMsg) {
      setTimeout(() => {
        Alert.alert('Ativação pendente', activationMsg);
      }, 500);
    }
  }, [
    createWallet,
    setAuth,
    setIsActivated,
    setWalletAccountId,
    setWalletAddress,
    user,
  ]);

  const completePrivyLogin = useCallback((privyUser: NonNullable<typeof user>) => {
    if (!authPromiseRef.current) {
      authPromiseRef.current = createAndAuth(privyUser).finally(() => {
        authPromiseRef.current = null;
      });
    }

    return authPromiseRef.current;
  }, [createAndAuth]);

  const clearPendingOAuthTimer = useCallback(() => {
    if (pendingOAuthTimerRef.current) {
      clearTimeout(pendingOAuthTimerRef.current);
      pendingOAuthTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (
      !isReady ||
      !user ||
      isAuthenticated ||
      authPromiseRef.current ||
      reconciledUserIdRef.current === user.id
    ) return;

    reconciledUserIdRef.current = user.id;
    clearPendingOAuthTimer();
    setLoading('google');
    setError(null);
    void completePrivyLogin(user)
      .catch((restoreErr) => {
        setError('Sua conta Google foi conectada, mas não foi possível restaurar a sessão.');
        console.error('[privy:restore-session]', getErrorDetail(restoreErr) ?? restoreErr);
      })
      .finally(() => setLoading(null));
  }, [clearPendingOAuthTimer, completePrivyLogin, isAuthenticated, isReady, user]);

  useEffect(() => clearPendingOAuthTimer, [clearPendingOAuthTimer]);

  async function handleGoogleLogin() {
    if (!canUsePrivy) {
      setError(authStatusMessage ?? 'Login indisponível no momento.');
      return;
    }

    setLoading('google');
    setError(null);
    setDebugInfo(null);
    clearPendingOAuthTimer();

    let loggedInUser: NonNullable<typeof user> | undefined;
    let redirectUrl: string | undefined;

    try {
      redirectUrl = Linking.createURL(GOOGLE_OAUTH_REDIRECT_PATH);
      console.warn('[google:oauth:redirect]', {
        redirectUrl,
        clientId: process.env.EXPO_PUBLIC_PRIVY_CLIENT_ID,
      });

      loggedInUser = user ?? await loginWithOAuth({
        provider: 'google',
        redirectUri: GOOGLE_OAUTH_REDIRECT_PATH,
      });
      if (!loggedInUser) {
        // Some Android browsers resume the app before the hook returns the user.
        // The reconciliation effect above completes login when Privy updates.
        pendingOAuthTimerRef.current = setTimeout(() => {
          pendingOAuthTimerRef.current = null;
          if (!authPromiseRef.current) {
            setLoading(null);
            setError('Google conectado, mas a sessão ainda não foi restaurada. Tente novamente.');
          }
        }, 15_000);
        return;
      }
    } catch (oauthErr) {
      const detail = getErrorDetail(oauthErr);
      const isRedirectSchemeError = detail?.includes('Redirect URL scheme is not allowed');

      setError(
        isRedirectSchemeError
          ? 'Google indisponível: configure o scheme do app no Privy.'
          : 'Erro ao autenticar com Google. Tente novamente.',
      );
      if (isRedirectSchemeError) {
        setDebugInfo(
          `Redirect: ${redirectUrl ?? 'indisponível'}\nClient ID: ${
            process.env.EXPO_PUBLIC_PRIVY_CLIENT_ID ?? 'indisponível'
          }`,
        );
      }
      console.error('[google:oauth]', {
        error: detail ?? oauthErr,
        redirectUrl,
        clientId: process.env.EXPO_PUBLIC_PRIVY_CLIENT_ID,
      });
      setLoading(null);
      return;
    }

    try {
      clearPendingOAuthTimer();
      await completePrivyLogin(loggedInUser);
    } catch (backendErr) {
      setError('Login com Google realizado, mas não foi possível conectar com a API.');
      console.error('[google:createAndAuth]', getErrorDetail(backendErr) ?? backendErr);
    } finally {
      setLoading(null);
    }
  }

  async function handleConnectPrivy() {
    if (!canUsePrivy) {
      setError(authStatusMessage ?? 'Login indisponível no momento.');
      return;
    }

    if (!RELYING_PARTY) {
      setError('Login com passkey indisponível nesta versão.');
      return;
    }

    setLoading('passkey');
    setError(null);
    try {
      if (!user) {
        try {
          await loginWithPasskey({ relyingParty: RELYING_PARTY! });
        } catch (loginErr) {
          console.warn('[passkey:login]', getErrorDetail(loginErr) ?? loginErr);

          try {
            await signupWithPasskey({ relyingParty: RELYING_PARTY! });
          } catch (signupErr) {
            console.error('[passkey:signup]', getErrorDetail(signupErr) ?? signupErr);
            setError('Erro ao autenticar com passkey. Verifique a passkey e tente novamente.');
            setLoading(null);
            return;
          }
        }
      }
    } catch (passkeyErr) {
      setError('Erro ao autenticar com passkey. Verifique a passkey e tente novamente.');
      console.error('[passkey]', getErrorDetail(passkeyErr) ?? passkeyErr);
      setLoading(null);
      return;
    }

    try {
      await createAndAuth();
    } catch (backendErr) {
      setError('Passkey autenticada, mas não foi possível conectar com a API.');
      console.error('[passkey:createAndAuth]', getErrorDetail(backendErr) ?? backendErr);
    } finally {
      setLoading(null);
    }
  }

  async function handleSendCode() {
    if (!canUsePrivy) {
      setError(authStatusMessage ?? 'Login indisponível no momento.');
      return;
    }

    if (!email.trim()) return;
    setLoading('email');
    setError(null);
    try {
      if (user) {
        await logout();
        await new Promise(r => setTimeout(r, 500));
      }
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
    if (!canUsePrivy) {
      setError(authStatusMessage ?? 'Login indisponível no momento.');
      return;
    }

    if (!code.trim()) return;
    setLoading('email');
    setError(null);
    try {
      const loggedInUser = await loginWithCode({ code: code.trim(), email: email.trim() });
      try {
        await createAndAuth(loggedInUser);
      } catch (backendErr: any) {
        setError('Erro ao conectar. Tente novamente.');
        console.error('[createAndAuth]', backendErr);
      }
    } catch (privyErr: any) {
      const status = privyErr?.response?.status ?? privyErr?.status;
      if (status === 400 || privyErr?.message?.includes?.('Already logged in')) {
        await logout();
        await sendCode({ email: email.trim() });
        setCode('');
        setError('Sessão reiniciada. Solicite um novo código e tente novamente.');
        return;
      }
      setError('Código inválido. Tente novamente.');
      console.error('[loginWithCode]', privyErr);
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
        <View style={styles.content}>
          <View style={styles.hero}>
            <View style={styles.brand}>
              <Image
                source={require('@/assets/images/PigFi-porquinho.png')}
                style={styles.brandIcon}
              />
              <Text style={styles.brandText}>PigFi</Text>
            </View>
            <Text style={styles.subtitle}>
              Pequenos investimentos,{'\n'}
              <Text style={styles.subtitleAccent}>um universo de possibilidades.</Text>
            </Text>
          </View>

          <Image
            source={require('@/assets/images/pig1.png')}
            style={styles.image}
          />

          <View style={styles.actions}>
            {authStatusMessage ? (
              <Text style={styles.authStatusText}>{authStatusMessage}</Text>
            ) : null}

            <Pressable
              onPress={handleGoogleLogin}
              disabled={!canUsePrivy || loading !== null}
              style={({ pressed }) => [
                styles.googleButtonShell,
                pressed && loading === null && styles.btnPressed,
                (!canUsePrivy || loading !== null) && styles.btnDisabled,
              ]}
            >
              <LinearGradient
                colors={['rgba(130, 58, 143, 0.92)', 'rgba(53, 70, 126, 0.92)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.googleButton}
              >
                <View style={styles.googleIconBox}>
                  <FontAwesome name="google" size={18} color="#4285F4" />
                </View>
                <Text style={styles.googleButtonText} numberOfLines={1}>
                  {loading === 'google' ? 'Conectando...' : 'Continuar com Google'}
                </Text>
                <View style={styles.googleButtonTrailing}>
                  {loading === 'google' ? (
                    <ActivityIndicator size="small" color="rgba(255,255,255,0.78)" />
                  ) : (
                    <MaterialIcons
                      name="arrow-forward"
                      size={20}
                      color="rgba(255,255,255,0.62)"
                    />
                  )}
                </View>
              </LinearGradient>
            </Pressable>

            {SHOW_PASSKEY_LOGIN ? (
              <Pressable
                onPress={handleConnectPrivy}
                disabled={!canUsePrivy || loading !== null}
                style={[
                  styles.authButton,
                  styles.authButtonMuted,
                  (!canUsePrivy || loading === 'passkey') && styles.btnDisabled,
                ]}
              >
                <MaterialIcons name="fingerprint" size={22} color={Colors.foreground} />
                <Text style={styles.authButtonText}>
                  {loading === 'passkey' ? 'Conectando...' : 'Conectar com Passkey'}
                </Text>
                <MaterialIcons name="arrow-forward" size={20} color="rgba(255,255,255,0.52)" />
              </Pressable>
            ) : null}

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>ou</Text>
              <View style={styles.dividerLine} />
            </View>

            {!showEmailForm && !codeSent ? (
              <Pressable
                onPress={() => setShowEmailForm(true)}
                disabled={!canUsePrivy || loading !== null}
                style={({ pressed }) => [
                  styles.emailToggle,
                  pressed && loading === null && styles.btnPressed,
                  (!canUsePrivy || loading !== null) && styles.btnDisabled,
                ]}
              >
                <FontAwesome name="envelope-o" size={15} color="rgba(255,255,255,0.68)" />
                <Text style={styles.emailToggleText}>Entrar com e-mail</Text>
              </Pressable>
            ) : !codeSent ? (
              <View style={styles.emailForm}>
                <TextInput
                  style={styles.input}
                  placeholder="seu@email.com"
                  placeholderTextColor={Colors.mutedForeground}
                  value={email}
                  onChangeText={setEmail}
                  inputMode="email"
                  autoCapitalize="none"
                  editable={canUsePrivy && loading === null}
                />
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
                {debugInfo ? <Text style={styles.debugText}>{debugInfo}</Text> : null}
                <Pressable
                  onPress={handleSendCode}
                  disabled={!canUsePrivy || loading !== null || !email.trim()}
                  style={[styles.emailSubmit, (!canUsePrivy || loading === 'email') && styles.btnDisabled]}
                >
                  <Text style={styles.emailSubmitText}>
                    {loading === 'email' ? 'Enviando...' : 'Enviar código'}
                  </Text>
                </Pressable>
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
                  editable={canUsePrivy && loading === null}
                />
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
                {debugInfo ? <Text style={styles.debugText}>{debugInfo}</Text> : null}
                <Pressable
                  onPress={handleLoginWithCode}
                  disabled={!canUsePrivy || loading !== null || !code.trim()}
                  style={[styles.emailSubmit, (!canUsePrivy || loading === 'email') && styles.btnDisabled]}
                >
                  <Text style={styles.emailSubmitText}>
                    {loading === 'email' ? 'Verificando...' : 'Verificar código'}
                  </Text>
                </Pressable>
              </View>
            )}

            <Text style={styles.termsText}>
              Ao continuar, voce concorda com os <Text style={styles.termsLink}>Termos</Text> e a{'\n'}
              <Text style={styles.termsLink}>Politica de Privacidade</Text> da PigFi.
            </Text>
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
    paddingHorizontal: Spacing[6],
    paddingTop: 54,
    paddingBottom: 26,
  },
  content: {
    flex: 1,
    minHeight: 720,
    justifyContent: 'space-between',
  },
  hero: {
    alignItems: 'center',
    gap: Spacing[3],
    zIndex: 10,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  brandIcon: {
    width: 34,
    height: 34,
    resizeMode: 'contain',
  },
  brandText: {
    color: Colors.foreground,
    fontSize: 30,
    fontFamily: Font.black,
    fontWeight: '900',
  },
  image: {
    width: '100%',
    maxWidth: 360,
    height: 365,
    resizeMode: 'contain',
    alignSelf: 'center',
    marginTop: Spacing[2],
  },
  actions: {
    width: '100%',
    gap: Spacing[3],
    zIndex: 10,
  },
  authStatusText: {
    color: Colors.mutedForeground,
    fontSize: FontSize.bodySmall,
    fontFamily: Font.semiBold,
    lineHeight: 19,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSize.body,
    color: 'rgba(255,255,255,0.82)',
    textAlign: 'center',
    lineHeight: 23,
    fontFamily: Font.extraBold,
    fontWeight: '800',
  },
  subtitleAccent: {
    color: '#F15BD0',
  },
  googleButtonShell: {
    width: '100%',
    borderRadius: 14,
    shadowColor: '#F15BD0',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 5,
  },
  googleButton: {
    height: 58,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  googleIconBox: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButtonText: {
    flex: 1,
    paddingHorizontal: 8,
    color: Colors.foreground,
    fontSize: FontSize.body,
    fontWeight: '800',
    fontFamily: Font.extraBold,
    textAlign: 'center',
  },
  googleButtonTrailing: {
    width: 36,
    height: 36,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  authButton: {
    minHeight: 58,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
    paddingHorizontal: Spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  authButtonMuted: {
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  authButtonText: {
    flex: 1,
    color: Colors.foreground,
    fontSize: FontSize.body,
    fontWeight: '800',
    fontFamily: Font.extraBold,
  },
  btnPressed: {
    transform: [{ scale: 0.985 }],
  },
  btnDisabled: {
    opacity: 0.55,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    paddingHorizontal: Spacing[8],
    paddingTop: 2,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  dividerText: {
    color: 'rgba(255,255,255,0.38)',
    fontSize: FontSize.label,
    fontFamily: Font.bold,
    fontWeight: '700',
  },
  emailForm: {
    gap: Spacing[2],
  },
  emailToggle: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(20,16,34,0.38)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
  },
  emailToggleText: {
    color: 'rgba(255,255,255,0.76)',
    fontSize: FontSize.bodySmall,
    fontWeight: '800',
    fontFamily: Font.extraBold,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    borderRadius: 16,
    paddingHorizontal: Spacing[4],
    paddingVertical: 14,
    color: Colors.foreground,
    fontSize: FontSize.body,
    fontFamily: Font.regular,
  },
  emailSubmit: {
    minHeight: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  emailSubmitText: {
    color: Colors.foreground,
    fontSize: FontSize.bodySmall,
    fontFamily: Font.bold,
    fontWeight: '700',
  },
  codeSentText: {
    color: 'rgba(255,255,255,0.58)',
    fontSize: FontSize.bodySmall,
    fontFamily: Font.regular,
  },
  errorText: {
    color: '#EF4444',
    fontSize: FontSize.bodySmall,
    fontFamily: Font.regular,
  },
  debugText: {
    color: Colors.mutedForeground,
    fontSize: FontSize.bodySmall,
    fontFamily: Font.regular,
    lineHeight: 18,
  },
  termsText: {
    color: 'rgba(255,255,255,0.34)',
    fontSize: FontSize.label,
    lineHeight: 18,
    textAlign: 'center',
    fontFamily: Font.semiBold,
    fontWeight: '600',
    marginTop: Spacing[1],
  },
  termsLink: {
    color: 'rgba(255,255,255,0.64)',
    fontFamily: Font.bold,
    fontWeight: '800',
  },
});
