import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { FlashcardSwiper } from '@/components/ui/FlashcardSwiper';
import { StarryBackground } from '@/components/ui';
import { Colors, Font, FontSize, Gradients, Radius, Spacing } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

export default function LearnScreen() {
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
          <Text style={styles.title}>Aprender</Text>
          <Text style={styles.subtitle}>
            Aprenda sobre DeFi, Stellar e como seu dinheiro rende 🎓
          </Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <FlashcardSwiper />

        <View style={styles.progressCard}>
          <Text style={styles.progressTitle}>🏆 Seu progresso</Text>
          <View style={styles.progressBar}>
            <View style={styles.progressFill} />
          </View>
          <Text style={styles.progressText}>3 de 12 lições concluídas</Text>
        </View>
      </ScrollView>
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
  title: {
    fontSize: FontSize.heading,
    fontFamily: Font.extraBold,
    color: '#fff',
  },
  subtitle: {
    fontSize: FontSize.bodySmall,
    color: 'rgba(255,255,255,0.8)',
    fontFamily: Font.regular,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Spacing[6],
    paddingBottom: 120,
    gap: 24,
  },
  progressCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[4],
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
