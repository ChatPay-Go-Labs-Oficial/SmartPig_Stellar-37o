import { Buffer } from 'buffer';
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import { setAudioModeAsync } from 'expo-audio';

setAudioModeAsync({
  playsInSilentMode: true,
  allowsRecording: false,
  shouldPlayInBackground: false,
  shouldDuckOtherAudio: true,
});

import { PrivyProvider, usePrivy } from '@privy-io/expo';
import { useSignRawHash } from '@privy-io/expo/extended-chains';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as LocalAuthentication from 'expo-local-authentication';

import { Accent, Colors, Font, FontSize, Gradients, Radius, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/lib/stores/auth.store';
import { setTokenProvider } from '@/lib/api/token';
import { setSignRawHashProvider } from '@/lib/stellar/signer';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  Nunito_900Black,
  useFonts,
} from '@expo-google-fonts/nunito';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import 'react-native-reanimated';

if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer;
}

export const unstable_settings = {
  anchor: '(tabs)',
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

  return (
    <View style={styles.root}>
      <PrivyProvider
        appId={process.env.EXPO_PUBLIC_PRIVY_APP_ID!}
        clientId={process.env.EXPO_PUBLIC_PRIVY_CLIENT_ID!}
      >
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
        </QueryClientProvider>
        <AppGate />
      </PrivyProvider>
    </View>
  );
}

function AppGate() {
  const { getAccessToken, isReady, logout, user } = usePrivy();
  const { signRawHash } = useSignRawHash();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hydrated = useAuthStore((s) => s._hydrated);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [gateOpen, setGateOpen] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const [biometricLocked, setBiometricLocked] = useState(true);
  const [biometricChecking, setBiometricChecking] = useState(false);
  const [biometricMessage, setBiometricMessage] = useState('');
  const authenticatingRef = useRef(false);
  const appStateRef = useRef(AppState.currentState);

  const unlockWithBiometrics = useCallback(async () => {
    if (authenticatingRef.current) return;

    authenticatingRef.current = true;
    setBiometricChecking(true);
    setBiometricMessage('');

    try {
      const [hasHardware, isEnrolled] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
      ]);

      if (!hasHardware || !isEnrolled) {
        setBiometricLocked(false);
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Confirme que é você',
        promptSubtitle: 'Acesse sua conta PigFi',
        promptDescription: 'Use a biometria configurada neste aparelho.',
        cancelLabel: 'Cancelar',
        fallbackLabel: '',
        disableDeviceFallback: true,
        biometricsSecurityLevel: 'weak',
      });

      if (result.success) {
        setBiometricLocked(false);
      } else {
        setBiometricLocked(true);
        setBiometricMessage('Não foi possível confirmar sua identidade. Tente novamente.');
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
    await Promise.allSettled([
      logout(),
      Promise.resolve(clearAuth()),
    ]);
    setBiometricLocked(true);
    setBiometricChecking(false);
    router.replace('/(auth)');
  }, [clearAuth, logout]);

  useEffect(() => {
    if (!isReady || !hydrated) return;

    setTokenProvider(getAccessToken);
    setSignRawHashProvider(signRawHash);

    // `user` is restored from Privy's secure storage when `isReady` becomes true.
    // Avoid treating a transient token refresh failure as an explicit logout.
    if (isAuthenticated && !user) {
      clearAuth();
    }
    setGateOpen(true);
  }, [
    clearAuth,
    getAccessToken,
    hydrated,
    isAuthenticated,
    isReady,
    signRawHash,
    user,
  ]);

  useEffect(() => {
    if (!gateOpen) return;

    if (isAuthenticated) {
      if (!biometricLocked) {
        router.replace('/(tabs)');
        requestAnimationFrame(() => setSplashDone(true));
      } else {
        requestAnimationFrame(() => setSplashDone(true));
        unlockWithBiometrics();
      }
    } else {
      router.replace('/(auth)');
      setBiometricLocked(true);
      setBiometricMessage('');
      requestAnimationFrame(() => setSplashDone(true));
    }
  }, [biometricLocked, gateOpen, isAuthenticated, unlockWithBiometrics]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      const previousAppState = appStateRef.current;
      appStateRef.current = nextAppState;

      if (
        isAuthenticated &&
        !biometricLocked &&
        !authenticatingRef.current &&
        previousAppState.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        setBiometricLocked(true);
        unlockWithBiometrics();
      }
    });

    return () => subscription.remove();
  }, [biometricLocked, isAuthenticated, unlockWithBiometrics]);

  if (!splashDone) return <View style={styles.absoluteSplash} />;

  if (isAuthenticated && biometricLocked) {
    return (
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
          style={[styles.lockPrimaryBtn, biometricChecking && styles.lockBtnDisabled]}
        >
          <Text style={styles.lockPrimaryText}>
            {biometricChecking ? 'Verificando...' : 'Desbloquear'}
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
    );
  }

  return null;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  splash: { flex: 1, backgroundColor: Colors.background },
  absoluteSplash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.background,
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing[6],
    gap: 14,
  },
  lockIconWrap: {
    width: 76,
    height: 76,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  lockTitle: {
    fontSize: FontSize.heading,
    fontFamily: Font.black,
    color: Colors.foreground,
    textAlign: 'center',
  },
  lockText: {
    fontSize: FontSize.body,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 300,
  },
  lockMessage: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.semiBold,
    color: Accent.destructive,
    textAlign: 'center',
    maxWidth: 300,
  },
  lockPrimaryBtn: {
    width: '100%',
    maxWidth: 320,
    borderRadius: Radius.sm,
    backgroundColor: Accent.primary,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  lockBtnDisabled: {
    opacity: 0.6,
  },
  lockPrimaryText: {
    fontSize: FontSize.body,
    fontFamily: Font.black,
    color: '#fff',
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
});
