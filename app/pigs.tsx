import { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { V2Colors, V2Font, V2Layout, V2Radius, withAlpha } from '@/constants/theme-v2';
import {
  PIG_LEVELS,
  groupThousands,
  levelProgress,
  mascotBox,
  type PigLevel,
} from '@/constants/pig-levels';
import { useAccent } from '@/hooks/use-accent';
import { useInvestedTotal } from '@/hooks/use-invested-total';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { Button3D, ListCard, RADIAL_MASK, ScreenGlow, V2Icon } from '@/components/v2';

/**
 * Evolução do porquinho (Figma "Home · Evolução do porquinho", 04e/04f/04g):
 * um carrossel com a "skin" de cada nível — abre no nível atual, desliza entre
 * os cinco, e o toque na lista leva ao nível tocado — e a lista dos níveis.
 * Abre pelo mascote da Home. O nível vem do mesmo total da Home
 * (useInvestedTotal).
 */
export default function PigEvolutionScreen() {
  const accent = useAccent();
  const screenInsets = useScreenInsets();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const invested = useInvestedTotal();
  const level = levelProgress(invested.totalUsd);

  // Página do carrossel = a largura do cartão (coluna menos as margens).
  const pageWidth = Math.min(width, V2Layout.maxWidth) - 2 * GUTTER;
  const pager = useRef<ScrollView>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const shown = selected ?? level.index;

  // Abre no nível atual. O carrossel só monta com o total pronto, então a
  // posição inicial já é conhecida: vai em contentOffset, congelada na
  // primeira vez (no Android a prop vira scrollTo a cada valor novo). Um
  // scrollTo logo ao montar parava no meio, antes de o carrossel medir.
  const initialOffset = useRef<{ x: number; y: number } | null>(null);
  if (invested.ready && !initialOffset.current) {
    initialOffset.current = { x: level.index * pageWidth, y: 0 };
  }
  useEffect(() => {
    if (invested.ready && selected === null) setSelected(level.index);
  }, [invested.ready, level.index, selected]);

  const showLevel = useCallback(
    (index: number) => {
      setSelected(index);
      pager.current?.scrollTo({ x: index * pageWidth, animated: true });
    },
    [pageWidth],
  );

  const stateOf = (index: number): LevelState =>
    index === level.index ? 'current' : index < level.index ? 'unlocked' : 'locked';

  return (
    <View style={styles.screen}>
      <ScreenGlow peak={0.4} />
      <ScrollView
        style={{ marginTop: screenInsets.top }}
        contentContainerStyle={[
          styles.content,
          { paddingTop: screenInsets.topGap, paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.top}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.back, pressed && styles.backPressed]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
          >
            <V2Icon name="chevron-left" size={20} color={V2Colors.text} />
          </Pressable>
          <View style={styles.titles}>
            <Text style={styles.title} accessibilityRole="header">
              Evolução do porquinho
            </Text>
            <Text style={styles.subtitle}>Quanto mais você guarda, mais ele cresce</Text>
          </View>
        </View>

        {invested.ready ? (
          <>
            <ScrollView
              ref={pager}
              horizontal
              pagingEnabled
              decelerationRate="fast"
              showsHorizontalScrollIndicator={false}
              style={styles.pager}
              contentOffset={initialOffset.current ?? undefined}
              onMomentumScrollEnd={(event) =>
                setSelected(Math.round(event.nativeEvent.contentOffset.x / pageWidth))
              }
            >
              {PIG_LEVELS.map((item, index) => (
                <LevelCard
                  key={item.label}
                  width={pageWidth}
                  level={item}
                  state={stateOf(index)}
                  next={PIG_LEVELS[index + 1]}
                  totalUsd={invested.totalUsd}
                  valuationUnavailable={invested.valuationUnavailable}
                />
              ))}
            </ScrollView>
            <View style={styles.dots}>
              {PIG_LEVELS.map((item, index) => (
                <View
                  key={item.label}
                  style={[
                    styles.dot,
                    index === shown && [styles.dotActive, { backgroundColor: accent.base }],
                  ]}
                />
              ))}
            </View>
          </>
        ) : (
          <View style={[styles.pager, styles.card, styles.loading]}>
            <ActivityIndicator color={accent.base} />
          </View>
        )}

        <Text style={styles.sectionTitle} accessibilityRole="header">
          Todos os níveis
        </Text>
        <ListCard style={styles.list}>
          {PIG_LEVELS.map((item, index) => (
            <LevelRow
              key={item.label}
              index={index}
              level={item}
              caption={index === 0 ? 'Começa aqui' : `A partir de $${item.minBalance}`}
              state={invested.ready ? stateOf(index) : 'locked'}
              selected={invested.ready && index === shown}
              onPress={invested.ready ? showLevel : undefined}
            />
          ))}
        </ListCard>

        <View style={styles.action}>
          <Button3D
            label="Alimentar porquinho"
            icon="piggy"
            // A Evolução fica por cima das abas: volta até elas e abre a
            // Guardar, em vez de empilhar outra cópia das abas.
            onPress={() => router.dismissTo('/(tabs)/vaults')}
          />
        </View>
      </ScrollView>
    </View>
  );
}

type LevelState = 'current' | 'unlocked' | 'locked';

const GUTTER = 18;

/**
 * Uma página do carrossel: a arte do nível e o que falta para ele.
 * - atual: "Seu nível atual" e a barra até o próximo (ou o nível máximo);
 * - desbloqueado: a arte em cores e o selo verde;
 * - bloqueado (Figma 04g): a arte apagada, o selo com cadeado e a barra do
 *   total até o mínimo do nível.
 */
const LevelCard = memo(function LevelCard({
  width,
  level,
  state,
  next,
  totalUsd,
  valuationUnavailable,
}: {
  width: number;
  level: PigLevel;
  state: LevelState;
  next: PigLevel | undefined;
  totalUsd: number;
  valuationUnavailable: boolean;
}) {
  const accent = useAccent();
  const locked = state === 'locked';
  const total = `$${groupThousands(totalUsd)}`;

  let progress: { left: string; right: string; value: number } | null = null;
  let note: string | null = null;
  if (state === 'current') {
    if (next) {
      progress = {
        left: `Próximo: ${next.label}`,
        right: valuationUnavailable ? '—' : `${total} de $${groupThousands(next.minBalance)}`,
        value: (totalUsd - level.minBalance) / (next.minBalance - level.minBalance),
      };
    } else note = 'Você chegou ao nível máximo';
  } else if (locked) {
    progress = {
      left: `Faltam $${groupThousands(level.minBalance - totalUsd)} para desbloquear`,
      right: valuationUnavailable ? '—' : `${total} de $${groupThousands(level.minBalance)}`,
      value: totalUsd / level.minBalance,
    };
  } else note = 'Você já passou por este nível';

  return (
    <View
      style={{ width }}
      accessible
      accessibilityLabel={`${level.label}, ${progress?.left ?? note}`}
    >
      <View style={styles.card}>
        <Image
          pointerEvents="none"
          source={RADIAL_MASK}
          tintColor={accent.base}
          contentFit="fill"
          style={styles.cardGlow}
        />
        <View style={locked && styles.lockedArtLarge}>
          <Image source={level.art} contentFit="contain" style={mascotBox(level, 190)} />
        </View>
        <View style={styles.nameBlock}>
          <StateBadge state={state} currentLabel="Seu nível atual" />
          <Text
            style={styles.cardName}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            {level.label}
          </Text>
        </View>
        {progress ? (
          <View style={styles.progress}>
            <View style={styles.progressLegend}>
              <Text
                style={styles.progressLabel}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {progress.left}
              </Text>
              <Text style={styles.progressValue}>{progress.right}</Text>
            </View>
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  {
                    width: `${Math.min(1, Math.max(0, progress.value)) * 100}%`,
                    backgroundColor: accent.base,
                    boxShadow: `0px 0px 10px ${accent.alpha(0.48)}`,
                  },
                ]}
              />
            </View>
          </View>
        ) : (
          <View style={styles.noteWrap}>
            <Text style={styles.note}>{note}</Text>
          </View>
        )}
      </View>
    </View>
  );
});

