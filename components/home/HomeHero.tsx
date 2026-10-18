import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { V2Font } from '@/constants/theme-v2';
import { useAccent } from '@/hooks/use-accent';
import { RADIAL_MASK, V2Icon } from '@/components/v2';
import { groupThousands, type LevelProgress } from '@/constants/pig-levels';

/** Valor do topo em dois trechos: "$250" + ".0482137", ou "≈ $296" + ".5512304". */
export interface HeroAmount {
  integer: string;
  fraction: string;
}

interface HomeHeroProps {
  /** Distância do topo da tela até a saudação (safe area + respiro). */
  paddingTop: number;
  label: string;
  /** null: sem número confiável (portfólio ou cotação indisponível). */
  amount: HeroAmount | null;
  level: LevelProgress;
  /** Legenda da barra, à esquerda ("$250 guardados", "≈ $296 · estimativa"). */
  legend: string;
  muted: boolean;
  onToggleMute: () => void;
  onPressMascot: () => void;
}

// Figma 04/04b/04c/04d: o inteiro reduz conforme cresce, para o valor nunca
// quebrar linha ao lado do mascote. Conta só os dígitos.
function amountSizes(integer: string) {
  const digits = integer.replace(/\D/g, '').length;
  if (digits <= 3) return { integer: 46, fraction: 18 };
  if (digits === 4) return { integer: 36, fraction: 16 };
  if (digits === 5) return { integer: 32, fraction: 15 };
  return { integer: 25, fraction: 13 };
}

const MASCOT_SLOT = 128;

/**
 * Cabeçalho da Home (Figma "Home · Tela", quadro "herói"): o total guardado,
 * o nível do porquinho com a barra até o próximo, e o mascote do nível.
 *
 * Fundo na cor do app, com um escurecido na base e um brilho branco atrás do
 * mascote. Sem react-native-svg, o brilho é a máscara radial tingida.
 */
function HomeHeroView({
  paddingTop,
  label,
  amount,
  level,
  legend,
  muted,
  onToggleMute,
  onPressMascot,
}: HomeHeroProps) {
  const accent = useAccent();
  const sizes = amountSizes(amount?.integer ?? '');
  const mascot = level.current.hero;

  return (
    <View style={[styles.shadow, { boxShadow: `0px 18px 44px ${accent.alpha(0.28)}` }]}>
      <View style={[styles.hero, { backgroundColor: accent.base, paddingTop }]}>
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(20,6,40,0)', 'rgba(20,6,40,0.22)']}
          locations={[0.45, 1]}
          style={StyleSheet.absoluteFill}
        />
        <Image
          pointerEvents="none"
          source={RADIAL_MASK}
          tintColor="#ffffff"
          contentFit="fill"
          style={styles.highlight}
        />

        <View style={styles.top}>
          <Text style={styles.greeting}>Oi, Investidor</Text>
          <View style={styles.divider} />
          <Pressable
            onPress={onToggleMute}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={muted ? 'Ligar o som' : 'Desligar o som'}
          >
            <V2Icon name={muted ? 'volume-off' : 'volume'} size={16} color="#ffffff" />
          </Pressable>
        </View>

        <View style={styles.body}>
          <View style={styles.info}>
            <View style={styles.labelRow}>
              <V2Icon name="piggy" size={13} color="#ffffff" />
              <Text style={styles.label} numberOfLines={1}>
                {label.toUpperCase()}
              </Text>
            </View>

            <Text
              style={styles.amountLine}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
              accessibilityLabel={amount ? `${amount.integer}${amount.fraction}` : 'Valor indisponível'}
            >
              <Text
                style={[
                  styles.integer,
                  { fontSize: sizes.integer, letterSpacing: sizes.integer * -0.03 },
                ]}
              >
                {amount ? amount.integer : '—'}
              </Text>
              {amount ? (
                <Text style={[styles.fraction, { fontSize: sizes.fraction }]}>{amount.fraction}</Text>
              ) : null}
            </Text>

            <View style={styles.levelBlock}>
              <Text style={styles.levelName} numberOfLines={1}>
                {level.current.label}
              </Text>
              <Text style={styles.levelGoal}>
                {!amount ? (
                  'Cotação temporariamente indisponível'
                ) : level.next ? (
                  <>
                    {'Faltam '}
                    <Text style={styles.levelGoalStrong}>${groupThousands(level.remaining)}</Text>
                    {` pra virar ${level.next.label}`}
                  </>
                ) : (
                  'Nível máximo do porquinho'
                )}
              </Text>
            </View>

            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  {
                    width: `${level.progress * 100}%`,
                    backgroundColor: accent.base,
                    boxShadow: `0px 0px 12px ${accent.alpha(0.48)}`,
                  },
                ]}
              />
            </View>

            <View style={styles.legend}>
              <Text style={styles.legendText} numberOfLines={1}>
                {legend}
              </Text>
              <Text style={styles.legendText} numberOfLines={1}>
                {level.next ? `meta $${groupThousands(level.next.minBalance)}` : 'meta máxima'}
              </Text>
            </View>
          </View>

          <Pressable
            onPress={onPressMascot}
            style={styles.mascotSlot}
            accessibilityRole="button"
            accessibilityLabel={`${level.current.label}. Ver a evolução do porquinho`}
          >
            <Image
              source={level.current.art}
              contentFit="contain"
              style={[
                styles.mascot,
                { width: mascot.width, height: mascot.height, left: (MASCOT_SLOT - mascot.width) / 2 },
              ]}
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export const HomeHero = memo(HomeHeroView);

