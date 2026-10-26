import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { blendOver, V2Colors, V2Font, V2Radius, withAlpha } from '@/constants/theme-v2';
import { useAccent } from '@/hooks/use-accent';
import { ProgressRing, RADIAL_MASK, V2Icon, type V2IconName } from '@/components/v2';
import { LevelDots } from '@/components/v2/experience';
import { journeyTier, levelFraction } from '@/constants/experience-tiers';
import { mascotBox, type LevelProgress } from '@/constants/pig-levels';
import type { ExperienceProfile } from '@/lib/api/experience';

const ORBIT_DASHED = require('@/assets/images/v2/perfil-orbita-tracejada.png');
const ORBIT_DOTTED = require('@/assets/images/v2/perfil-orbita-pontilhada.png');

const GUTTER = 18;
const AVATAR = 104;
const PHOTO = 86;
const RING_THICKNESS = 5;
/** Figma "moldura · Iniciante": quadro de 144, 20 além do avatar de cada lado. */
const DOTS_BOX = 144;
/** Figma: o selo de nível sobe 13 sobre a base do anel. */
const PILL_OVERLAP = 13;
/**
 * Contorno do selo, na cor do fundo, recortando o anel. O Figma usa 3; no
 * aparelho ficou grosso demais (Matheus, 18/10/2026).
 */
const PILL_BORDER = 1.5;
/** Espaço entre o avatar e os textos (Figma "identidade"). */
const IDENTITY_GAP = 16;
/** Altura do mascote na foto (Figma: o Esperto em 124, cortado pelo círculo). */
const MASCOT_HEIGHT = 124;
/** Figma: o conteúdo começa a 64 do topo do quadro; as estrelas contam dali. */
const FIGMA_TOP = 64;
const FIGMA_WIDTH = 393;

/** Estrelas da capa (Figma "v2/Cabeçalho do Perfil"), em coordenadas do quadro. */
const STARS = [
  { x: 214, y: 22, size: 3 },
  { x: 262, y: 58, size: 4 },
  { x: 330, y: 36, size: 2.4 },
  { x: 364, y: 92, size: 3 },
  { x: 300, y: 118, size: 2 },
  { x: 236, y: 96, size: 2.4 },
  { x: 372, y: 150, size: 2.4 },
  { x: 190, y: 40, size: 2 },
  { x: 150, y: 16, size: 2.4 },
  { x: 282, y: 160, size: 2 },
] as const;

export interface ProfileStat {
  /** null: sem número confiável ainda. */
  value: string | null;
  label: string;
  /** Ícone do selo, na cor do app. */
  icon: V2IconName;
}

interface ProfileHeaderProps {
  /** Distância do topo da tela até a linha da foto (safe area + respiro). */
  paddingTop: number;
  name: string;
  verified: boolean;
  /** Porquinho atual, pelo valor guardado: a foto e o subtítulo. */
  level: LevelProgress;
  /** "set. 2026"; sem data, só o porquinho. */
  since: string | null;
  /** Nível de Usuário; undefined enquanto não chega. */
  experience: ExperienceProfile | undefined;
  /** Toque no nível: abre o Seu nível. */
  onOpenLevel: () => void;
  stats: readonly ProfileStat[];
}

/** Círculo de `size` com centro no centro da foto (serve a View e a Image). */
function aroundAvatar(size: number, paddingTop: number) {
  return {
    position: 'absolute' as const,
    width: size,
    height: size,
    borderRadius: size / 2,
    left: GUTTER + AVATAR / 2 - size / 2,
    top: paddingTop + AVATAR / 2 - size / 2,
  };
}

/** Linha do XP embaixo do subtítulo (Figma 38i): etapa e quanto falta. */
function xpLine(experience: ExperienceProfile): string {
  const tier = journeyTier(experience.tier).label;
  if (experience.xpToNextLevel === null) return `${tier} · Nível máximo atingido`;
  return `${tier} · ${experience.xpToNextLevel} XP para o Nível ${experience.level + 1}`;
}

