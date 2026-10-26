import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { journeyTier, levelFraction, levelSpan } from '@/constants/experience-tiers';
import { mascotBox, type PigLevel } from '@/constants/pig-levels';
import { V2Colors, V2Font, V2Radius } from '@/constants/theme-v2';
import { useAccent } from '@/hooks/use-accent';
import type { ExperienceProfile } from '@/lib/api/experience';
import { XpBar } from '../experience/XpBar';
import { ProgressRing } from '../ProgressRing';
import { CardGlow } from '../CardGlow';
import { V2Icon } from '../V2Icon';

// Card de nível (Figma 34j "nível"): anel de 64 com a foto de 52 e o selo.
const AVATAR = 64;
const PHOTO = 52;
const PHOTO_BORDER = 1;
/** Mascote na foto: o Esperto em 75,4 de altura, cortado; o Bebê na mesma largura. */
const MASCOT_HEIGHT = 75.4;
const MASCOT_SQUARE = 41.5 / MASCOT_HEIGHT;

interface TrailLevelCardProps {
  profile: ExperienceProfile;
  pig: PigLevel;
  onPress: () => void;
}

/**
 * Nível no topo da Trilha (Figma 34j, sem a Chama): o porquinho na foto com o
 * anel do XP e o selo do nível, nível e etapa, a régua e quanto falta. O toque
 * abre o Seu nível.
 */
