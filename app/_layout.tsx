import { Buffer } from 'buffer';
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

import { PrivyProvider, usePrivy } from '@privy-io/expo';

import { Colors } from '@/constants/theme';
import { useAuthStore } from '@/lib/stores/auth.store';
import { setTokenProvider } from '@/lib/api/token';
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
import { useEffect } from 'react';
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

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!fontsLoaded) return;
    if (isAuthenticated) {
      router.replace('/(tabs)');
    } else {
      router.replace('/(auth)');
    }
  }, [fontsLoaded, isAuthenticated]);

  if (!fontsLoaded) {
    return <View style={styles.splash} />;
  }

  return (
    <PrivyProvider
      appId={process.env.EXPO_PUBLIC_PRIVY_APP_ID!}
      clientId={process.env.EXPO_PUBLIC_PRIVY_CLIENT_ID!}
    >
      <AuthSetup />
      <QueryClientProvider client={queryClient}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="vault/[id]" />
          <Stack.Screen name="education" />
        </Stack>
        <StatusBar style="light" />
      </QueryClientProvider>
    </PrivyProvider>
  );
}

function AuthSetup() {
  const { getAccessToken, isReady } = usePrivy();

  useEffect(() => {
    if (isReady) {
      setTokenProvider(getAccessToken);
    }
  }, [isReady, getAccessToken]);

  return null;
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: Colors.background },
});