/**
 * Cabeçalho do Perfil (Figma "v2/Cabeçalho do Perfil", 38i): a foto com o
 * porquinho atual, a moldura e o anel do Nível de Usuário, o nome com o selo
 * de verificado, o porquinho e o XP que falta, e a faixa de números. Capa com
 * o brilho da cor do app, órbitas e estrelas, centradas na foto, e um
 * esmaecido na base que a funde com a tela.
 *
 * O nível e a linha do XP abrem o Seu nível. A Chama fica de fora do Meridian;
 * sem ela, a faixa de números segue o cartão "Saldo na carteira" da Home
 * (selo, legenda e valor).
 */
function ProfileHeaderView({
  paddingTop,
  name,
  verified,
  level,
  since,
  experience,
  onOpenLevel,
  stats,
}: ProfileHeaderProps) {
  const accent = useAccent();
  const pig = level.current;
  const art = mascotBox(pig, MASCOT_HEIGHT);

  return (
    <View style={styles.header}>
      {/* Capa, por baixo do esmaecido; o cabeçalho corta o que passa da borda. */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {STARS.map((star) => (
          <View
            key={`${star.x}-${star.y}`}
            style={[
              styles.star,
              {
                left: `${(star.x / FIGMA_WIDTH) * 100}%`,
                top: paddingTop - FIGMA_TOP + star.y,
                width: star.size,
                height: star.size,
                borderRadius: star.size / 2,
              },
            ]}
          />
        ))}
        <Image
          source={RADIAL_MASK}
          tintColor={accent.base}
          contentFit="fill"
          style={[aroundAvatar(420, paddingTop), styles.glow]}
        />
        <View style={[aroundAvatar(136, paddingTop), styles.orbitInner]} />
        <Image source={ORBIT_DASHED} contentFit="fill" style={aroundAvatar(196, paddingTop)} />
        <View style={[aroundAvatar(276, paddingTop), styles.orbitOuter]} />
        <Image source={ORBIT_DOTTED} contentFit="fill" style={aroundAvatar(372, paddingTop)} />
        <LinearGradient
          colors={[withAlpha(V2Colors.background, 0), V2Colors.background]}
          style={styles.fade}
        />
      </View>

      <View style={[styles.content, { paddingTop }]}>
        <View style={styles.identity}>
          <Pressable
            onPress={onOpenLevel}
            style={({ pressed }) => [styles.avatar, pressed && styles.avatarPressed]}
            accessibilityRole="button"
            accessibilityLabel={
              experience ? `Nível ${experience.level}. Ver seu nível` : 'Ver seu nível'
            }
          >
            <View style={styles.ringBox}>
              {experience ? (
                <View style={styles.dots}>
                  <LevelDots
                    level={experience.level}
                    tier={experience.tier}
                    max={experience.xpToNextLevel === null}
                    variant="small"
                  />
                </View>
              ) : null}
              <ProgressRing
                size={AVATAR}
                thickness={RING_THICKNESS}
                progress={experience ? levelFraction(experience) : 0}
                color={accent.base}
                trackColor="rgba(255,255,255,0.1)"
              />
              <View
                style={[
                  styles.photo,
                  {
                    borderColor: withAlpha(accent.base, 0.32),
                    backgroundColor: blendOver(accent.base, 0.16, V2Colors.background),
                  },
                ]}
              >
                <Image
                  source={pig.art}
                  contentFit="contain"
                  style={{
                    position: 'absolute',
                    top: -3,
                    left: (PHOTO - 2 - art.width) / 2,
                    width: art.width,
                    height: art.height,
                  }}
                  accessibilityIgnoresInvertColors
                />
              </View>
            </View>
            <View style={[styles.levelPill, { backgroundColor: accent.base }]}>
              <Text style={styles.levelPillText}>
                {experience ? `Nível ${experience.level}` : 'Nível —'}
              </Text>
            </View>
          </Pressable>

          <View style={styles.texts}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>
                {name}
              </Text>
              {verified ? (
                <View
                  style={[styles.verified, { backgroundColor: accent.base }]}
                  accessibilityLabel="Identidade verificada"
                >
                  <V2Icon name="check" size={12} color={V2Colors.onPrimary} />
                </View>
              ) : null}
            </View>
            <Text style={styles.subtitle}>
              {since ? `${pig.label} · desde ${since}` : pig.label}
            </Text>
            {experience ? (
              <Pressable onPress={onOpenLevel} hitSlop={6} accessibilityRole="button">
                <Text style={styles.goal}>{xpLine(experience)}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={styles.stats}>
          {stats.map((stat, index) => (
            <View key={stat.label} style={styles.statSlot}>
              {index > 0 ? <View style={styles.statDivider} /> : null}
              <View style={styles.stat}>
                <View style={[styles.statSeal, { backgroundColor: accent.alpha(0.14) }]}>
                  <V2Icon name={stat.icon} size={20} color={accent.base} />
                </View>
                <View style={styles.statTexts}>
                  <Text style={styles.statLabel} numberOfLines={1}>
                    {stat.label}
                  </Text>
                  <Text
                    style={styles.statValue}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                  >
                    {stat.value ?? '—'}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

export const ProfileHeader = memo(ProfileHeaderView);

const styles = StyleSheet.create({
  header: {
    backgroundColor: V2Colors.background,
    overflow: 'hidden',
  },
  star: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  glow: {
    opacity: 0.4,
  },
  orbitInner: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  orbitOuter: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  // Figma "fade": 120 de altura, do transparente ao fundo, na base da capa.
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 120,
  },
  content: {
    paddingHorizontal: GUTTER,
    paddingBottom: 22,
    gap: 18,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: IDENTITY_GAP,
  },
  avatar: {
    width: AVATAR,
    alignItems: 'center',
  },
  ringBox: {
    width: AVATAR,
    height: AVATAR,
  },
  // Figma "moldura · Iniciante": os pontos de luz em volta do anel.
  dots: {
    position: 'absolute',
    left: (AVATAR - DOTS_BOX) / 2,
    top: (AVATAR - DOTS_BOX) / 2,
  },
  // Figma: a foto de 86 no centro do anel de 104.
  photo: {
    position: 'absolute',
    top: (AVATAR - PHOTO) / 2,
    left: (AVATAR - PHOTO) / 2,
    width: PHOTO,
    height: PHOTO,
    borderRadius: PHOTO / 2,
    borderWidth: 1,
    overflow: 'hidden',
  },
  // Figma "nível": na base do anel, com a borda na cor do fundo recortando-o.
  levelPill: {
    marginTop: -PILL_OVERLAP,
    paddingHorizontal: 11,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: PILL_BORDER,
    borderColor: V2Colors.background,
  },
  levelPillText: {
    fontFamily: V2Font.black,
    fontSize: 12,
    lineHeight: 14,
    letterSpacing: -0.12,
    textAlign: 'center',
    color: V2Colors.onPrimary,
  },
  texts: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  name: {
    flexShrink: 1,
    fontFamily: V2Font.black,
    fontSize: 24,
    letterSpacing: -0.72,
    color: V2Colors.text,
  },
  verified: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    fontFamily: V2Font.medium,
    fontSize: 13,
    color: V2Colors.textSecondary,
  },
  // Figma: 2 de espaço a mais antes da linha de XP.
  goal: {
    marginTop: 2,
    fontFamily: V2Font.semiBold,
    fontSize: 12,
    color: V2Colors.textTertiary,
  },
  avatarPressed: {
    opacity: 0.85,
  },
  // Mesmo desenho do cartão "Saldo na carteira" da Home, dividido em dois.
  stats: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: V2Radius.list,
    borderWidth: 1,
    borderColor: V2Colors.surfaceBorderStrong,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  statSlot: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    marginRight: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  stat: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statSeal: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statTexts: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  statLabel: {
    fontFamily: V2Font.medium,
    fontSize: 12.5,
    color: V2Colors.textSecondary,
  },
  statValue: {
    fontFamily: V2Font.black,
    fontSize: 20,
    letterSpacing: -0.4,
    color: V2Colors.text,
  },
});
