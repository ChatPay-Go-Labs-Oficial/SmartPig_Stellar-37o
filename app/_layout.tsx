import { Buffer } from "buffer";
import "react-native-get-random-values";
import "react-native-url-polyfill/auto";
import { setAudioModeAsync } from "expo-audio";

import { PrivyProvider, usePrivy, usePrivyClient } from "@privy-io/expo";
import { useSignRawHash } from "@privy-io/expo/extended-chains";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import {
  Accent,
  Colors,
  Font,
  FontSize,
  Spacing,
} from "@/constants/theme";
import { useAppLockStore } from "@/lib/stores/app-lock.store";
import { useSignOut } from "@/hooks/use-sign-out";
import { useOpeningStore } from "@/lib/stores/opening.store";
import { useAuthStore } from "@/lib/stores/auth.store";
import { useVersionGateStore } from "@/lib/stores/version-gate.store";
import { setTokenProvider } from "@/lib/api/token";
import { setSignRawHashProvider } from "@/lib/stellar/signer";
import { authenticateWithDeviceBiometrics } from "@/lib/security/biometrics";
import { isNativePickerActive } from "@/lib/security/native-picker-guard";
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  Nunito_900Black,
  useFonts,
} from "@expo-google-fonts/nunito";
// Inter (Design System V2) por subcaminho: o índice do pacote faz require dos
// 18 arquivos da família (~6 MB) e o Metro empacota todos.
import { Inter_500Medium } from "@expo-google-fonts/inter/500Medium";
import { Inter_600SemiBold } from "@expo-google-fonts/inter/600SemiBold";
import { Inter_700Bold } from "@expo-google-fonts/inter/700Bold";
import { Inter_800ExtraBold } from "@expo-google-fonts/inter/800ExtraBold";
import { Inter_900Black } from "@expo-google-fonts/inter/900Black";
import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { Stack, router, useSegments } from "expo-router";
import { DarkTheme, ThemeProvider, type Theme } from "@react-navigation/native";
import { enableFreeze } from "react-native-screens";
import { OpeningSplash } from "@/components/entry/OpeningSplash";
import { EntryBlockScreen } from "@/components/entry/EntryBlockScreen";
import { V2Colors } from "@/constants/theme-v2";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

// Desliga globalmente o congelamento de telas inativas do react-native-screens.
// O freezeOnBlur nas screenOptions do Stack cobre as rotas deste layout; esta
// chamada cobre navegadores aninhados, que não herdam aquela opção.
enableFreeze(false);
import { StatusBar } from "expo-status-bar";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import {
  AppState,
  InteractionManager,
  Modal,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as NavigationBar from "expo-navigation-bar";
import { VersionGate } from "@/components/ui";
import { GiftClaimGate } from "@/components/gifts/GiftClaimGate";

setAudioModeAsync({
  playsInSilentMode: true,
  allowsRecording: false,
  shouldPlayInBackground: false,
});

if (typeof global.Buffer === "undefined") {
  global.Buffer = Buffer;
}

const PRIVY_APP_ID = process.env.EXPO_PUBLIC_PRIVY_APP_ID;
const PRIVY_CLIENT_ID = process.env.EXPO_PUBLIC_PRIVY_CLIENT_ID;
const PRIVY_READY_TIMEOUT_MS = 8_000;
// Depois da entrada da abertura, o logo fica um instante antes de seguir.
const INTRO_HOLD_MS = 400;
// A tela do gate (cadeado, erro de sessão) acende por cima da abertura.
const GATE_FADE_MS = 300;
// Entrada do login (deslize do Stack.Screen "(auth)") e o primeiro desenho dele.
const AUTH_ENTER_MS = 500;

function getPrivyErrorDetail(error: unknown): string | null {
  if (!error) return null;

  if (typeof error === "string") return error;

  if (error && typeof error === "object") {
    const privyError = error as {
      code?: string;
      error?: string;
      message?: string;
      name?: string;
    };
    const parts = [
      privyError.code,
      privyError.error,
      privyError.message,
      privyError.name,
    ].filter(Boolean);

    return parts.length ? Array.from(new Set(parts)).join(" | ") : null;
  }

  return null;
}

export const unstable_settings = {
  anchor: "(tabs)",
};

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error: any, query) => {
      // Nenhum sistema de toast/log de erro existia antes — sem isso, falhas de
      // rede em queries somem silenciosamente (nenhum console.error, nenhum
      // erro vermelho, nada). Log aqui é só para depuração durante o teste.
      // Loga só `message` (nunca error?.response?.data inteiro): payloads de
      // rotas de KYC/ramp podem ecoar CPF, endereço, chave Pix etc. — ver
      // docs/security.md ("Do not include personal payloads in telemetry").
      console.error(
        `[query:${JSON.stringify(query.queryKey)}]`,
        error?.response?.status,
        error?.response?.data?.message ?? error?.message,
      );
    },
  }),
  mutationCache: new MutationCache({
    onError: (error: any, _vars, _ctx, mutation) => {
      // Mesmo motivo do QueryCache acima: sem isso, erros de mutation (ex.:
      // upload de arquivo, criação de receiver) somem silenciosamente.
      console.error(
        `[mutation:${mutation.options.mutationKey ? JSON.stringify(mutation.options.mutationKey) : "unknown"}]`,
        error?.response?.status,
        error?.response?.data?.message ?? error?.message,
      );
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 min
      retry: 2,
    },
  },
});

