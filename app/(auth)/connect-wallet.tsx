import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Gradients, Spacing, Radius, Font, FontSize, Accent } from '@/constants/theme';
import { useWalletConnect } from '@/lib/hooks/use-wallet-connect';

export default function ConnectWalletScreen() {
  const { connect, isConnecting, error } = useWalletConnect();

  async function handleConnect() {
    try {
      await connect();
      router.replace('/onboarding' as any);
    } catch {
      // error already set in hook state
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Conectar carteira</Text>
        <Text style={styles.subtitle}>
          Abra sua carteira Lobstr e aprove a conexão para continuar.
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable onPress={handleConnect} disabled={isConnecting} style={{ alignSelf: 'stretch' }}>
          <LinearGradient
            colors={Gradients.primary}
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
        </Pressable>

        {isConnecting && (
          <Text style={styles.hintText}>
            Approve a conexão no Lobstr e retorne a este app.
          </Text>
        )}

        {error && <Text style={styles.errorText}>{error}</Text>}

        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>Voltar</Text>
        </Pressable>
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
  actions: {
    gap: Spacing[3],
    alignItems: 'center',
  },
  btn: {
    paddingVertical: 14,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: '#fff',
    fontSize: FontSize.body,
    fontWeight: '700',
    fontFamily: Font.bold,
  },
  hintText: {
    fontSize: FontSize.bodySmall,
    color: Colors.mutedForeground,
    fontFamily: Font.regular,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorText: {
    fontSize: FontSize.bodySmall,
    color: Accent.destructive,
    fontFamily: Font.regular,
    textAlign: 'center',
  },
  backBtn: {
    paddingVertical: Spacing[2],
  },
  backText: {
    fontSize: FontSize.body,
    color: Colors.mutedForeground,
    fontFamily: Font.semiBold,
  },
});