/** Selo do estado do nível: atual (destaque), desbloqueado (verde), bloqueado. */
function StateBadge({ state, currentLabel }: { state: LevelState; currentLabel: string }) {
  const accent = useAccent();
  if (state === 'current') {
    return (
      <View
        style={[styles.badge, { backgroundColor: accent.alpha(0.14), borderColor: accent.alpha(0.32) }]}
      >
        <Text style={[styles.badgeText, { color: accent.base }]}>{currentLabel}</Text>
      </View>
    );
  }
  if (state === 'locked') {
    return (
      <View style={[styles.badge, styles.badgeLocked]}>
        <V2Icon name="lock" size={12} color={V2Colors.textSecondary} />
        <Text style={[styles.badgeText, { color: V2Colors.textSecondary }]}>Bloqueado</Text>
      </View>
    );
  }
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: withAlpha(V2Colors.success, 0.14),
          borderColor: withAlpha(V2Colors.success, 0.32),
        },
      ]}
    >
      <V2Icon name="check" size={12} color={V2Colors.success} />
      <Text style={[styles.badgeText, { color: V2Colors.success }]}>Desbloqueado</Text>
    </View>
  );
}

const LevelRow = memo(function LevelRow({
  index,
  level,
  caption,
  state,
  selected,
  onPress,
}: {
  index: number;
  level: PigLevel;
  caption: string;
  state: LevelState;
  /** O nível que está no carrossel (Figma 04g: contorno no destaque). */
  selected: boolean;
  onPress?: (index: number) => void;
}) {
  const accent = useAccent();
  const locked = state === 'locked';

  return (
    <Pressable
      onPress={onPress ? () => onPress(index) : undefined}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.row,
        state === 'current' && { backgroundColor: accent.alpha(0.06) },
        selected && state !== 'current' && [styles.rowSelected, { borderColor: accent.alpha(0.4) }],
        pressed && styles.rowPressed,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${level.label}, ${caption}, ${
        state === 'current' ? 'nível atual' : locked ? 'bloqueado' : 'desbloqueado'
      }`}
      accessibilityHint="Mostra o porquinho deste nível"
    >
      <View
        style={[
          styles.thumb,
          locked
            ? styles.thumbLocked
            : { backgroundColor: accent.alpha(0.16), borderColor: accent.alpha(0.4) },
        ]}
      >
        <View style={locked && styles.lockedArt}>
          <Image source={level.art} contentFit="contain" style={mascotBox(level, 52, 46 / 52)} />
        </View>
        {locked && (
          <View style={styles.lock}>
            <V2Icon name="lock" size={11} color={V2Colors.text} />
          </View>
        )}
      </View>

      <View style={styles.rowTexts}>
        {/* Em telas estreitas o selo "Desbloqueado" aperta o nome: ele reduz
            um pouco antes de cortar. */}
        <Text
          style={[styles.rowName, locked && styles.rowNameLocked]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {level.label}
        </Text>
        <Text style={styles.rowCaption} numberOfLines={1}>
          {caption}
        </Text>
      </View>

      <StateBadge state={state} currentLabel="Atual" />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: V2Colors.background,
  },
  content: {
    width: '100%',
    maxWidth: V2Layout.maxWidth,
    alignSelf: 'center',
    paddingHorizontal: 18,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: V2Colors.surfaceBorderStrong,
    backgroundColor: V2Colors.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backPressed: {
    opacity: 0.7,
  },
  titles: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: V2Font.black,
    fontSize: 22,
    letterSpacing: -0.44,
    color: V2Colors.text,
  },
  subtitle: {
    fontFamily: V2Font.medium,
    fontSize: 13,
    color: V2Colors.textSecondary,
  },
  pager: {
    marginTop: 22,
  },
  // Figma "nível atual": cartão com brilho do destaque atrás do mascote
  // (radial 28% → 0, centro a 35% da altura, raios 214 × 191).
  card: {
    alignItems: 'center',
    gap: 14,
    padding: 18,
    borderRadius: V2Radius.list,
    borderWidth: 1,
    borderColor: V2Colors.surfaceBorderStrong,
    backgroundColor: V2Colors.surface,
    overflow: 'hidden',
  },
  cardGlow: {
    position: 'absolute',
    left: '50%',
    top: 121,
    width: 428,
    height: 382,
    marginLeft: -214,
    marginTop: -191,
    opacity: 0.28,
  },
  loading: {
    height: 290,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameBlock: {
    alignItems: 'center',
    gap: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: V2Radius.full,
    borderWidth: 1,
  },
  badgeLocked: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderColor: 'rgba(255,255,255,0.32)',
  },
  badgeText: {
    fontFamily: V2Font.extraBold,
    fontSize: 11.5,
  },
  cardName: {
    fontFamily: V2Font.black,
    fontSize: 24,
    letterSpacing: -0.48,
    color: V2Colors.text,
  },
  progress: {
    alignSelf: 'stretch',
    gap: 8,
  },
  progressLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  progressLabel: {
    flexShrink: 1,
    fontFamily: V2Font.bold,
    fontSize: 13,
    color: V2Colors.textSecondary,
  },
  progressValue: {
    fontFamily: V2Font.extraBold,
    fontSize: 13,
    color: V2Colors.text,
  },
  track: {
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  fill: {
    height: 8,
    borderRadius: 999,
  },
  noteWrap: {
    height: 32,
    justifyContent: 'center',
  },
  note: {
    fontFamily: V2Font.semiBold,
    fontSize: 13,
    color: V2Colors.textSecondary,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 14,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dotActive: {
    width: 18,
  },
  // Nível ainda não alcançado, grande (Figma 04g: saturação −90%, exposição
  // −25%, opacidade 50%). O cinza vale no Android; no iOS, só a transparência.
  lockedArtLarge: {
    opacity: 0.5,
    filter: [{ grayscale: 0.9 }, { brightness: 0.75 }],
  },
  sectionTitle: {
    paddingTop: 26,
    paddingBottom: 12,
    fontFamily: V2Font.black,
    fontSize: 18,
    letterSpacing: -0.36,
    color: V2Colors.text,
  },
  list: {
    borderColor: V2Colors.surfaceBorderStrong,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowSelected: {
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  rowPressed: {
    opacity: 0.85,
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbLocked: {
    backgroundColor: V2Colors.surface,
    borderColor: V2Colors.surfaceBorderStrong,
  },
  // Nível ainda não alcançado: arte apagada e sem cor (o cinza vale no
  // Android; no iOS fica só a transparência).
  lockedArt: {
    opacity: 0.5,
    filter: [{ grayscale: 1 }],
  },
  lock: {
    position: 'absolute',
    left: 35,
    top: 35,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: V2Colors.sheetTop,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTexts: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  rowName: {
    fontFamily: V2Font.extraBold,
    fontSize: 15,
    color: V2Colors.text,
  },
  rowNameLocked: {
    color: V2Colors.textSecondary,
  },
  rowCaption: {
    fontFamily: V2Font.medium,
    fontSize: 12.5,
    color: V2Colors.textTertiary,
  },
  action: {
    paddingTop: 20,
  },
});
