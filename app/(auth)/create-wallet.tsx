import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Gradients, Spacing, Radius, Font, FontSize, Accent } from '@/constants/theme';

export default function CreateWalletScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Criar carteira</Text>
        <Text style={styles.subtitle}>
          Sua carteira será protegida com biometria.{'\n'}
          Nenhuma senha ou chave privada necessária.
        </Text>
      </View>

      {/* TODO: integrar kit.createWallet() via useSmartAccount() */}
      <LinearGradient
        colors={Gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.btn}
      >
        <Text style={styles.btnText}>Criar com Face ID / Touch ID</Text>
      </LinearGradient>
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
  btn: {
    paddingVertical: 14,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  btnText: {
    color: '#fff',
    fontSize: FontSize.body,
    fontWeight: '700',
    fontFamily: Font.bold,
  },
});
