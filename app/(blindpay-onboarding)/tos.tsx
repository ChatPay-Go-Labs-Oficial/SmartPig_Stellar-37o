import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, StatusBar } from 'react-native';
import { WebView } from 'react-native-webview';
import type { WebViewNavigation } from 'react-native-webview';
import { router } from 'expo-router';
import { Colors, Accent, Font, FontSize, Spacing } from '@/constants/theme';
import { OnboardingBackButton } from '@/components/ui/OnboardingBackButton';
import { PressableScale } from '@/components/ui/PressableScale';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useInitiateTos } from '@/lib/queries/blindpay.queries';
import { useBlindPayStore } from '@/lib/stores/blindpay.store';

// Não precisa resolver de verdade — a navegação é interceptada dentro da
// própria WebView antes de chegar lá (ver onShouldStartLoadWithRequest).
const REDIRECT_URL = 'https://pigfi.app/onboarding/termos-concluidos';

function extractTosId(url: string): string | null {
  const match = /[?&]tos_id=([^&]+)/.exec(url);
  return match ? decodeURIComponent(match[1]) : null;
}

export default function TosScreen() {
  const contractId = useAuthStore((s) => s.contractId);
  const setTosId = useBlindPayStore((s) => s.setTosId);
  const setCurrentStep = useBlindPayStore((s) => s.setCurrentStep);
  const initiateTos = useInitiateTos();

  const [tosUrl, setTosUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const hasCaptured = useRef(false);

  useEffect(() => {
    if (!contractId) return;

    async function prepare() {
      setError('');
      try {
        const result = await initiateTos.mutateAsync({
          userId: contractId!,
          redirectUrl: REDIRECT_URL,
        });
        setTosUrl(result.tosUrl);
      } catch (e: any) {
        setError(
          e?.response?.data?.message || e?.message || 'Não foi possível carregar os termos de uso',
        );
      }
    }

    prepare();
  }, [contractId]);

  function handleShouldStartLoad(request: WebViewNavigation): boolean {
    if (hasCaptured.current) return true;

    const tosId = extractTosId(request.url);
    if (tosId) {
      hasCaptured.current = true;
      setTosId(tosId);
      setCurrentStep('kyc-form');
      router.replace('/(blindpay-onboarding)/kyc-form' as any);
      return false;
    }

    return true;
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <OnboardingBackButton />
        <Text style={styles.errorText}>{error}</Text>
        <PressableScale onPress={() => router.replace('/(blindpay-onboarding)' as any)}>
          <View style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>Tentar novamente</Text>
          </View>
        </PressableScale>
      </View>
    );
  }

  if (!tosUrl) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator color={Accent.primary} size="large" />
        <Text style={styles.loadingText}>Preparando seus termos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <OnboardingBackButton />
        <Text style={styles.headerTitle}>Termos de Uso</Text>
        <View style={styles.headerSpacer} />
      </View>
      <WebView
        source={{ uri: tosUrl }}
        style={styles.webview}
        onShouldStartLoadWithRequest={handleShouldStartLoad}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color={Accent.primary} size="large" />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing[6],
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 52,
    paddingBottom: 12,
    paddingHorizontal: Spacing[4],
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.bold,
    color: Colors.mutedForeground,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 36,
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    fontSize: FontSize.body,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
  },
  errorText: {
    fontSize: FontSize.body,
    fontFamily: Font.regular,
    color: Accent.destructive,
    textAlign: 'center',
  },
  retryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  retryBtnText: {
    fontSize: FontSize.body,
    fontFamily: Font.bold,
    color: Accent.primary,
  },
});
