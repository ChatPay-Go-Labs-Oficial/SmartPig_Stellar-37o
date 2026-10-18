import * as Linking from 'expo-linking';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  BackHandler,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { V2Colors, V2Font } from '@/constants/theme-v2';
import { BRAND_PURPLE, Button3D, Wordmark } from '@/components/v2';
import { EntryBackdrop } from '@/components/entry/EntryBackdrop';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/stores/auth.store';
import { prefetchPortfolioSummary } from '@/lib/queries/portfolio.queries';
import { prefetchVaults } from '@/lib/queries/vaults.queries';
import { walletLogin } from '@/lib/api/auth';
import { getActivationXdr, reconcileWalletActivation, submitActivation } from '@/lib/api/wallets';
import { signXdr } from '@/lib/stellar/kit';
import { calmFrames } from '@/lib/utils/wait-for-calm';
import {
  consumeSessionRestoreBlock,
  isSessionRestoreBlocked,
} from '@/lib/security/session-restore-guard';
import { useLoginWithOAuth, usePrivy } from '@privy-io/expo';
import { useCreateWallet } from '@privy-io/expo/extended-chains';
import { useLoginWithPasskey, useSignupWithPasskey } from '@privy-io/expo/passkey';

const SHOW_PASSKEY_LOGIN = false;

const MASCOT = require('@/assets/images/v2/mascote-baby-pig.png');
/**
 * Figma 02: o logo fica 66 abaixo do topo da tela (12 sob a barra de status do
 * iPhone). No Android a barra é mais baixa e "barra + 12" colava o logo no topo.
 */
const LOGO_TOP = 66;
/** Quanto o "Entrando..." espera os dados da Home antes de seguir sem eles. */
const HOME_PREFETCH_TIMEOUT_MS = 4_000;
/**
 * No Android o login é uma camada transparente sobre as abas (app/_layout.tsx),
 * e nela a animação nativa de saída não roda: ele mesmo desliza. Entra pela
 * esquerda e, ao entrar na conta, sai para a esquerda revelando a Home, que
 * já está desenhada embaixo. No iOS a pilha anima.
 */
