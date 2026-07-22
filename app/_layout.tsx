import { Buffer } from "buffer";
import "react-native-get-random-values";
import "react-native-url-polyfill/auto";
import { setAudioModeAsync } from "expo-audio";

import { PrivyProvider, usePrivy } from "@privy-io/expo";
import { useSignRawHash } from "@privy-io/expo/extended-chains";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import {
  Accent,
  Colors,
  Font,
  FontSize,
  Gradients,
  Radius,
  Spacing,
} from "@/constants/theme";
import { useAuthStore } from "@/lib/stores/auth.store";
import { setTokenProvider } from "@/lib/api/token";
import { setSignRawHashProvider } from "@/lib/stellar/signer";
import { authenticateWithDeviceBiometrics } from "@/lib/security/biometrics";
import { LinearGradient } from "expo-linear-gradient";
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  Nunito_900Black,
  useFonts,
} from "@expo-google-fonts/nunito";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, router, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  InteractionManager,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import "react-native-reanimated";
import { GiftClaimGate } from "@/components/ui";

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
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 min
      retry: 2,
    },
  },
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Nunito_900Black,
  });

  if (!fontsLoaded) {
    return <View style={styles.splash} />;
  }

  if (!PRIVY_APP_ID || !PRIVY_CLIENT_ID) {
    return <MissingPrivyConfigScreen />;
  }

  return (
    <View style={styles.root}>
      <PrivyProvider appId={PRIVY_APP_ID} clientId={PRIVY_CLIENT_ID}>
        <QueryClientProvider client={queryClient}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="vault/[id]" />
            <Stack.Screen name="(etherfuse-onboarding)" />
            <Stack.Screen name="education" />
            <Stack.Screen name="pigs" />
          </Stack>
          <StatusBar style="light" />
          <GiftClaimGate />
        </QueryClientProvider>
        <AppGate />
      </PrivyProvider>
    </View>
  );
}