function TrailLevelCardView({ profile, pig, onPress }: TrailLevelCardProps) {
  const accent = useAccent();
  const tier = journeyTier(profile.tier);
  const span = levelSpan(profile);
  const art = mascotBox(pig, MASCOT_HEIGHT, MASCOT_SQUARE);
  const xpText = span === null ? 'Nível máximo atingido' : `${profile.xpIntoLevel}/${span} XP`;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.levelCard, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Nível ${profile.level}, ${tier.label}. ${xpText}. Ver seu nível`}
    >
      <View style={styles.avatar}>
        <ProgressRing
          size={AVATAR}
          thickness={(AVATAR - PHOTO) / 2}
          progress={levelFraction(profile)}
          color={accent.base}
          trackColor="rgba(255,255,255,0.1)"
        />
        <View style={[styles.photo, { borderColor: accent.alpha(0.32) }]}>
          <Image
            source={pig.art}
            contentFit="contain"
            style={{
              position: 'absolute',
              top: -2.2,
              left: (PHOTO - 2 * PHOTO_BORDER - art.width) / 2,
              width: art.width,
              height: art.height,
            }}
            accessibilityIgnoresInvertColors
          />
        </View>
        {/* No Nível 0 o selo fica apagado (34a); do 1 em diante, na cor do app. */}
        <View
          style={[styles.badge, { backgroundColor: profile.level > 0 ? accent.base : V2Colors.surfaceDark }]}
        >
          <Text style={[styles.badgeText, profile.level === 0 && styles.badgeTextIdle]}>
            {profile.level}
          </Text>
        </View>
      </View>
      <View style={styles.levelTexts}>
        <View style={styles.levelRow}>
          <Text style={styles.levelTitle}>Nível {profile.level}</Text>
          <View
            style={[styles.tierPill, { backgroundColor: accent.alpha(0.14), borderColor: accent.alpha(0.32) }]}
          >
            <V2Icon name={tier.icon} size={11} color={accent.light} />
            <Text style={[styles.tierText, { color: accent.light }]}>{tier.label}</Text>
          </View>
        </View>
        <XpBar fraction={levelFraction(profile)} size="trail" />
        <View style={styles.numbers}>
          <Text style={styles.xp}>{xpText}</Text>
          {span !== null ? (
            <Text style={styles.remaining} numberOfLines={1}>
              {profile.xpToNextLevel} XP para o Nível {profile.level + 1}
            </Text>
          ) : null}
        </View>
      </View>
      <V2Icon name="chevron-right" size={18} color={V2Colors.textTertiary} />
    </Pressable>
  );
}

export const TrailLevelCard = memo(TrailLevelCardView);

interface TrailModuleCardProps {
  title: string | null;
  done: number;
  total: number;
}

/** Módulo da trilha (Figma 34a "módulo"): nome, régua e "2 de 5 lições". */
function TrailModuleCardView({ title, done, total }: TrailModuleCardProps) {
  const accent = useAccent();
  const fraction = total > 0 ? done / total : 0;
  return (
    <View
      style={[styles.moduleCard, { borderColor: accent.alpha(0.32) }]}
      accessible
      accessibilityLabel={`${title ?? 'Trilha de aprendizado'}. ${done} de ${total} lições`}
    >
      <CardGlow />
      <View style={styles.moduleHeader}>
        <View style={[styles.moduleSeal, { backgroundColor: accent.alpha(0.14), borderColor: accent.alpha(0.32) }]}>
          <V2Icon name="graduation" size={26} color={accent.light} />
        </View>
        <View style={styles.moduleTexts}>
          <Text style={[styles.moduleKicker, { color: accent.light }]}>TRILHA DE APRENDIZADO</Text>
          {title ? <Text style={styles.moduleTitle}>{title}</Text> : null}
        </View>
      </View>
      <View style={styles.moduleProgress}>
        <View style={styles.moduleTrack}>
          <View
            style={[styles.moduleFill, { width: `${fraction * 100}%`, backgroundColor: accent.base }]}
          />
        </View>
        <Text style={styles.moduleCount}>
          {done} de {total} lições
        </Text>
      </View>
    </View>
  );
}

export const TrailModuleCard = memo(TrailModuleCardView);

interface DictionaryShortcutProps {
  title: string;
  onPress: () => void;
}

/** Atalho do Dicionário (Figma 34j), abaixo do módulo. */
function DictionaryShortcutView({ title, onPress }: DictionaryShortcutProps) {
  const accent = useAccent();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.shortcut,
        { borderColor: accent.alpha(0.32) },
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
    >
      <CardGlow />
      <View style={styles.shortcutSeal}>
        <V2Icon name="book" size={20} color={V2Colors.onPrimary} />
      </View>
      <View style={styles.shortcutTexts}>
        <Text style={styles.shortcutTitle}>{title}</Text>
        <Text style={styles.shortcutText}>Palavras da trilha, para consultar quando quiser</Text>
      </View>
      <V2Icon name="chevron-right" size={18} color={V2Colors.textTertiary} />
    </Pressable>
  );
}

export const DictionaryShortcut = memo(DictionaryShortcutView);

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.85,
  },
  // Figma: radial em (50%, 28,6%) com raios de 111% da meia largura e 35,7%
  // da altura; a máscara (1 − r) a 24% faz a parada 24% → 0.
  levelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: V2Radius.list,
    borderWidth: 1,
    borderColor: V2Colors.surfaceBorderStrong,
    backgroundColor: V2Colors.surface,
  },
  avatar: {
    width: AVATAR,
    height: 72,
  },
  photo: {
    position: 'absolute',
    left: (AVATAR - PHOTO) / 2,
    top: (AVATAR - PHOTO) / 2,
    width: PHOTO,
    height: PHOTO,
    borderRadius: PHOTO / 2,
    borderWidth: PHOTO_BORDER,
    backgroundColor: V2Colors.background,
    overflow: 'hidden',
  },
  // Figma "selo do nível": 26, na base da foto, com a borda na cor do fundo.
  badge: {
    position: 'absolute',
    left: 19,
    top: 50,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2.5,
    borderColor: V2Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontFamily: V2Font.black,
    fontSize: 12,
    color: V2Colors.onPrimary,
  },
  badgeTextIdle: {
    color: V2Colors.textSecondary,
  },
  levelTexts: {
    flex: 1,
    minWidth: 0,
    gap: 8,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  levelTitle: {
    fontFamily: V2Font.black,
    fontSize: 17,
    color: V2Colors.text,
  },
  tierPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingLeft: 8,
    paddingRight: 9,
    paddingVertical: 3,
    borderRadius: V2Radius.full,
    borderWidth: 1,
  },
  tierText: {
    fontFamily: V2Font.extraBold,
    fontSize: 11,
  },
  numbers: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  xp: {
    fontFamily: V2Font.bold,
    fontSize: 12,
    color: V2Colors.textSecondary,
  },
  remaining: {
    flexShrink: 1,
    fontFamily: V2Font.semiBold,
    fontSize: 12,
    color: V2Colors.textTertiary,
  },
  moduleCard: {
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderRadius: V2Radius.card,
    borderWidth: 1,
    backgroundColor: V2Colors.surface,
    overflow: 'hidden',
  },
  moduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  moduleSeal: {
    width: 48,
    height: 48,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleTexts: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  moduleKicker: {
    fontFamily: V2Font.extraBold,
    fontSize: 10.5,
    letterSpacing: 1.68,
  },
  moduleTitle: {
    fontFamily: V2Font.black,
    fontSize: 19,
    color: V2Colors.onPrimary,
  },
  moduleProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  moduleTrack: {
    flex: 1,
    height: 8,
    borderRadius: V2Radius.full,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  moduleFill: {
    height: 8,
    borderRadius: V2Radius.full,
  },
  moduleCount: {
    fontFamily: V2Font.extraBold,
    fontSize: 12.5,
    color: V2Colors.textSecondary,
  },
  shortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 16,
    paddingRight: 14,
    paddingVertical: 14,
    borderRadius: V2Radius.card,
    borderWidth: 1,
    backgroundColor: V2Colors.surface,
    overflow: 'hidden',
  },
  shortcutSeal: {
    width: 40,
    height: 40,
    borderRadius: V2Radius.icon,
    borderWidth: 1,
    borderColor: V2Colors.surfaceBorderStrong,
    backgroundColor: V2Colors.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutTexts: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  shortcutTitle: {
    fontFamily: V2Font.extraBold,
    fontSize: 15,
    lineHeight: 18.75,
    color: V2Colors.text,
  },
  shortcutText: {
    fontFamily: V2Font.medium,
    fontSize: 13.5,
    color: V2Colors.textSecondary,
  },
});
