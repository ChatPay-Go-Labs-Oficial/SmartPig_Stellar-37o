import { Badge, Button, Card, StarryBackground, getPigLevel, PressableScale, IconSymbol } from '@/components/ui';
import { Accent, Colors, Font, FontSize, Gradients, Radius, Spacing } from '@/constants/theme';
import { useAllVaultBalances } from '@/lib/queries/vaults.queries';
import { useAuthStore } from '@/lib/stores/auth.store';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Dimensions, FlatList, Image, StyleSheet, Text, View, ViewToken } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

const PIG_LEVELS = [
  { label: 'Porquinho Bebê', minBalance: 0, image: require('@/assets/images/pig_babe.png') },
  { label: 'Porquinho Esperto', minBalance: 100, image: require('@/assets/images/pig1.png') },
  { label: 'Porquinho Forte', minBalance: 500, image: require('@/assets/images/pig-muscle.png') },
  { label: 'Porquinho Dourado', minBalance: 1000, image: require('@/assets/images/pig-gold.png') },
  { label: 'Porquinho Rei', minBalance: 5000, image: require('@/assets/images/pig-king.png') },
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 64;
const CARD_GAP = 16;

export default function PigEvolutionScreen() {
  const walletAddress = useAuthStore((s) => s.walletAddress);
  const balances = useAllVaultBalances(walletAddress);

  const totalInvested = useMemo(() => {
    let total = 0;
    for (const b of balances) {
      const val = parseFloat(b.data?.underlyingBalance?.[0] ?? '0');
      total += val;
    }
    return total;
  }, [balances]);

  const level = getPigLevel(totalInvested);
  const [activeIndex, setActiveIndex] = useState(0);
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems[0]?.index != null) {
      setActiveIndex(viewableItems[0].index);
    }
  }).current;

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={Gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <StarryBackground stars={14} nebulas={3} shootingStars={false} />
        <View style={styles.headerContent}>
          <PressableScale onPress={() => router.back()} style={styles.backBtn}>
            <IconSymbol
              name="chevron.right"
              size={22}
              color={Colors.foreground}
              style={{ transform: [{ rotate: '180deg' }] }}
            />
          </PressableScale>

          <Text style={styles.title}>Evolução do Porquinho</Text>
          <Text style={styles.subtitle}>Veja todos os níveis e o quanto falta para desbloquear</Text>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <FlatList
          data={PIG_LEVELS}
          keyExtractor={(item) => item.label}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_WIDTH + CARD_GAP}
          decelerationRate="fast"
          contentContainerStyle={styles.carouselContent}
          ItemSeparatorComponent={() => <View style={{ width: CARD_GAP }} />}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          renderItem={({ item }) => {
            const unlocked = totalInvested >= item.minBalance;
            const isCurrent = level.minBalance === item.minBalance;

            return (
              <View style={styles.pigCard}>
                <View style={styles.slideHint}>
                  <Text style={styles.slideHintText}>Deslize</Text>
                  <MaterialIcons name="arrow-forward-ios" size={14} color="rgba(255,255,255,0.7)" />
                </View>

                <View style={styles.pigImageWrap}>
                  <Image source={item.image} style={styles.pigImage} />
                </View>

                <View style={styles.pigInfo}>
                  <Text style={styles.pigName}>{item.label}</Text>
                  <Text style={styles.pigValue}>Desbloqueia com ${item.minBalance}</Text>
                  {isCurrent && <Text style={styles.currentTag}>Seu nivel atual</Text>}
                </View>

                <Badge label={unlocked ? 'Desbloqueado' : 'Bloqueado'} variant={unlocked ? 'sucesso' : 'muted'} />

                {!unlocked && (
                  <View style={styles.lockOverlay}>
                    <MaterialIcons name="lock" size={34} color="rgba(255,255,255,0.85)" />
                  </View>
                )}
              </View>
            );
          }}
        />

        <View style={styles.dotsRow}>
          {PIG_LEVELS.map((_, i) => (
            <View key={String(i)} style={[styles.dot, i === activeIndex && styles.dotActive]} />
          ))}
        </View>

        <Card style={styles.ctaCard}>
          <Text style={styles.ctaTitle}>Alimente seu porquinho para ele crescer cada vez mais e ter ainda mais rendimentos</Text>
          <Button
            label="Alimentar porquinho"
            variant="primary"
            size="lg"
            fullWidth
            onPress={() => router.push('/(tabs)/vaults')}
          />
        </Card>
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
    paddingBottom: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  headerContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FontSize.heading,
    fontFamily: Font.extraBold,
    color: Colors.foreground,
  },
  subtitle: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.semiBold,
    color: 'rgba(255,255,255,0.75)',
  },
  content: {
    paddingTop: 16,
    paddingBottom: 120,
    gap: 16,
  },
  carouselContent: {
    paddingHorizontal: 20,
  },
  pigCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 18,
    position: 'relative',
    overflow: 'hidden',
    width: CARD_WIDTH,
    alignItems: 'center',
    gap: 12,
  },
  slideHint: {
    position: 'absolute',
    right: 14,
    top: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: Radius.full,
  },
  slideHintText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    fontFamily: Font.semiBold,
  },
  pigImageWrap: {
    width: '100%',
    height: 240,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pigImage: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
  },
  pigInfo: {
    width: '100%',
    gap: 2,
    alignItems: 'center',
  },
  pigName: {
    fontSize: FontSize.subheading,
    fontFamily: Font.bold,
    color: Colors.foreground,
  },
  pigValue: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
  },
  currentTag: {
    marginTop: 4,
    fontSize: FontSize.bodySmall,
    fontFamily: Font.bold,
    color: Accent.gold,
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(40,40,40,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  dotActive: {
    width: 18,
    backgroundColor: Accent.gold,
  },
  ctaCard: {
    marginTop: 4,
    gap: Spacing[4],
  },
  ctaTitle: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.semiBold,
    color: Colors.foreground,
    lineHeight: 20,
  },
});
