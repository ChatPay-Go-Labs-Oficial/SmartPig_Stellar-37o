import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Gradients, Spacing, Radius, Font, FontSize, Accent } from '@/constants/theme';
import { StarryBackground, PressableScale } from '@/components/ui';
import { useWalletConnect } from '@/lib/hooks/use-wallet-connect';

export default function ConnectWalletScreen() {
  const { connect, isConnecting, error } = useWalletConnect();

  async function handleConnect() {
    try {
      await connect();
      router.replace('/(tabs)');
    } catch {
      // error already set in hook state
    }
  }

  return (
    <View style={styles.container}>
      <StarryBackground />
      <LinearGradient
        colors={['hsla(320, 90%, 58%, 0.2)', 'hsla(270, 80%, 60%, 0.2)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={styles.header}>
        <Text style={styles.title}>Conectar carteira</Text>
        <Text style={styles.subtitle}>
          Abra sua carteira Lobstr e aprove a conexão para continuar.
        </Text>
      </View>

      <View style={styles.actions}>
        <PressableScale onPress={handleConnect} disabled={isConnecting} style={{ alignSelf: 'stretch' }}>
          <LinearGradient
            colors={Gradients.hot}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.btn, isConnecting && styles.btnDisabled]}
          >
            {isConnecting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Conectar com Lobstr</Text>
            )}
          </LinearGradient>
        </PressableScale>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <PressableScale onPress={() => router.back()} style={{ alignSelf: 'center' }}>
          <Text style={styles.backText}>Voltar</Text>
        </PressableScale>
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
  header: { gap: Spacing[4], zIndex: 10 },
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
  actions: {
    gap: Spacing[3],
    alignItems: 'center',
    zIndex: 10,
  },
  btn: {
    paddingVertical: 14,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: '#fff',
    fontSize: FontSize.body,
    fontWeight: '900',
    fontFamily: Font.black,
  },
  errorText: {
    fontSize: FontSize.bodySmall,
    color: Accent.destructive,
    fontFamily: Font.regular,
    textAlign: 'center',
  },
  backText: {
    fontSize: FontSize.body,
    color: Colors.mutedForeground,
    fontFamily: Font.semiBold,
  },
});
