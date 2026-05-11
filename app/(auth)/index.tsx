import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Gradients, Spacing, Radius, Font, FontSize } from '@/constants/theme';

export default function OnboardingScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.title}>SmartPig</Text>
        <Text style={styles.subtitle}>
          Faça seu dinheiro crescer com{'\n'}vaults DeFi na rede Stellar
        </Text>
      </View>

      <View style={styles.actions}>
        <LinearGradient
          colors={Gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.btn, styles.btnPrimary]}
        >
          <Text style={styles.btnPrimaryText} onPress={() => router.push('/(auth)/create-wallet')}>
            Criar carteira
          </Text>
        </LinearGradient>

        <View style={styles.btnSecondary}>
          <Text style={styles.btnSecondaryText} onPress={() => router.push('/(auth)/connect-wallet')}>
            Já tenho uma carteira
          </Text>
        </View>
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
    paddingTop: 100,
    paddingBottom: 60,
  },
  hero: {
    alignItems: 'center',
    gap: Spacing[4],
  },
  title: {
    fontSize: FontSize.display,
    fontWeight: '900',
    color: Colors.foreground,
    fontFamily: Font.black,
  },
  subtitle: {
    fontSize: FontSize.body,
    color: Colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: Font.regular,
  },
  actions: {
    gap: Spacing[3],
  },
  btn: {
    paddingVertical: 14,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  btnPrimary: {},
  btnPrimaryText: {
    color: '#fff',
    fontSize: FontSize.body,
    fontWeight: '700',
    fontFamily: Font.bold,
  },
  btnSecondary: {
    paddingVertical: 14,
    borderRadius: Radius.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  btnSecondaryText: {
    color: Colors.foreground,
    fontSize: FontSize.body,
    fontWeight: '600',
    fontFamily: Font.semiBold,
  },
});