// Sem tema, o React Navigation usa o claro padrão: o fundo quase branco dele
// aparece por um instante nas transições (ex.: voltar do Histórico). O app é
// só escuro, então o tema de navegação usa o mesmo fundo das telas.
const navigationTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: Colors.background,
    card: Colors.background,
  },
};

export default function RootLayout() {
  // O resto do app (Privy, rotas, home) começa a montar junto com a entrada
  // da abertura: a montagem é quase toda JS (avaliar módulos e renderizar), e
  // a entrada roda na thread de UI; o que vai para a tela chega por volta do
  // fim dela. Antes da entrada, com o splash nativo na frente, disputava o
  // aparelho com o primeiro desenho e a entrada começava travada; depois dela,
  // atrasava o Privy, de que a sessão depende.
  const [appMounted, setAppMounted] = useState(false);
  const openingExited = useOpeningStore((s) => s.exited);
  const openingStatus = useOpeningStore((s) => s.status);
  const openingExiting = useOpeningStore((s) => s.exiting);
  const handleIntroStart = useCallback(() => setAppMounted(true), []);
  const handleIntroEnd = useCallback(() => {
    setTimeout(() => useOpeningStore.setState({ introDone: true }), INTRO_HOLD_MS);
  }, []);
  const handleOpeningExited = useCallback(() => {
    useOpeningStore.setState({ exited: true });
  }, []);

  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Nunito_900Black,
    // Fonte do Design System V2 (constants/theme-v2.ts)
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
  });

  // App é dark-only (ver Colors.background em constants/theme.ts), então os
  // ícones da barra de navegação do Android devem ser sempre claros para
  // manter contraste. Não afeta iOS (expo-navigation-bar é Android-only).
  useEffect(() => {
    if (Platform.OS !== "android") return;
    NavigationBar.setButtonStyleAsync("light").catch(() => {});
  }, []);

  if (!PRIVY_APP_ID || !PRIVY_CLIENT_ID) {
    return fontsLoaded ? <MissingPrivyConfigScreen /> : <View style={styles.splash} />;
  }

  return (
    <View style={styles.root}>
      {fontsLoaded && appMounted ? (
        <PrivyProvider appId={PRIVY_APP_ID} clientId={PRIVY_CLIENT_ID}>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider value={navigationTheme}>
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: Colors.background },
                  // O react-freeze do react-native-screens suspende a subárvore de
                  // telas inativas e a reativa depois. Essa reativação remonta views
                  // nativas já existentes, e no Fabric isso vira um Insert sem o
                  // Remove correspondente: "addViewAt: cannot insert view [...] View
                  // already has a parent". O tipo da view na mensagem varia
                  // (LinearGradientView, ReactTextView) porque a falha é da
                  // remontagem, não do componente. Ver enableFreeze(false) abaixo.
                  freezeOnBlur: false,
                }}
              >
                {/* Abre por cima das abas, que seguem montadas embaixo (ver
                    o AppGate), e desliza pela esquerda: entra ao sair da conta
                    e, ao entrar, sai para a esquerda revelando a Home. No
                    Android, camada transparente: numa tela comum as abas eram
                    desanexadas por baixo e, ao sair, a Home redesenhava do zero
                    (a tela ficava escura por um instante). Nela a animação
                    nativa de saída não roda, então o próprio login desliza
                    (app/(auth)/index.tsx). */}
                <Stack.Screen
                  name="(auth)"
                  dangerouslySingular
                  options={{
                    gestureEnabled: false,
                    ...(Platform.OS === "android"
                      ? {
                          presentation: "transparentModal",
                          animation: "none",
                          // Sem o fundo padrão das telas: é a Home embaixo que
                          // aparece quando o login desliza.
                          contentStyle: { backgroundColor: "transparent" },
                        }
                      : { presentation: "card", animation: "slide_from_left" }),
                  }}
                />
                <Stack.Screen
                  name="(tabs)"
                  options={{ gestureEnabled: false, animation: "fade" }}
                />
                {/* Detalhes do porquinho (V2). No Android, camada transparente
                    como o Histórico da Carteira: um push comum desmontava as abas
                    por baixo e a volta mostrava um quadro vazio. No iOS o modal
                    subiria de baixo e perderia o gesto de voltar: push normal. */}
                <Stack.Screen
                  name="vault/[id]"
                  options={{
                    presentation: Platform.OS === "android" ? "transparentModal" : "card",
                    animation: "slide_from_right",
                  }}
                />
                {/* Aceite de riscos do porquinho: mesma apresentação de Detalhes. */}
                <Stack.Screen
                  name="vault/[id]/risks"
                  options={{
                    presentation: Platform.OS === "android" ? "transparentModal" : "card",
                    animation: "slide_from_right",
                  }}
                />
                {/* Lição da Trilha (35a a 35p): sheet por cima das abas, que
                    seguem montadas embaixo e aparecem escurecidas. Sem gesto
                    de fechar: sair no meio pede confirmação (35i). */}
                <Stack.Screen
                  name="learning/[moduleKey]"
                  options={{
                    presentation: "transparentModal",
                    animation: "slide_from_bottom",
                    gestureEnabled: false,
                    contentStyle: { backgroundColor: "transparent" },
                  }}
                />
                <Stack.Screen name="(etherfuse-onboarding)" />
                <Stack.Screen name="(blindpay-onboarding)" />
                <Stack.Screen name="education" />
                {/* Evolução do porquinho: uma cópia só na pilha. Toques repetidos
                    no mascote da Home empilhavam várias, e o "voltar" precisava de
                    um toque por cópia. Com singular, o push vai para a que já existe. */}
                <Stack.Screen name="pigs" dangerouslySingular />
                {/* Volta do OAuth: só devolve ao login que já está embaixo
                    (ver app/oauth/callback.tsx). Transparente e sem animação,
                    para não aparecer um quadro vazio entre o navegador e o login. */}
                <Stack.Screen
                  name="oauth/callback"
                  options={{ presentation: "transparentModal", animation: "none" }}
                />
              </Stack>
            </ThemeProvider>
            <StatusBar style="light" />
            <GiftClaimGate />
            <VersionGate />
          </QueryClientProvider>
          <AppGate />
        </PrivyProvider>
      ) : null}
      {/* A mesma instância do começo ao fim: trocar por outra recarregava as
          imagens e o símbolo sumia. Fica na janela do app, não num Modal: no
          Android o Modal é outra janela, que pinta depois, e o splash nativo
          saía antes dela — um quadro vazio e o porquinho "voltando". */}
      {!openingExited ? (
        <OpeningSplash
          fontsReady={fontsLoaded}
          status={openingStatus}
          exiting={openingExiting}
          onExited={handleOpeningExited}
          onIntroStart={handleIntroStart}
          onIntroEnd={handleIntroEnd}
        />
      ) : null}
    </View>
  );
}

