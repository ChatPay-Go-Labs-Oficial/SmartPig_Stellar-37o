import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { V2Colors, V2Font, withAlpha } from '@/constants/theme-v2';
import { mascotBox, type PigLevel } from '@/constants/pig-levels';
import { useAccent } from '@/hooks/use-accent';
import type { ExperienceTier } from '@/lib/api/experience';
import { CircleGlow } from '../CircleGlow';
import { ProgressRing } from '../ProgressRing';
import { V2Icon } from '../V2Icon';
import { LevelDots } from './LevelDots';

// Figma "avatar" (36a): quadro 220×200 com a foto de 104 no centro.
const WIDTH = 220;
const HEIGHT = 200;
const GLOW = 230;
const PHOTO = 104;
const PHOTO_BORDER = 1.5;
const XP_RING = 124;
const BADGE = 36;
/**
 * Mascote na foto: o Esperto em 151 de altura, cortado pelo círculo (36a); o
 * Bebê, quadrado, na mesma largura, 83 (36d).
 */
const MASCOT_HEIGHT = 150;
const MASCOT_SQUARE = 83 / MASCOT_HEIGHT;

/** Brilhos em volta (Figma "v2/Ícone/sparkles"), em coordenadas do quadro. */
const SPARKLES = [
  { x: -8, y: 6, size: 16 },
  { x: 196, y: 30, size: 12 },
  { x: 206, y: 150, size: 10 },
  { x: 4, y: 160, size: 11 },
] as const;

interface LevelAvatarProps {
  level: number;
  tier: ExperienceTier;
  max: boolean;
  /** XP dentro do nível, 0–1. */
  fraction: number;
  /** O porquinho atual (pelo valor guardado) na foto. */
  pig: PigLevel;
}

/**
 * Moldura do Seu nível (Figma 36a, 36e, 36h): brilho, órbita, os pontos de
 * luz da etapa, o anel do XP dentro do nível, a foto com o porquinho e o selo
 * do nível.
 */
function LevelAvatarView({ level, tier, max, fraction, pig }: LevelAvatarProps) {
  const accent = useAccent();
  const art = mascotBox(pig, MASCOT_HEIGHT, MASCOT_SQUARE);

  return (
    <View style={styles.box} pointerEvents="none">
      <CircleGlow size={GLOW} style={styles.glow} />
      <View style={styles.orbit} />
      <View style={StyleSheet.absoluteFill}>
        <LevelDots level={level} tier={tier} max={max} variant="large" />
      </View>
      <View style={styles.ring}>
        <ProgressRing
          size={XP_RING}
          thickness={(XP_RING - PHOTO) / 2}
          progress={fraction}
          color={accent.base}
          trackColor="rgba(255,255,255,0.1)"
        />
      </View>
      <View style={[styles.photo, { borderColor: accent.alpha(0.32) }]}>
        <Image
          source={pig.art}
          contentFit="contain"
          style={{
            position: 'absolute',
            top: -4,
            left: (PHOTO - 2 * PHOTO_BORDER - art.width) / 2,
            width: art.width,
            height: art.height,
          }}
          accessibilityIgnoresInvertColors
        />
      </View>
      {/* No Nível 0 o selo fica apagado (36d); do 1 em diante, na cor do app. */}
      <View style={[styles.badge, { backgroundColor: level > 0 ? accent.base : V2Colors.surfaceDark }]}>
        <Text style={[styles.badgeText, level === 0 && styles.badgeTextIdle]}>{level}</Text>
      </View>
      {SPARKLES.map((sparkle) => (
        <View
          key={`${sparkle.x}-${sparkle.y}`}
          style={{ position: 'absolute', left: sparkle.x, top: sparkle.y }}
        >
          <V2Icon name="sparkles" size={sparkle.size} color={withAlpha(accent.light, 0.5)} />
        </View>
      ))}
    </View>
  );
}

export const LevelAvatar = memo(LevelAvatarView);

const styles = StyleSheet.create({
  box: {
    width: WIDTH,
    height: HEIGHT,
  },
  // Figma "brilho": círculo de 230, 5 à esquerda e 17 acima do quadro.
  glow: {
    position: 'absolute',
    left: -5,
    top: -17,
  },
  orbit: {
    position: 'absolute',
    left: 10,
    top: -2,
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  ring: {
    position: 'absolute',
    left: (WIDTH - XP_RING) / 2,
    top: 36,
  },
  photo: {
    position: 'absolute',
    left: (WIDTH - PHOTO) / 2,
    top: 46,
    width: PHOTO,
    height: PHOTO,
    borderRadius: PHOTO / 2,
    borderWidth: PHOTO_BORDER,
    backgroundColor: V2Colors.background,
    overflow: 'hidden',
  },
  // Figma "selo do nível": na base da foto, com a borda na cor do fundo.
  badge: {
    position: 'absolute',
    left: (WIDTH - BADGE) / 2,
    top: 140,
    width: BADGE,
    height: BADGE,
    borderRadius: BADGE / 2,
    borderWidth: 3,
    borderColor: V2Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontFamily: V2Font.black,
    fontSize: 15,
    color: V2Colors.onPrimary,
  },
  badgeTextIdle: {
    color: V2Colors.textSecondary,
  },
});
