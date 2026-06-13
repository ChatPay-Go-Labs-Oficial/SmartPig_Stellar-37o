import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Alert,
} from 'react-native';
import { PressableScale } from '@/components/ui/PressableScale';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Colors, Accent, Font, FontSize, Gradients, Radius, Spacing } from '@/constants/theme';
import { OnboardingBackButton } from '@/components/ui/OnboardingBackButton';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useEtherfuseStore } from '@/lib/stores/etherfuse.store';
import { useSyncBankAccounts, useGeneratePresignedUrl, useAcceptEsign, useAcceptTerms, useAcceptCustomerAgreement } from '@/lib/queries/etherfuse.queries';

export default function PresignedBankScreen() {
  const contractId = useAuthStore((s) => s.contractId);
  const walletAddress = useAuthStore((s) => s.walletAddress);
  const presignedUrl = useEtherfuseStore((s) => s.presignedUrl);
  const setPresignedUrl = useEtherfuseStore((s) => s.setPresignedUrl);
  const setCurrentStep = useEtherfuseStore((s) => s.setCurrentStep);
  const setBankAccount = useEtherfuseStore((s) => s.setBankAccount);
  const syncBankAccounts = useSyncBankAccounts();

  const genUrl = useGeneratePresignedUrl();
  const acceptEsign = useAcceptEsign();
  const acceptTerms = useAcceptTerms();
  const acceptCustomer = useAcceptCustomerAgreement();

  const [localUrl, setLocalUrl] = useState<string | null>(presignedUrl ?? null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(!presignedUrl);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const hasCompleted = useRef(false);

  useEffect(() => {
    if (localUrl) return;
    if (!walletAddress || !contractId) return;

    async function preparePresignedUrl() {
      setGenerating(true);
      setError('');
      try {
        const presigned = await genUrl.mutateAsync({
          userId: contractId!,
          pubkey: walletAddress!,
        });
        const dto = { userId: contractId!, presignedUrl: presigned.presignedUrl };

        await Promise.allSettled([
          acceptEsign.mutateAsync(dto),
          acceptTerms.mutateAsync(dto),
          acceptCustomer.mutateAsync(dto),
        ]);

        setPresignedUrl(presigned.presignedUrl);
        setLocalUrl(presigned.presignedUrl);
      } catch (e: any) {
        setError('Erro ao preparar cadastro bancário. Tente novamente.');
        console.error(e);
      } finally {
        setGenerating(false);
      }
    }

    preparePresignedUrl();
  }, []);

  async function handleFinish() {
    if (hasCompleted.current) return;
    hasCompleted.current = true;

    setSyncing(true);
    try {
      const accounts = await syncBankAccounts.mutateAsync(contractId!);
      const hasCompliant = accounts.some((a) => a.isCompliant);
      setBankAccount(accounts.length > 0, hasCompliant);
      setCurrentStep('pending');
      router.replace('/(etherfuse-onboarding)/pending' as any);
    } catch (e: any) {
      setError('Erro ao sincronizar conta bancária. Tente novamente.');
      hasCompleted.current = false;
    } finally {
      setSyncing(false);
    }
  }

  function handleConfirmFinish() {
    Alert.alert(
      'Finalizar cadastro?',
      'Confirme se você já concluiu o cadastro da conta bancária no site da Etherfuse.',
      [
        { text: 'Ainda não', style: 'cancel' },
        { text: 'Sim, concluí', onPress: handleFinish },
      ],
    );
  }

  function handleNavigationStateChange(navState: any) {
    const url = navState.url?.toLowerCase() ?? '';

    if (
      !hasCompleted.current &&
      (url.includes('success') || url.includes('completed') || url.includes('thank-you'))
    ) {
      handleFinish();
    }
  }

  if (generating) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator color={Accent.primary} size="large" />
        <Text style={styles.syncText}>Preparando cadastro bancário...</Text>
      </View>
    );
  }

  if (syncing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator color={Accent.primary} size="large" />
        <Text style={styles.syncText}>Sincronizando conta bancária...</Text>
      </View>
    );
  }

  if (error && !localUrl) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <PressableScale onPress={() => router.replace('/(etherfuse-onboarding)' as any)}>
          <View style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>Tentar novamente</Text>
          </View>
        </PressableScale>
      </View>
    );
  }

  if (error && localUrl) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <PressableScale onPress={handleFinish}>
          <View style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>Tentar novamente</Text>
          </View>
        </PressableScale>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
        <View style={styles.header}>
          <OnboardingBackButton />
          <Text style={styles.headerTitle}>Cadastrar Conta Bancária</Text>
          <View style={styles.headerSpacer} />
      </View>
      <WebView
        source={{ uri: localUrl ?? '' }}
        style={styles.webview}
        onLoadEnd={() => setLoading(false)}
        onNavigationStateChange={handleNavigationStateChange}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color={Accent.primary} size="large" />
            <Text style={styles.loadingText}>Abrindo Etherfuse...</Text>
          </View>
        )}
      />
      <View style={styles.footer}>
        <PressableScale onPress={handleConfirmFinish}>
          <LinearGradient
            colors={Gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.finishBtn}
          >
            <Text style={styles.finishBtnText}>Já concluí o cadastro</Text>
          </LinearGradient>
        </PressableScale>
      </View>
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
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 16,
    color: Colors.foreground,
    fontFamily: Font.bold,
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
    gap: 12,
  },
  loadingText: {
    fontSize: FontSize.body,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
  },
  syncText: {
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
  footer: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    paddingBottom: Spacing[8],
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  finishBtn: {
    borderRadius: Radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
  },
  finishBtnText: {
    color: '#fff',
    fontSize: FontSize.body,
    fontFamily: Font.bold,
  },
});