function AppGate() {
  const segments = useSegments();
  const forceUpdateRequired = useVersionGateStore((s) => s.forceUpdateRequired);
  const {
    error: privyError,
    getAccessToken,
    isReady,
    user,
  } = usePrivy();
  const privyClient = usePrivyClient();
  const { signRawHash } = useSignRawHash();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hydrated = useAuthStore((s) => s._hydrated);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const setAppLocked = useAppLockStore((s) => s.setLocked);
  const signOut = useSignOut();
  // Saindo da conta a partir de uma tela do gate: ela segue cobrindo o app
  // até o login estar na tela. Sem isso, a sessão acabava antes da navegação
  // e a home da conta que saía aparecia por um instante.
  const [signingOutFrom, setSigningOutFrom] = useState<"recovery" | "lock" | null>(null);
  const [gateOpen, setGateOpen] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  // Abertura (Figma 01, desenhada pelo RootLayout): fica até a entrada
  // terminar e o gate decidir o que vem depois; então se dissolve no que
  // estiver embaixo (login, home) ou some sob a tela do gate.
  const introDone = useOpeningStore((s) => s.introDone);
  const splashExited = useOpeningStore((s) => s.exited);
  const setSplashExited = useCallback((exited: boolean) => {
    useOpeningStore.setState({ exited });
  }, []);
  const [privyReadyTimedOut, setPrivyReadyTimedOut] = useState(false);
  const [privyRetryCount, setPrivyRetryCount] = useState(0);
  const [biometricLocked, setBiometricLocked] = useState(false);
  const [biometricChecking, setBiometricChecking] = useState(false);
  const [biometricMessage, setBiometricMessage] = useState("");
  const authenticatingRef = useRef(false);
  const appStateRef = useRef(AppState.currentState);
  const initialPromptScheduledRef = useRef(false);
  const restoredSessionRequiresBiometricsRef = useRef(false);
  const hydrationCapturedRef = useRef(false);
  const navigatedUnderLockRef = useRef(false);
  const inAuthFlow = segments[0] === "(auth)";
  // Lido pelo efeito de sessão sem ser dependência dele: a troca de rota não
  // pode reexecutá-lo (repetiria a navegação para as abas).
  const inAuthFlowRef = useRef(inAuthFlow);
  inAuthFlowRef.current = inAuthFlow;

  const unlockWithBiometrics = useCallback(async () => {
    if (authenticatingRef.current) return;

    authenticatingRef.current = true;
    setBiometricChecking(true);
    setBiometricMessage("");

    try {
      const result = await authenticateWithDeviceBiometrics({
        promptMessage: "Confirme que é você",
        promptSubtitle: "Acesse sua conta PigFi",
        promptDescription: "Use a biometria ou o PIN deste aparelho.",
      });

      if (result.success) {
        setBiometricLocked(false);
      } else {
        setBiometricLocked(true);
        setBiometricMessage(
          result.message ??
            "Não foi possível confirmar sua identidade. Tente novamente.",
        );
      }
    } catch {
      setBiometricLocked(false);
    } finally {
      setBiometricChecking(false);
      authenticatingRef.current = false;
    }
  }, []);

  // A navegação e a limpeza do estado do gate vêm do efeito de sessão
  // encerrada, abaixo — o mesmo caminho da saída pelo Perfil.
  const handleLogout = useCallback(
    async (from: "recovery" | "lock") => {
      if (signingOutFrom) return;
      setSigningOutFrom(from);
      await signOut();
    },
    [signOut, signingOutFrom],
  );

  // O login já é a rota: a tela do gate sai depois da entrada dele, que é
  // animada — saindo antes, a home aparecia por baixo durante a animação.
  useEffect(() => {
    if (!signingOutFrom || !inAuthFlow) return;
    const timer = setTimeout(() => setSigningOutFrom(null), AUTH_ENTER_MS);
    return () => clearTimeout(timer);
  }, [inAuthFlow, signingOutFrom]);

  // Sessão encerrada (saída, exclusão, sessão do Privy que caiu): nada do que
  // foi consultado para a conta anterior pode sobrar para a próxima.
  const wasAuthenticatedRef = useRef(isAuthenticated);
  useEffect(() => {
    if (wasAuthenticatedRef.current && !isAuthenticated) queryClient.clear();
    wasAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  useEffect(() => {
    if (!hydrated) return;

    if (!hydrationCapturedRef.current) {
      hydrationCapturedRef.current = true;
      restoredSessionRequiresBiometricsRef.current = isAuthenticated;
      setBiometricLocked(isAuthenticated);
    }

    setTokenProvider(getAccessToken);
    setSignRawHashProvider(signRawHash);
    setGateOpen(true);
  }, [getAccessToken, hydrated, isAuthenticated, signRawHash]);

  useEffect(() => {
    if (!isReady || !hydrated) return;

    // `user` is restored from Privy's secure storage when `isReady` becomes true.
    // Avoid treating a transient token refresh failure as an explicit logout.
    if (isAuthenticated && !user) {
      clearAuth();
    }
  }, [clearAuth, hydrated, isAuthenticated, isReady, user]);

  useEffect(() => {
    if (!gateOpen || !isAuthenticated || isReady) {
      setPrivyReadyTimedOut(false);
      return;
    }

    // Conta só o tempo em primeiro plano. No iOS o setTimeout mira um horário
    // de relógio: suspenso no meio da inicialização, o app volta com o timer
    // vencido e mostraria o erro de sessão na hora, sem o Privy ter tido tempo
    // de responder. "inactive" (Face ID, central de controle) não interrompe.
    let timer: ReturnType<typeof setTimeout> | null = null;

    const startTimer = () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        setPrivyReadyTimedOut(true);
        requestAnimationFrame(() => setSplashDone(true));
      }, PRIVY_READY_TIMEOUT_MS);
    };

    const stopTimer = () => {
      if (!timer) return;
      clearTimeout(timer);
      timer = null;
    };

    if (AppState.currentState !== "background") startTimer();

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "background") stopTimer();
      else startTimer();
    });

    return () => {
      stopTimer();
      subscription.remove();
    };
  }, [gateOpen, isAuthenticated, isReady, privyRetryCount]);

  useEffect(() => {
    if (!gateOpen) return;

    if (!isAuthenticated) {
      // Por cima das abas (push, não replace): elas seguem montadas, e ao
      // entrar o login sai revelando a Home já desenhada. Trocando as abas
      // pelo login, a Home montava do zero na entrada e a tela ficava preta
      // por alguns quadros. Uma vez só: com o login já na tela, navegar de
      // novo o remontava.
      if (!inAuthFlowRef.current) router.push("/(auth)");
      setBiometricLocked(false);
      setBiometricMessage("");
      restoredSessionRequiresBiometricsRef.current = false;
      initialPromptScheduledRef.current = false;
      navigatedUnderLockRef.current = false;
      requestAnimationFrame(() => setSplashDone(true));
      return;
    }

    const shouldRequireBiometrics =
      restoredSessionRequiresBiometricsRef.current;

    // Sessão salva com cadeado: o cadeado (e a biometria) não dependem do
    // Privy, que carrega por trás dele — a carteira embarcada leva de 5 a 7 s
    // num aparelho modesto, e a biometria esperava por ela. O restante (sessão
    // sem cadeado, depois de desbloquear) segue esperando o Privy.
    if (!isReady && !(shouldRequireBiometrics && biometricLocked)) {
      if (privyError || privyReadyTimedOut) {
        requestAnimationFrame(() => setSplashDone(true));
      }
      return;
    }

    if (!shouldRequireBiometrics) {
      setBiometricLocked(false);
      setBiometricMessage("");
      initialPromptScheduledRef.current = false;
      // dismissTo, não replace: as abas já estão no fundo da pilha, embaixo
      // do (auth). O replace trocava o (auth) por uma segunda cópia das abas
      // (duas Homes vivas: tudo em dobro, inclusive a animação de nível). O
      // dismissTo volta até a cópia que já existe.
      router.dismissTo("/(tabs)");
      requestAnimationFrame(() => setSplashDone(true));
    } else if (!biometricLocked) {
      // Já navegou por baixo do cadeado: navegar de novo remontaria as abas.
      if (!navigatedUnderLockRef.current) router.dismissTo("/(tabs)");
      navigatedUnderLockRef.current = false;
      requestAnimationFrame(() => setSplashDone(true));
    } else {
      // Navega para as abas por baixo do cadeado. Ao desbloquear, o Modal sai
      // revelando a home — não a rota que estava embaixo, como a de login na
      // abertura do app, que piscava enquanto as abas entravam em fade.
      if (!navigatedUnderLockRef.current) {
        navigatedUnderLockRef.current = true;
        router.dismissTo("/(tabs)");
      }
      requestAnimationFrame(() => setSplashDone(true));
    }
  }, [
    biometricLocked,
    gateOpen,
    isAuthenticated,
    isReady,
    privyError,
    privyReadyTimedOut,
  ]);

  useEffect(() => {
    if (
      !splashDone ||
      !introDone ||
      !gateOpen ||
      !isAuthenticated ||
      !biometricLocked ||
      !restoredSessionRequiresBiometricsRef.current
    )
      return;
    if (initialPromptScheduledRef.current) return;

    initialPromptScheduledRef.current = true;
    const interaction = InteractionManager.runAfterInteractions(() => {
      setTimeout(() => {
        if (appStateRef.current === "active") {
          unlockWithBiometrics();
        }
      }, 350);
    });

    return () => interaction.cancel();
  }, [
    biometricLocked,
    gateOpen,
    introDone,
    isAuthenticated,
    splashDone,
    unlockWithBiometrics,
  ]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      const previousAppState = appStateRef.current;
      appStateRef.current = nextAppState;

      const pickerActive = isNativePickerActive();

      // No iOS, o próprio prompt nativo de Face ID leva o app por um estado
      // "inactive" transitório (tanto ao abrir quanto ao fechar o sheet), sem
      // nunca passar por "background". Tratar "inactive" como backgrounding
      // aqui recriava o cadeado assim que o Face ID fechava com sucesso,
      // gerando um loop infinito de prompts. Só um "background" real (app
      // minimizado/trocado) deve reexigir biometria.
      if (
        isAuthenticated &&
        !inAuthFlow &&
        !biometricLocked &&
        !authenticatingRef.current &&
        !pickerActive &&
        previousAppState === "background" &&
        nextAppState === "active"
      ) {
        setBiometricLocked(true);
        restoredSessionRequiresBiometricsRef.current = true;
        unlockWithBiometrics();
      }
    });

    return () => subscription.remove();
  }, [biometricLocked, inAuthFlow, isAuthenticated, unlockWithBiometrics]);

  const showPrivyRecovery =
    (isAuthenticated && !isReady && Boolean(privyError || privyReadyTimedOut)) ||
    signingOutFrom === "recovery";
  const showBiometricLock =
    (isAuthenticated &&
      biometricLocked &&
      restoredSessionRequiresBiometricsRef.current) ||
    signingOutFrom === "lock";
  const splashVisible = !splashDone || !introDone;
  const gateCovering = splashVisible || !splashExited || showPrivyRecovery || showBiometricLock;

  const hasGateContent = !splashVisible && (showPrivyRecovery || showBiometricLock);
  const showSplash = splashVisible || !splashExited;

  // O que a abertura mostra: o status enquanto espera a sessão depois da
  // entrada; sem tela do gate, dissolve no que está embaixo (login, home).
  // Com ela, a tela do gate acende por cima e a abertura sai depois.
  useEffect(() => {
    useOpeningStore.setState({
      status: introDone && !splashDone ? "Entrando..." : undefined,
      exiting: !splashVisible && !hasGateContent,
    });
  }, [hasGateContent, introDone, splashDone, splashVisible]);

  // "Tentar novamente" na sessão que não carregou volta para a abertura.
  useEffect(() => {
    if (splashVisible) setSplashExited(false);
  }, [setSplashExited, splashVisible]);

  // Com a atualização obrigatória o gate não desenha nada (o modal dela fica
  // por cima de tudo): a abertura sai do caminho.
  useEffect(() => {
    if (forceUpdateRequired) setSplashExited(true);
  }, [forceUpdateRequired, setSplashExited]);

  useEffect(() => {
    setAppLocked(gateCovering);
  }, [gateCovering, setAppLocked]);

  if (forceUpdateRequired) {
    // VersionGate (montado dentro do QueryClientProvider) já está exibindo o
    // modal obrigatório — evita que splash/erro Privy/lock de biometria abram
    // por cima dele.
    return null;
  }

  let gateContent: ReactNode = null;

  if (splashVisible) {
    // A abertura fica na camada de cima (abaixo), não aqui.
  } else if (showPrivyRecovery) {
    gateContent = (
      <EntryBlockScreen
        icon="refresh-cw"
        tone="error"
        title="Sessão não carregou"
        text={
          privyError
            ? "Não foi possível inicializar a sessão Privy."
            : "A sessão Privy demorou para responder."
        }
        alert="Seus dados financeiros continuam bloqueados. Tente novamente ou saia da conta."
        detail={getPrivyErrorDetail(privyError)}
        primary={{
          label: "Tentar novamente",
          onPress: () => {
            // Refaz a carga da WebView da carteira embarcada, de que o
            // `isReady` depende: cobre carga que falhou e processo da WebView
            // que morreu.
            privyClient.embeddedWallet.reload();
            setPrivyReadyTimedOut(false);
            setPrivyRetryCount((count) => count + 1);
            setSplashDone(false);
          },
        }}
        secondary={{
          label: signingOutFrom ? "Saindo..." : "Sair da conta",
          onPress: () => handleLogout("recovery"),
          disabled: signingOutFrom !== null,
        }}
      />
    );
  } else if (showBiometricLock) {
    gateContent = (
      <EntryBlockScreen
        icon="fingerprint"
        title="Confirme que é você"
        text="Use a biometria do aparelho para acessar sua conta PigFi."
        alert={biometricMessage || undefined}
        primary={{
          label: "Desbloquear",
          onPress: signingOutFrom ? () => {} : unlockWithBiometrics,
          loading: biometricChecking,
          loadingLabel: "Verificando...",
        }}
        secondary={{
          label: signingOutFrom ? "Saindo..." : "Sair da conta",
          onPress: () => handleLogout("lock"),
          disabled: biometricChecking || signingOutFrom !== null,
        }}
      />
    );
  }

  if (!gateContent) return null;

  return (
    <GateModal fadeIn={showSplash} onShown={() => setSplashExited(true)}>
      {gateContent}
    </GateModal>
  );
}

