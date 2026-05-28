import { Buffer } from 'buffer';
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

import { PrivyProvider, usePrivy } from '@privy-io/expo';
import { useSignRawHash } from '@privy-io/expo/extended-chains';

import { Colors } from '@/constants/theme';
import { useAuthStore } from '@/lib/stores/auth.store';
import { setTokenProvider } from '@/lib/api/token';
import { setSignRawHashProvider } from '@/lib/stellar/signer';
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
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
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
            <Stack.Screen name="education" />
          </Stack>
          <StatusBar style="light" />
        </QueryClientProvider>
        <AppGate />
      </PrivyProvider>
    </View>
  );
}

function AppGate() {
  const { getAccessToken, isReady } = usePrivy();
  const { signRawHash } = useSignRawHash();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hydrated = useAuthStore((s) => s._hydrated);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [gateOpen, setGateOpen] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!isReady || !hydrated || hasInitialized.current) return;
    hasInitialized.current = true;

    setTokenProvider(getAccessToken);
    setSignRawHashProvider(signRawHash);

    (async () => {
      const token = await getAccessToken();
      if (isAuthenticated && !token) {
        clearAuth();
      }
      setGateOpen(true);
    })();
  }, [isReady, hydrated]);

  useEffect(() => {
    if (!gateOpen) return;

    if (isAuthenticated) {
      router.replace('/(tabs)');
    } else {
      router.replace('/(auth)');
    }

    requestAnimationFrame(() => setSplashDone(true));
  }, [gateOpen]);

  if (!splashDone) return <View style={styles.absoluteSplash} />;

  return null;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  splash: { flex: 1, backgroundColor: Colors.background },
  absoluteSplash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.background,
  },
});
