import { Colors } from '@/constants/theme';
import { useAuthStore } from '@/lib/stores/auth.store';
import { ToastContainer } from '@/components/ui/ToastContainer';
import { initWalletConnect } from '@/lib/wallet-kit';
import { SafeAreaProvider } from 'react-native-safe-area-context';
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
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import 'react-native-reanimated';
import { OnboardingService } from '@/lib/services/onboarding.service';

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
  const userId = useAuthStore((s) => s.userId);
  const onboardingStatus = useAuthStore((s) => s.onboardingStatus);
  const setOnboardingStatus = useAuthStore((s) => s.setOnboardingStatus);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(false);
  const [validatedUserId, setValidatedUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!fontsLoaded) return;
    if (!isAuthenticated) {
      setValidatedUserId(null);
      setIsCheckingOnboarding(false);
      router.replace('/(auth)');
      return;
    }
    if (!userId) return;

    let isActive = true;
    setValidatedUserId(null);
    setIsCheckingOnboarding(true);

    OnboardingService.resolveOnboardingStatus(userId)
      .then(({ status }) => {
        if (!isActive) return;
        setOnboardingStatus(status);
        setValidatedUserId(userId);
      })
      .catch((e) => {
        if (!isActive) return;
        console.warn('[RootLayout] Falha ao validar onboarding:', e);
        setOnboardingStatus('not_started');
        setValidatedUserId(userId);
      })
      .finally(() => {
        if (isActive) {
          setIsCheckingOnboarding(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [fontsLoaded, isAuthenticated, userId, setOnboardingStatus]);

  useEffect(() => {
    if (!fontsLoaded) return;
    if (!isAuthenticated) {
      router.replace('/(auth)');
      return;
    }
    if (!userId || isCheckingOnboarding || validatedUserId !== userId) return;

    if (onboardingStatus === 'completed') {
      router.replace('/(tabs)');
    } else if (onboardingStatus === 'organization_created') {
      router.replace('/(auth)/onboarding/account-creation');
    } else {
      router.replace('/onboarding' as any);
    }
  }, [fontsLoaded, isAuthenticated, isCheckingOnboarding, onboardingStatus, userId, validatedUserId]);

  if (!fontsLoaded || (isAuthenticated && (!userId || isCheckingOnboarding || validatedUserId !== userId))) {
    return <View style={styles.splash} />;
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(modals)" options={{ presentation: 'modal' }} />
          <Stack.Screen name="vault/[id]" options={{ headerShown: true, title: '' }} />
        </Stack>
        <ToastContainer />
        <StatusBar style="light" />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: Colors.background },
});
