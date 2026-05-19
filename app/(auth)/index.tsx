import { PressableScale, StarryBackground } from '@/components/ui';
import { Colors, Font, FontSize, Gradients, Radius, Spacing } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Image, StyleSheet, Text, View } from 'react-native';

export default function OnboardingScreen() {
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

      <View style={styles.hero}>
        <Text style={styles.title}>PigFi</Text>
        <Text style={styles.subtitle}>
          Sua poupança inteligente na{'\n'}rede Stellar
        </Text>
        <Image source={require('@/assets/images/pig1.png')} style={styles.pigImage} />
      </View>


      <View style={styles.actions}>
        <PressableScale style={{ alignSelf: 'stretch' }}>
          <LinearGradient
            colors={Gradients.hot}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.btnPrimary}
          >
            <Text style={styles.btnPrimaryText} onPress={() => router.push('/(auth)/create-wallet')}>
              Criar conta
            </Text>
          </LinearGradient>
        </PressableScale>

        <PressableScale style={{ alignSelf: 'stretch' }}>
          <View style={styles.btnSecondary}>
            <Text style={styles.btnSecondaryText} onPress={() => router.push('/(auth)/connect-wallet')}>
              Já tenho uma conta
            </Text>
          </View>
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing[6],
    justifyContent: 'space-between',
    paddingTop: Spacing[16],
    paddingBottom: 60,
  },
  hero: {
    alignItems: 'center',
    gap: Spacing[4],
    zIndex: 10,
  },
  pigImage: {
    width: 600,
    height: 600,
    resizeMode: 'contain',
    position: 'absolute',
    top: 50,
    zIndex: 5,
  },
  title: {
    fontSize: 48,
    fontWeight: '900',
    color: Colors.foreground,
    fontFamily: Font.black,
  },
  subtitle: {
    fontSize: FontSize.body,
    color: Colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: Font.semiBold,
  },
  actions: {
    gap: Spacing[3],
    zIndex: 10,
  },
  btnPrimary: {
    paddingVertical: 14,
    borderRadius: Radius.lg,
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
  },
  btnPrimaryText: {
    color: '#fff',
    fontSize: FontSize.body,
    fontWeight: '900',
    fontFamily: Font.black,
  },
  btnSecondary: {
    paddingVertical: 14,
    borderRadius: Radius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 56,
    justifyContent: 'center',
  },
  btnSecondaryText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: FontSize.body,
    fontWeight: '900',
    fontFamily: Font.black,
  },
});