/**
 * Um único Modal para todos os estados do gate, trocando só o conteúdo. Um
 * Modal por estado fazia o iOS fechar um e apresentar o outro a cada
 * transição, e no intervalo aparecia a rota de baixo.
 *
 * `overFullScreen` mantém a árvore do app na janela por baixo do gate. No
 * padrão (`fullScreen`) o UIKit a retira da janela, e a WebView oculta do
 * Privy — de que o `isReady` depende — só cria a WKWebView ao entrar numa
 * janela (`didMoveToWindow` do react-native-webview). Montada pelo Privy com o
 * gate já aberto, ela nunca era criada e o `isReady` não chegava.
 * `accessibilityViewIsModal` impede o VoiceOver de alcançar o app por trás.
 *
 * Saindo da abertura, a tela acende por cima dela (`fadeIn`) a partir do
 * momento em que a janela do Modal aparece; sem abertura (cadeado ao voltar
 * do segundo plano), entra já visível.
 */
function GateModal({
  fadeIn,
  onShown,
  children,
}: {
  fadeIn: boolean;
  onShown: () => void;
  children: ReactNode;
}) {
  const [fadeOnShow] = useState(fadeIn);
  const opacity = useSharedValue(fadeOnShow ? 0 : 1);
  const shownRef = useRef(false);
  const onShownRef = useRef(onShown);
  onShownRef.current = onShown;

  const handleShow = useCallback(() => {
    if (shownRef.current) return;
    shownRef.current = true;
    const done = () => onShownRef.current();
    if (!fadeOnShow) {
      done();
      return;
    }
    opacity.value = withTiming(1, { duration: GATE_FADE_MS }, (finished) => {
      if (finished) runOnJS(done)();
    });
  }, [fadeOnShow, opacity]);

  // Se o onShow não vier, a tela não pode ficar invisível.
  useEffect(() => {
    const timer = setTimeout(handleShow, 600);
    return () => clearTimeout(timer);
  }, [handleShow]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Modal
      visible
      animationType="none"
      transparent
      presentationStyle="overFullScreen"
      statusBarTranslucent
      navigationBarTranslucent
      onShow={handleShow}
      onRequestClose={() => {}}
    >
      <Animated.View style={[styles.gateRoot, style]} accessibilityViewIsModal>
        {children}
      </Animated.View>
    </Modal>
  );
}

function MissingPrivyConfigScreen() {
  return (
    <View style={styles.configError}>
      <MaterialIcons
        name="error-outline"
        size={34}
        color={Accent.destructive}
      />
      <Text style={styles.configTitle}>Configuração Privy ausente</Text>
      <Text style={styles.configText}>
        Defina EXPO_PUBLIC_PRIVY_APP_ID e EXPO_PUBLIC_PRIVY_CLIENT_ID no
        ambiente do build.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Opaca de propósito: transparente, revela o fundo cinza da janela nativa em
  // qualquer frame que uma tela não pinte.
  root: { flex: 1, backgroundColor: Colors.background },
  splash: { flex: 1, backgroundColor: Colors.background },
  gateRoot: { flex: 1, backgroundColor: V2Colors.background },
  configError: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing[6],
    gap: 12,
  },
  configTitle: {
    fontSize: FontSize.subheading,
    fontFamily: Font.black,
    color: Colors.foreground,
    textAlign: "center",
  },
  configText: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
    lineHeight: 20,
    textAlign: "center",
    maxWidth: 320,
  },
});