const styles = StyleSheet.create({
  shadow: {
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
  },
  hero: {
    paddingHorizontal: 22,
    paddingBottom: 24,
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
    overflow: 'hidden',
  },
  // Figma: radial branco 16% → 0 em 62% do raio, centrado atrás do mascote
  // (85% da largura, 131 px do topo, raios 314 × 204).
  highlight: {
    position: 'absolute',
    left: '85%',
    top: 131,
    width: 390,
    height: 252,
    marginLeft: -195,
    marginTop: -126,
    opacity: 0.16,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  greeting: {
    fontFamily: V2Font.bold,
    fontSize: 14,
    color: '#ffffff',
  },
  divider: {
    width: 1,
    height: 14,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  body: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 14,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    flexShrink: 1,
    fontFamily: V2Font.extraBold,
    fontSize: 10.5,
    letterSpacing: 1.26,
    color: '#ffffff',
  },
  amountLine: {
    paddingTop: 6,
  },
  integer: {
    fontFamily: V2Font.black,
    color: '#ffffff',
    textShadowColor: 'rgba(40,0,60,0.3)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 18,
  },
  fraction: {
    fontFamily: V2Font.extraBold,
    color: 'rgba(255,255,255,0.8)',
  },
  levelBlock: {
    gap: 2,
    paddingTop: 10,
  },
  levelName: {
    fontFamily: V2Font.black,
    fontSize: 15,
    color: '#ffffff',
  },
  levelGoal: {
    fontFamily: V2Font.semiBold,
    fontSize: 12.5,
    color: '#ffffff',
  },
  levelGoalStrong: {
    fontFamily: V2Font.black,
  },
  track: {
    height: 8,
    marginTop: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(20,6,40,0.32)',
  },
  fill: {
    height: 8,
    borderRadius: 999,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    paddingTop: 7,
  },
  legendText: {
    flexShrink: 1,
    fontFamily: V2Font.semiBold,
    fontSize: 11.5,
    color: '#ffffff',
  },
  // A coluna tem a altura do texto; o mascote fica preso na base e, quando é
  // mais alto que ela (Esperto, Rei), passa do topo como no Figma.
  mascotSlot: {
    width: MASCOT_SLOT,
  },
  mascot: {
    position: 'absolute',
    bottom: 0,
  },
});