const SLIDES_ITSELF = Platform.OS === 'android';
const SLIDE_MS = 380;
/** Curva padrão do Material: acelera e desacelera, o movimento aparece inteiro. */
const SLIDE_EASING = Easing.bezier(0.4, 0, 0.2, 1);
const GOOGLE_LOGO = require('@/assets/images/v2/logo-google.png');
const APPLE_LOGO = require('@/assets/images/v2/logo-apple.png');
const OAUTH_REDIRECT_PATH = '/oauth/callback';
type OAuthProvider = 'google' | 'apple';
type LoginMethod = OAuthProvider | 'passkey';
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
  const { width } = useWindowDimensions();
  const slideX = useSharedValue(SLIDES_ITSELF ? -width : 0);
  const slideStyle = useAnimatedStyle(() => ({ transform: [{ translateX: slideX.value }] }));

  useEffect(() => {
    if (!SLIDES_ITSELF) return;
    slideX.value = withTiming(0, { duration: SLIDE_MS, easing: SLIDE_EASING });
  }, [slideX]);

  // Sai para a esquerda; resolve ao fim (ou no tempo-limite, se a animação
  // não avisar).
  const slideOut = useCallback(
    () =>
      new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, SLIDE_MS + 200);
        const done = () => {
          clearTimeout(timer);
          resolve();
        };
        slideX.value = withTiming(
          -width,
          { duration: SLIDE_MS, easing: SLIDE_EASING },
          () => runOnJS(done)(),
        );
      }),
    [slideX, width],
  );
  const [loading, setLoading] = useState<LoginMethod | null>(null);
  const [error, setError] = useState<string | null>(null);
  // A entrada começou (Privy conectado, falta a sessão no backend), por este
  // botão: ele fica em "Entrando..." até a tela sair, mesmo depois de a sessão
  // ser marcada — só um erro o devolve ao normal.
  const [entering, setEntering] = useState<LoginMethod | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const setAuth = useAuthStore((s) => s.setAuth);
  const setWalletAddress = useAuthStore((s) => s.setWalletAddress);
  const setWalletAccountId = useAuthStore((s) => s.setWalletAccountId);
  const setIsActivated = useAuthStore((s) => s.setIsActivated);
  const setAccountCreatedAt = useAuthStore((s) => s.setAccountCreatedAt);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const authPromiseRef = useRef<Promise<void> | null>(null);
  const reconciledUserIdRef = useRef<string | null>(null);
  const pendingOAuthTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingProviderRef = useRef<OAuthProvider>('google');
  const queryClient = useQueryClient();
  const { createWallet } = useCreateWallet();
  const { loginWithPasskey } = useLoginWithPasskey();
  const { signupWithPasskey } = useSignupWithPasskey();
  const { login: loginWithOAuth } = useLoginWithOAuth();
  const { error: privyError, isReady, user } = usePrivy();
  const canUsePrivy = PRIVY_CONFIGURED && isReady && !privyError;
  const privyErrorDetail = getErrorDetail(privyError);
  // O Privy leva alguns segundos para ficar pronto depois que o login já está
  // na tela (a carteira embarcada carrega numa WebView). Nesse meio-tempo o
  // botão aceita o toque: mostra "Conectando..." e o login segue sozinho
  // quando o Privy fica pronto, em vez de um botão desabilitado com aviso.
  const privyStarting = PRIVY_CONFIGURED && !privyError && !isReady;
  const authStatusMessage = !PRIVY_CONFIGURED
    ? 'Login indisponível: configuração Privy ausente neste build.'
    : privyError
      ? `Login indisponível: ${privyErrorDetail ?? 'não foi possível inicializar o Privy.'}`
      : null;
  const [queuedProvider, setQueuedProvider] = useState<OAuthProvider | null>(null);

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
    setAccountCreatedAt(backendUser.createdAt ?? null);

    // Ainda no "Entrando...": a Home chegava vazia, com "Cotação
    // temporariamente indisponível", até as primeiras leituras voltarem. A
    // conta é registrada antes (o cliente da API manda o userId a partir dela),
    // mas a sessão só é marcada depois — marcá-la leva às abas. Com rede lenta,
    // segue sem os dados depois do tempo-limite.
    useAuthStore.setState({ contractId: backendUser.id });
    await Promise.race([
      Promise.allSettled([
        prefetchPortfolioSummary(queryClient, backendUser.id),
        prefetchVaults(queryClient),
      ]),
      new Promise((resolve) => setTimeout(resolve, HOME_PREFETCH_TIMEOUT_MS)),
    ]);

    // Marcar a sessão leva às abas (AppGate): antes, o login sai de cena.
    if (SLIDES_ITSELF) {
      // Com os dados pré-carregados, a Home embaixo se redesenha agora. Na
      // mesma hora que o deslize, ela ocupava a thread de UI e a animação
      // não ganhava quadros: o login sumia de uma vez. Espera ela assentar.
      await calmFrames();
      await slideOut();
    }
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

    // Sem navegar daqui: com a sessão marcada (setAuth, acima), o AppGate
    // leva às abas. Navegar também daqui fechava, ao fim da ativação, a tela
    // que a pessoa já tivesse aberto.

    if (activationMsg) {
      setTimeout(() => {
        Alert.alert('Ativação pendente', activationMsg);
      }, 500);
    }
  }, [
    createWallet,
    queryClient,
    setAccountCreatedAt,
    setAuth,
    setIsActivated,
    setWalletAccountId,
    setWalletAddress,
    slideOut,
    user,
  ]);

  const completePrivyLogin = useCallback((method: LoginMethod, privyUser?: NonNullable<typeof user>) => {
    if (!authPromiseRef.current) {
      setEntering(method);
      authPromiseRef.current = createAndAuth(privyUser)
        .catch((authErr) => {
          setEntering(null);
          throw authErr;
        })
        .finally(() => {
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
      // Depois de sair ou de excluir a conta, o usuário do Privy ainda pode
      // estar em memória: restaurar aqui entraria de novo na conta que saiu
      // (ou recriaria a excluída).
      isSessionRestoreBlocked()
    ) return;

    reconciledUserIdRef.current = user.id;
    clearPendingOAuthTimer();
    const provider = pendingProviderRef.current;
    setLoading(provider);
    setError(null);
    void completePrivyLogin(provider, user)
      .catch((restoreErr) => {
        setError(`Sua conta ${OAUTH_PROVIDER_LABEL[provider]} foi conectada, mas não foi possível restaurar a sessão.`);
        console.error('[privy:restore-session]', getErrorDetail(restoreErr) ?? restoreErr);
      })
      .finally(() => setLoading(null));
  }, [clearPendingOAuthTimer, completePrivyLogin, isAuthenticated, isReady, user]);

  useEffect(() => clearPendingOAuthTimer, [clearPendingOAuthTimer]);

  async function handleOAuthLogin(provider: OAuthProvider) {
    if (privyStarting) {
      pendingProviderRef.current = provider;
      setLoading(provider);
      setError(null);
      setQueuedProvider(provider);
      return;
    }

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

      // Depois de sair ou de excluir a conta, o usuário em cache é o da conta
      // que saiu, então o login é refeito do zero.
      const restoreBlocked = consumeSessionRestoreBlock();

      loggedInUser = (restoreBlocked ? undefined : user) ?? await loginWithOAuth({
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

      // A pessoa fechou o navegador sem escolher a conta: não é erro, o login
      // só volta ao normal.
      if (/cancel/i.test(detail ?? '')) {
        setLoading(null);
        return;
      }

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
      await completePrivyLogin(provider, loggedInUser);
    } catch (backendErr) {
      setError(`Login com ${providerLabel} realizado, mas não foi possível conectar com a API.`);
      console.error(`[${provider}:createAndAuth]`, getErrorDetail(backendErr) ?? backendErr);
    } finally {
      setLoading(null);
    }
  }

  // O toque que chegou antes do Privy ficar pronto segue agora (ou volta ao
  // normal, se o Privy falhou).
  const handleOAuthLoginRef = useRef(handleOAuthLogin);
  handleOAuthLoginRef.current = handleOAuthLogin;
  useEffect(() => {
    if (!queuedProvider) return;
    if (privyError || !PRIVY_CONFIGURED) {
      setQueuedProvider(null);
      setLoading(null);
      return;
    }
    if (!canUsePrivy) return;
    setQueuedProvider(null);
    void handleOAuthLoginRef.current(queuedProvider);
  }, [canUsePrivy, privyError, queuedProvider]);

  async function handleConnectPrivy() {
    if (!canUsePrivy) {
      setError(
        authStatusMessage ??
          (privyStarting ? 'Preparando o login. Tente de novo em instantes.' : 'Login indisponível no momento.'),
      );
      return;
    }

    if (!RELYING_PARTY) {
      setError('Login com passkey indisponível nesta versão.');
      return;
    }

    setLoading('passkey');
    setError(null);
    const restoreBlocked = consumeSessionRestoreBlock();
    try {
      if (!user || restoreBlocked) {
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
      await completePrivyLogin('passkey');
    } catch (backendErr) {
      setError('Passkey autenticada, mas não foi possível conectar com a API.');
      console.error('[passkey:createAndAuth]', getErrorDetail(backendErr) ?? backendErr);
    } finally {
      setLoading(null);
    }
  }

  // As abas ficam montadas embaixo do login (ver AppGate): o voltar do
  // Android levaria a uma home sem sessão. No login, ele fecha o app.
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return;
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        BackHandler.exitApp();
        return true;
      });
      return () => subscription.remove();
    }, []),
  );

  // Figma 02b/03: o botão tocado mostra o progresso — "Conectando..." até o
  // Privy devolver o usuário, "Entrando..." enquanto a sessão é montada — e a
  // tela segue sendo o login até se dissolver na Home. O usuário do Privy que
  // sobrou de uma saída (restauração bloqueada) não conta como entrada.
  const restoring = !!user && !isAuthenticated && !isSessionRestoreBlocked();
  const activeMethod: LoginMethod | null = error
    ? loading
    : entering ?? loading ?? (restoring ? pendingProviderRef.current : null);
  const progressLabel = !error && (entering || restoring) ? 'Entrando...' : 'Conectando...';

  const busy = (!canUsePrivy && !privyStarting) || activeMethod !== null;

  return (
    <Animated.View style={[styles.screen, slideStyle]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        {/* Figma 02: herói com brilho e estrelas, logo, mascote e slogan. */}
        <View style={[styles.hero, { paddingTop: Math.max(insets.top + 12, LOGO_TOP) }]}>
          <EntryBackdrop />
          <Wordmark size={24} />
          <View style={styles.mascotArea}>
            <Image source={MASCOT} contentFit="contain" style={styles.mascot} />
          </View>
          <View style={styles.texts}>
            {/* Duas linhas, como no Figma: em tela estreita a fonte diminui
                um pouco em vez de quebrar em três. */}
            <Text style={styles.slogan} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.85}>
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
            disabled={busy && activeMethod !== 'google'}
            loading={activeMethod === 'google'}
            loadingLabel={progressLabel}
          />

          {Platform.OS === 'ios' ? (
            <Button3D
              variant="light"
              label="Continuar com Apple"
              leading={<Image source={APPLE_LOGO} style={styles.logo} />}
              onPress={() => handleOAuthLogin('apple')}
              disabled={busy && activeMethod !== 'apple'}
              loading={activeMethod === 'apple'}
              loadingLabel={progressLabel}
            />
          ) : null}

          {SHOW_PASSKEY_LOGIN ? (
            <Button3D
              variant="glass"
              icon="fingerprint"
              label="Conectar com Passkey"
              onPress={handleConnectPrivy}
              disabled={busy && activeMethod !== 'passkey'}
              loading={activeMethod === 'passkey'}
              loadingLabel={progressLabel}
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
    </Animated.View>
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
    paddingHorizontal: 20,
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
  // Figma: sombra 0 16 12 preta 45% embaixo do mascote. O `filter` só existe
  // no Android: no iOS ele desenhava a imagem dentro de um quadrado branco. Lá
  // a sombra é a nativa, que segue o recorte da imagem.
  mascot: {
    width: 204,
    height: 204,
    ...Platform.select({
      android: {
        filter: [{ dropShadow: { offsetX: 0, offsetY: 16, standardDeviation: 6, color: 'rgba(0,0,0,0.45)' } }],
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.45,
        shadowRadius: 6,
      },
    }),
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
