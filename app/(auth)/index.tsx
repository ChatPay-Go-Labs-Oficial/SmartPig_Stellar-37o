import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { V2Colors, V2Font } from '@/constants/theme-v2';
import { BRAND_PURPLE, Button3D, Wordmark } from '@/components/v2';
import { EntryBackdrop } from '@/components/entry/EntryBackdrop';
import { OpeningSplash } from '@/components/entry/OpeningSplash';
import { useAuthStore } from '@/lib/stores/auth.store';
import { walletLogin } from '@/lib/api/auth';
import { getActivationXdr, reconcileWalletActivation, submitActivation } from '@/lib/api/wallets';
import { signXdr } from '@/lib/stellar/kit';
import {
  consumeSessionRestoreBlock,
  isSessionRestoreBlocked,
} from '@/lib/security/session-restore-guard';
import { useLoginWithOAuth, usePrivy } from '@privy-io/expo';
import { useCreateWallet } from '@privy-io/expo/extended-chains';
import { useLoginWithPasskey, useSignupWithPasskey } from '@privy-io/expo/passkey';

const SHOW_PASSKEY_LOGIN = false;

const MASCOT = require('@/assets/images/v2/mascote-baby-pig.png');
const GOOGLE_LOGO = require('@/assets/images/v2/logo-google.png');
const APPLE_LOGO = require('@/assets/images/v2/logo-apple.png');
const OAUTH_REDIRECT_PATH = '/oauth/callback';
type OAuthProvider = 'google' | 'apple';
const OAUTH_PROVIDER_LABEL: Record<OAuthProvider, string> = {
  google: 'Google',
  apple: 'Apple',
};
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
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState<OAuthProvider | 'passkey' | null>(null);
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
  const pendingProviderRef = useRef<OAuthProvider>('google');
  const { createWallet } = useCreateWallet();
  const { loginWithPasskey } = useLoginWithPasskey();
  const { signupWithPasskey } = useSignupWithPasskey();
  const { login: loginWithOAuth } = useLoginWithOAuth();
  const { error: privyError, isReady, user } = usePrivy();
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
        const isNetworkLevelError = !activationErr?.response;
        let activatedOnReconciliation = false;

        if (isNetworkLevelError) {
          activatedOnReconciliation = await reconcileWalletActivation(wallet.id);
        }

        if (activatedOnReconciliation) {
          setIsActivated(true);
        } else {
          const detail = activationErr?.response?.data?.message ?? activationErr?.message ?? 'Unknown';
          console.warn('Account activation failed:', detail);
          activationMsg = detail;
          setIsActivated(false);
        }
      }
    } else {
      setIsActivated(true);
    }

    // As abas ficam no fundo da pilha (anchor): voltar até elas, sem criar
    // uma segunda cópia (ver app/_layout.tsx).
    router.dismissTo('/(tabs)');

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
      reconciledUserIdRef.current === user.id ||
      // Depois de excluir a conta, o usuário do Privy ainda vive em memória e
      // restaurar aqui recriaria a conta recém-destruída.
      isSessionRestoreBlocked()
    ) return;

    reconciledUserIdRef.current = user.id;
    clearPendingOAuthTimer();
    const provider = pendingProviderRef.current;
    setLoading(provider);
    setError(null);
    void completePrivyLogin(user)
      .catch((restoreErr) => {
        setError(`Sua conta ${OAUTH_PROVIDER_LABEL[provider]} foi conectada, mas não foi possível restaurar a sessão.`);
        console.error('[privy:restore-session]', getErrorDetail(restoreErr) ?? restoreErr);
      })
      .finally(() => setLoading(null));
  }, [clearPendingOAuthTimer, completePrivyLogin, isAuthenticated, isReady, user]);

  useEffect(() => clearPendingOAuthTimer, [clearPendingOAuthTimer]);

  async function handleOAuthLogin(provider: OAuthProvider) {
    if (!canUsePrivy) {
      setError(authStatusMessage ?? 'Login indisponível no momento.');
      return;
    }

    const providerLabel = OAUTH_PROVIDER_LABEL[provider];
    pendingProviderRef.current = provider;
    setLoading(provider);
    setError(null);
    setDebugInfo(null);
    clearPendingOAuthTimer();

    let loggedInUser: NonNullable<typeof user> | undefined;
    let redirectUrl: string | undefined;

    try {
      redirectUrl = Linking.createURL(OAUTH_REDIRECT_PATH);

      // Depois de uma exclusão o usuário em cache aponta para uma identidade
      // que não existe mais, então o login é refeito do zero.
      const afterDeletion = consumeSessionRestoreBlock();

      loggedInUser = (afterDeletion ? undefined : user) ?? await loginWithOAuth({
        provider,
        redirectUri: OAUTH_REDIRECT_PATH,
      });
      if (!loggedInUser) {
        // Some Android browsers resume the app before the hook returns the user.
        // The reconciliation effect above completes login when Privy updates.
        pendingOAuthTimerRef.current = setTimeout(() => {
          pendingOAuthTimerRef.current = null;
          if (!authPromiseRef.current) {
            setLoading(null);
            setError(`${providerLabel} conectado, mas a sessão ainda não foi restaurada. Tente novamente.`);
          }
        }, 15_000);
        return;
      }
    } catch (oauthErr) {
      const detail = getErrorDetail(oauthErr);
      const isRedirectSchemeError = detail?.includes('Redirect URL scheme is not allowed');

      setError(
        isRedirectSchemeError
          ? `${providerLabel} indisponível: configure o scheme do app no Privy.`
          : `Erro ao autenticar com ${providerLabel}. Tente novamente.`,
      );
      if (isRedirectSchemeError) {
        setDebugInfo(
          `Redirect: ${redirectUrl ?? 'indisponível'}\nClient ID: ${
            process.env.EXPO_PUBLIC_PRIVY_CLIENT_ID ?? 'indisponível'
          }`,
        );
      }
      console.error(`[${provider}:oauth]`, {
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
      setError(`Login com ${providerLabel} realizado, mas não foi possível conectar com a API.`);
      console.error(`[${provider}:createAndAuth]`, getErrorDetail(backendErr) ?? backendErr);
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

  // After OAuth/passkey returns, Privy has a user but the backend session is
  // still being reconciled (wallet + auth). Figma 03: a mesma composição da
  // abertura, com o status "Entrando...", para a passagem abertura → login →
  // entrada parecer um movimento só.
  const isRestoringSession = !!user && !isAuthenticated && !error;

  if (isRestoringSession) {
    return <OpeningSplash animateIn={false} status="Entrando..." />;
  }

  const busy = !canUsePrivy || loading !== null;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        {/* Figma 02: herói com brilho e estrelas, logo, mascote e slogan. */}
        <View style={[styles.hero, { paddingTop: insets.top + 12 }]}>
          <EntryBackdrop />
          <Wordmark size={24} />
          <View style={styles.mascotArea}>
            <Image source={MASCOT} contentFit="contain" style={styles.mascot} />
          </View>
          <View style={styles.texts}>
            <Text style={styles.slogan}>
              {'Pequenos hábitos,\num '}
              <Text style={{ color: BRAND_PURPLE }}>universo</Text>
              {' de possibilidades'}
            </Text>
            <Text style={styles.tagline}>Guarde em dólar, veja crescer.</Text>
          </View>
        </View>

        <View style={styles.actions}>
          {authStatusMessage ? (
            <Text style={styles.statusText}>{authStatusMessage}</Text>
          ) : null}

          {/* Ordem do Figma: Google primeiro, Apple depois (só no iOS). */}
          <Button3D
            variant="glass"
            label="Continuar com Google"
            leading={<Image source={GOOGLE_LOGO} style={styles.logo} />}
            onPress={() => handleOAuthLogin('google')}
            disabled={busy && loading !== 'google'}
            loading={loading === 'google'}
            loadingLabel="Conectando..."
          />

          {Platform.OS === 'ios' ? (
            <Button3D
              variant="light"
              label="Continuar com Apple"
              leading={<Image source={APPLE_LOGO} style={styles.logo} />}
              onPress={() => handleOAuthLogin('apple')}
              disabled={busy && loading !== 'apple'}
              loading={loading === 'apple'}
              loadingLabel="Conectando..."
            />
          ) : null}

          {SHOW_PASSKEY_LOGIN ? (
            <Button3D
              variant="glass"
              icon="fingerprint"
              label="Conectar com Passkey"
              onPress={handleConnectPrivy}
              disabled={busy && loading !== 'passkey'}
              loading={loading === 'passkey'}
              loadingLabel="Conectando..."
            />
          ) : null}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {debugInfo ? <Text style={styles.debugText}>{debugInfo}</Text> : null}
        </View>

        <Text style={[styles.terms, { paddingBottom: insets.bottom + 24 }]}>
          {'Ao continuar, você aceita os '}
          <Text style={styles.termsStrong}>Termos de uso</Text>
          {' e a '}
          <Text style={styles.termsStrong}>Política de privacidade</Text>
          {'.'}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: V2Colors.background,
  },
  scroll: {
    flexGrow: 1,
  },
  // Figma: o herói ocupa o espaço que sobra e termina em curva de 32.
  hero: {
    flex: 1,
    minHeight: 460,
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 30,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  mascotArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  // Figma: sombra 0 16 12 preta 45% embaixo do mascote.
  mascot: {
    width: 204,
    height: 204,
    filter: [{ dropShadow: { offsetX: 0, offsetY: 16, standardDeviation: 6, color: 'rgba(0,0,0,0.45)' } }],
  },
  texts: {
    alignItems: 'center',
    gap: 10,
  },
  slogan: {
    fontFamily: V2Font.black,
    fontSize: 22,
    lineHeight: 24.6,
    letterSpacing: -0.66,
    color: V2Colors.text,
    textAlign: 'center',
  },
  tagline: {
    fontFamily: V2Font.medium,
    fontSize: 15,
    lineHeight: 22,
    color: V2Colors.textSecondary,
    textAlign: 'center',
  },
  actions: {
    gap: 12,
    paddingTop: 24,
    paddingHorizontal: 18,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  logo: {
    width: 24,
    height: 24,
  },
  // Figma 02e: o aviso de login indisponível fica acima dos botões.
  statusText: {
    fontFamily: V2Font.medium,
    fontSize: 12,
    lineHeight: 18,
    color: V2Colors.textTertiary,
    textAlign: 'center',
  },
  // Figma 02d: o erro fica abaixo dos botões.
  errorText: {
    fontFamily: V2Font.medium,
    fontSize: 12.5,
    lineHeight: 18,
    color: V2Colors.error,
    textAlign: 'center',
  },
  debugText: {
    fontFamily: V2Font.medium,
    fontSize: 11,
    lineHeight: 16,
    color: V2Colors.textTertiary,
    textAlign: 'center',
  },
  terms: {
    paddingTop: 18,
    paddingHorizontal: 34,
    fontFamily: V2Font.medium,
    fontSize: 12,
    lineHeight: 18,
    color: V2Colors.textTertiary,
    textAlign: 'center',
  },
  termsStrong: {
    fontFamily: V2Font.semiBold,
    color: V2Colors.textSecondary,
  },
});
