import { IconSymbol, PressableScale, StarryBackground } from '@/components/ui';
import { FlashcardSwiper } from '@/components/ui/FlashcardSwiper';
import { Colors, Font, FontSize, Gradients, Radius, Spacing } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function EducationScreen() {
  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={Gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <StarryBackground stars={12} nebulas={3} shootingStars={false} />

        <View style={styles.headerContent}>
          <View style={styles.headerRow}>
            <PressableScale onPress={() => router.back()}>
              <View style={styles.backBtn}>
                <IconSymbol name="chevron.right" size={24} color={Colors.foreground} style={{ transform: [{ rotate: '180deg' }] }} />
              </View>
            </PressableScale>
            <Text style={styles.headerTitle}>Educação DeFi</Text>
          </View>
          <Text style={styles.headerSub}>
            Aprenda sobre DeFi, Stellar e como seu dinheiro rende 🎓
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.body}>
        <FlashcardSwiper />

        <View style={styles.progressCard}>
          <Text style={styles.progressTitle}>🏆 Seu progresso</Text>
          <View style={styles.progressBar}>
            <View style={styles.progressFill} />
          </View>
          <Text style={styles.progressText}>3 de 12 lições concluídas</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingTop: 56,
    paddingBottom: Spacing[8],
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  headerContent: {
    paddingHorizontal: Spacing[6],
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 20,
    color: '#fff',
    fontFamily: Font.bold,
  },
  headerTitle: {
    fontSize: FontSize.subheading,
    fontFamily: Font.extraBold,
    color: '#fff',
  },
  headerSub: {
    fontSize: FontSize.bodySmall,
    color: 'rgba(255,255,255,0.8)',
    fontFamily: Font.regular,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: Spacing[6],
  },
  progressCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[4],
    marginTop: Spacing[8],
    gap: 8,
  },
  progressTitle: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.extraBold,
    color: Colors.foreground,
  },
  progressBar: {
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.muted,
    overflow: 'hidden',
  },
  progressFill: {
    width: '25%',
    height: '100%',
    borderRadius: 6,
    backgroundColor: Colors.foreground,
  },
  progressText: {
    fontSize: FontSize.label,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
  },
});
