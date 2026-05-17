import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Gradients, Spacing, Radius, Font, FontSize } from '@/constants/theme';
import { StarryBackground, PressableScale } from '@/components/ui';

export default function CreateWalletScreen() {
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
        <Text style={styles.title}>Criar conta</Text>
        <Text style={styles.subtitle}>
          Sua carteira será protegida com biometria.{'\n'}
          Nenhuma senha ou chave privada necessária.
        </Text>
      </View>

      <View style={styles.actions}>
        <PressableScale style={{ alignSelf: 'stretch' }}>
          <LinearGradient
            colors={Gradients.hot}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.btn}
          >
            <Text style={styles.btnText}>Criar com Face ID / Touch ID</Text>
          </LinearGradient>
        </PressableScale>

        <PressableScale onPress={() => router.push('/(auth)/connect-wallet')} style={{ alignSelf: 'center' }}>
          <Text style={styles.linkText}>Já tenho uma conta {'→'} Conectar</Text>
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
    zIndex: 10,
  },
  btn: {
    paddingVertical: 14,
    borderRadius: Radius.lg,
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
  },
  btnText: {
    color: '#fff',
    fontSize: FontSize.body,
    fontWeight: '900',
    fontFamily: Font.black,
  },
  linkText: {
    fontSize: FontSize.bodySmall,
    color: Colors.mutedForeground,
    fontFamily: Font.semiBold,
  },
});
