import { Colors } from '@/constants/theme';
import { useAuthStore } from '@/lib/stores/auth.store';
import { initWalletConnect } from '@/lib/wallet-kit';
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  Nunito_900Black,
  useFonts,
} from '@expo-google-fonts/nunito';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import 'react-native-reanimated';

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

// Initialize WalletConnect once at app startup
initWalletConnect().catch((e) => console.warn('[WalletConnect] Init failed:', e));

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
    if (!isAuthenticated) {
      router.replace('/(auth)');
    }
  }, [fontsLoaded, isAuthenticated]);

  if (!fontsLoaded) {
    return <View style={styles.splash} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="vault/[id]" options={{ headerShown: true, title: '' }} />
      </Stack>
      <StatusBar style="light" />
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: Colors.background },
});