function AppGate() {
  const segments = useSegments();
  const {
    error: privyError,
    getAccessToken,
    isReady,
    logout,
    user,
  } = usePrivy();
  const { signRawHash } = useSignRawHash();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hydrated = useAuthStore((s) => s._hydrated);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [gateOpen, setGateOpen] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
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
  const inAuthFlow = segments[0] === "(auth)";

  const unlockWithBiometrics = useCallback(async () => {
    if (authenticatingRef.current) return;

    authenticatingRef.current = true;
    setBiometricChecking(true);
    setBiometricMessage("");

    try {
      const result = await authenticateWithDeviceBiometrics({
        promptMessage: "Confirme que é você",
        promptSubtitle: "Acesse sua conta PigFi",
        promptDescription: "Use a biometria configurada neste aparelho.",
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

  const handleLogout = useCallback(async () => {
    setBiometricChecking(true);
    clearAuth();
    await Promise.race([
      logout().catch(() => {}),
      new Promise((resolve) => setTimeout(resolve, 1500)),
    ]);
    setBiometricLocked(true);
    setBiometricMessage("");
    restoredSessionRequiresBiometricsRef.current = false;
    initialPromptScheduledRef.current = false;
    setBiometricChecking(false);
    router.replace("/(auth)");
  }, [clearAuth, logout]);

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

    const timer = setTimeout(() => {
      setPrivyReadyTimedOut(true);
      requestAnimationFrame(() => setSplashDone(true));
    }, PRIVY_READY_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [gateOpen, isAuthenticated, isReady, privyRetryCount]);

  useEffect(() => {
    if (!gateOpen) return;

    if (!isAuthenticated) {
      router.replace("/(auth)");
      setBiometricLocked(false);
      setBiometricMessage("");
      restoredSessionRequiresBiometricsRef.current = false;
      initialPromptScheduledRef.current = false;
      requestAnimationFrame(() => setSplashDone(true));
      return;
    }

    if (!isReady) {
      if (privyError || privyReadyTimedOut) {
        requestAnimationFrame(() => setSplashDone(true));
      }
      return;
    }

    const shouldRequireBiometrics =
      restoredSessionRequiresBiometricsRef.current;

    if (!shouldRequireBiometrics) {
      setBiometricLocked(false);
      setBiometricMessage("");
      initialPromptScheduledRef.current = false;
      router.replace("/(tabs)");
      requestAnimationFrame(() => setSplashDone(true));
    } else if (!biometricLocked) {
      router.replace("/(tabs)");
      requestAnimationFrame(() => setSplashDone(true));
    } else {
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
      !gateOpen ||
      !isReady ||
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
    isAuthenticated,
    isReady,
    splashDone,
    unlockWithBiometrics,
  ]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      const previousAppState = appStateRef.current;
      appStateRef.current = nextAppState;

      if (
        isAuthenticated &&
        !inAuthFlow &&
        !biometricLocked &&
        !authenticatingRef.current &&
        previousAppState.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        setBiometricLocked(true);
        restoredSessionRequiresBiometricsRef.current = true;
        unlockWithBiometrics();
      }
    });

    return () => subscription.remove();
  }, [biometricLocked, inAuthFlow, isAuthenticated, unlockWithBiometrics]);

  if (!splashDone) {
    return (
      <GateLoadingModal
        message={hydrated ? "Preparando acesso..." : "Restaurando sessão..."}
      />
    );
  }

  if (isAuthenticated && !isReady && (privyError || privyReadyTimedOut)) {
    const detail = getPrivyErrorDetail(privyError);
    return (
      <PrivyRecoveryModal
        errorMessage={
          privyError
            ? "Não foi possível inicializar a sessão Privy."
            : "A sessão Privy demorou para responder."
        }
        errorDetail={detail}
        onRetry={() => {
          setPrivyReadyTimedOut(false);
          setPrivyRetryCount((count) => count + 1);
          setSplashDone(false);
        }}
        onLogout={handleLogout}
        loading={biometricChecking}
      />
    );
  }

  if (
    isAuthenticated &&
    biometricLocked &&
    restoredSessionRequiresBiometricsRef.current
  ) {
    return (
      <Modal
        visible
        animationType="none"
        transparent={false}
        statusBarTranslucent
        onRequestClose={() => {}}
      >
        <View style={styles.lockOverlay}>
          <LinearGradient
            colors={Gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.lockIconWrap}
          >
            <MaterialIcons name="fingerprint" size={36} color="#fff" />
          </LinearGradient>

          <Text style={styles.lockTitle}>Confirme que é você</Text>
          <Text style={styles.lockText}>
            Use a biometria do aparelho para acessar sua conta PigFi.
          </Text>

          {biometricMessage ? (
            <Text style={styles.lockMessage}>{biometricMessage}</Text>
          ) : null}

          <Pressable
            onPress={unlockWithBiometrics}
            disabled={biometricChecking}
            style={[
              styles.lockPrimaryBtn,
              biometricChecking && styles.lockBtnDisabled,
            ]}
          >
            <Text style={styles.lockPrimaryText}>
              {biometricChecking ? "Verificando..." : "Desbloquear"}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleLogout}
            disabled={biometricChecking}
            style={styles.lockSecondaryBtn}
          >
            <Text style={styles.lockSecondaryText}>Sair da conta</Text>
          </Pressable>
        </View>
      </Modal>
    );
  }

  return null;
}

function GateLoadingModal({ message }: { message: string }) {
  return (
    <Modal
      visible
      animationType="none"
      transparent={false}
      statusBarTranslucent
    >
      <View style={styles.gateLoading}>
        <ActivityIndicator color={Accent.primary} size="large" />
        <Text style={styles.gateLoadingText}>{message}</Text>
      </View>
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

function PrivyRecoveryModal({
  errorDetail,
  errorMessage,
  loading,
  onLogout,
  onRetry,
}: {
  errorDetail: string | null;
  errorMessage: string;
  loading: boolean;
  onLogout: () => void;
  onRetry: () => void;
}) {
  return (
    <Modal
      visible
      animationType="none"
      transparent={false}
      statusBarTranslucent
    >
      <View style={styles.lockOverlay}>
        <View style={styles.recoveryIconWrap}>
          <MaterialIcons
            name="sync-problem"
            size={34}
            color={Accent.destructive}
          />
        </View>
        <Text style={styles.lockTitle}>Sessão não carregou</Text>
        <Text style={styles.lockText}>{errorMessage}</Text>
        <Text style={styles.lockMessage}>
          Seus dados financeiros continuam bloqueados. Tente novamente ou saia
          da conta.
        </Text>
        {errorDetail ? (
          <Text style={styles.diagnosticText}>{errorDetail}</Text>
        ) : null}

        <Pressable
          onPress={onRetry}
          disabled={loading}
          style={[styles.lockPrimaryBtn, loading && styles.lockBtnDisabled]}
        >
          <Text style={styles.lockPrimaryText}>Tentar novamente</Text>
        </Pressable>

        <Pressable
          onPress={onLogout}
          disabled={loading}
          style={styles.lockSecondaryBtn}
        >
          <Text style={styles.lockSecondaryText}>
            {loading ? "Saindo..." : "Sair da conta"}
          </Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  splash: { flex: 1, backgroundColor: Colors.background },
  gateLoading: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  gateLoadingText: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
  },
  lockOverlay: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing[6],
    gap: 14,
  },
  lockIconWrap: {
    width: 76,
    height: 76,
    borderRadius: Radius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  recoveryIconWrap: {
    width: 76,
    height: 76,
    borderRadius: Radius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.28)",
  },
  lockTitle: {
    fontSize: FontSize.heading,
    fontFamily: Font.black,
    color: Colors.foreground,
    textAlign: "center",
  },
  lockText: {
    fontSize: FontSize.body,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
    lineHeight: 22,
    textAlign: "center",
    maxWidth: 300,
  },
  lockMessage: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.semiBold,
    color: Accent.destructive,
    textAlign: "center",
    maxWidth: 300,
  },
  lockPrimaryBtn: {
    width: "100%",
    maxWidth: 320,
    borderRadius: Radius.sm,
    backgroundColor: Accent.primary,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 8,
  },
  lockBtnDisabled: {
    opacity: 0.6,
  },
  lockPrimaryText: {
    fontSize: FontSize.body,
    fontFamily: Font.black,
    color: "#fff",
  },
  lockSecondaryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  lockSecondaryText: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.bold,
    color: Colors.mutedForeground,
  },
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
  diagnosticText: {
    fontSize: FontSize.label,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
    lineHeight: 17,
    textAlign: "center",
    maxWidth: 340,
  },
});
