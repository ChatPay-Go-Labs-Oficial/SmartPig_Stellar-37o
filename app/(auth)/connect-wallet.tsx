import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Gradients, Spacing, Radius, Font, FontSize, Accent } from '@/constants/theme';
import { useSmartAccount } from '@/hooks/use-smart-account';

export default function ConnectWalletScreen() {
  const { isConnecting, error, connect } = useSmartAccount();

  async function handleConnect() {
    try {
      await connect();
      // Navigation handled by _layout.tsx useEffect watching isAuthenticated
    } catch {
      // error is already set in the hook
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Entrar</Text>
        <Text style={styles.subtitle}>
          Use sua biometria para reconectar sua carteira existente.
        </Text>
      </View>

      <View style={styles.footer}>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity onPress={handleConnect} disabled={isConnecting}>
          <LinearGradient
            colors={Gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.btn, isConnecting && styles.btnDisabled]}
          >
            {isConnecting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Entrar com biometria</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkBtn}
          onPress={() => router.push('/(auth)/create-wallet')}
          disabled={isConnecting}
        >
          <Text style={styles.linkText}>Criar nova carteira</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing[8],
    justifyContent: 'space-between',
    paddingTop: 80,
    paddingBottom: 60,
  },
  header: { gap: Spacing[4] },
  title: {
    fontSize: FontSize.heading,
    fontWeight: '800',
    color: Colors.foreground,
    fontFamily: Font.extraBold,
  },
  subtitle: {
    fontSize: FontSize.body,
    color: Colors.mutedForeground,
    lineHeight: 24,
    fontFamily: Font.regular,
  },
  footer: { gap: Spacing[4] },
  errorText: {
    fontSize: FontSize.bodySmall,
    color: Accent.destructive,
    fontFamily: Font.regular,
    textAlign: 'center',
  },
  btn: {
    paddingVertical: 14,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  btnText: {
    color: '#fff',
    fontSize: FontSize.body,
    fontWeight: '700',
    fontFamily: Font.bold,
  },
  linkBtn: { alignItems: 'center', paddingVertical: Spacing[2] },
  linkText: {
    color: Colors.mutedForeground,
    fontSize: FontSize.bodySmall,
    fontFamily: Font.semiBold,
  },
});

