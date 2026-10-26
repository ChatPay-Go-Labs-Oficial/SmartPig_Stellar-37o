import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { V2Colors } from '@/constants/theme-v2';
import { useAccent } from '@/hooks/use-accent';
import { CircleGlow } from '../CircleGlow';
import { V2Icon, type V2IconName } from '../V2Icon';

export type LessonStatus = 'done' | 'current' | 'locked';

const HALO = require('@/assets/images/v2/trilha-halo.png');
const RIBBONS = require('@/assets/images/v2/trilha-fitas.png');
const RIBBONS_OUTLINE = require('@/assets/images/v2/trilha-fitas-contorno.png');

/** Disco da lição (Figma "nó"): 76, com a base 6 abaixo. */
export const LESSON_NODE = 76;
const LESSON_DEPTH = 6;
/** Disco da conclusão do módulo: 92, com a base 7 abaixo. */
export const FINISH_NODE = 92;
const FINISH_DEPTH = 7;

const LOCKED_BASE = 'rgba(255,255,255,0.08)';

/** Brilhos em volta da conclusão feita (34d), em coordenadas do nó. */
const SPARKLES = [
  { x: -18, y: 4, size: 18 },
  { x: 98, y: 16, size: 14 },
  { x: 86, y: -14, size: 11 },
  { x: -6, y: 78, size: 10 },
] as const;

/**
 * Nó de lição (Figma "nó · feita / atual / bloqueada"): disco 3D na cor do
 * app sobre a base mais escura, reflexo e ícone. A atual ganha o brilho e o
 * anel; a feita, o selo verde; a bloqueada fica apagada, com cadeado.
 */
function LessonNodeView({ icon, status }: { icon: V2IconName; status: LessonStatus }) {
  const accent = useAccent();
  const locked = status === 'locked';
  return (
    <View style={styles.lesson}>
      {status === 'current' ? (
        <>
          <View style={[styles.currentGlow, { backgroundColor: accent.alpha(0.14) }]} />
          <View style={[styles.currentRing, { borderColor: accent.alpha(0.4) }]} />
        </>
      ) : null}
      <View
        style={[styles.disc, styles.lessonBase, { backgroundColor: locked ? LOCKED_BASE : accent.dark }]}
      />
      <View style={[styles.disc, locked ? styles.discLocked : { backgroundColor: accent.base }]} />
      <View style={[styles.lessonShine, locked ? styles.shineLocked : styles.shine]} />
      <View style={styles.lessonIcon}>
        <V2Icon name={icon} size={32} color={locked ? V2Colors.textTertiary : V2Colors.onPrimary} />
      </View>
      {status === 'done' ? (
        <View style={[styles.badge, styles.lessonBadge, styles.doneBadge]}>
          <V2Icon name="check" size={13} color={V2Colors.background} />
        </View>
      ) : locked ? (
        <View style={[styles.badge, styles.lessonBadge, styles.lockedBadge]}>
          <V2Icon name="lock" size={13} color={V2Colors.textSecondary} />
        </View>
      ) : null}
    </View>
  );
}

export const LessonNode = memo(LessonNodeView);

/**
 * Conclusão do módulo (Figma "conclusão · bloqueada / feita"): medalha com
 * fitas e troféu. Feita, ganha o brilho, a aura, o halo tracejado e os brilhos.
 */
function FinishNodeView({ done }: { done: boolean }) {
  const accent = useAccent();
  return (
    <View style={styles.finish}>
      {done ? (
        <>
          <CircleGlow size={172} opacity={0.85} style={styles.finishGlow} />
          <View style={[styles.finishAura, { backgroundColor: accent.alpha(0.14) }]} />
          <Image source={HALO} tintColor={accent.base} style={styles.finishHalo} />
          <Image source={RIBBONS} tintColor={accent.dark} style={styles.ribbons} />
        </>
      ) : (
        <>
          <Image source={RIBBONS} tintColor="#ffffff" style={[styles.ribbons, styles.ribbonsLocked]} />
          <Image
            source={RIBBONS_OUTLINE}
            tintColor="#ffffff"
            style={[styles.ribbons, styles.ribbonsOutline]}
          />
        </>
      )}
      <View
        style={[styles.finishDisc, styles.finishBase, { backgroundColor: done ? accent.dark : LOCKED_BASE }]}
      />
      <View style={[styles.finishDisc, done ? { backgroundColor: accent.base } : styles.discLocked]} />
      <View style={[styles.finishRing, done ? styles.finishRingDone : styles.finishRingLocked]} />
      <View style={[styles.finishShine, done ? styles.finishShineDone : styles.shineLocked]} />
      <View style={styles.finishIcon}>
        <V2Icon name="trophy" size={38} color={done ? V2Colors.onPrimary : V2Colors.textTertiary} />
      </View>
      {done ? (
        SPARKLES.map((sparkle) => (
          <View key={`${sparkle.x}-${sparkle.y}`} style={{ position: 'absolute', left: sparkle.x, top: sparkle.y }}>
            <V2Icon name="sparkles" size={sparkle.size} color={accent.light} />
          </View>
        ))
      ) : (
        <View style={[styles.badge, styles.finishBadge, styles.lockedBadge]}>
          <V2Icon name="lock" size={13} color={V2Colors.textSecondary} />
        </View>
      )}
    </View>
  );
}

export const FinishNode = memo(FinishNodeView);

const styles = StyleSheet.create({
  lesson: {
    width: LESSON_NODE,
    height: LESSON_NODE + LESSON_DEPTH,
  },
  // Figma: brilho de 112 e anel de 94, centrados entre o disco e a base.
  currentGlow: {
    position: 'absolute',
    left: -18,
    top: -15,
    width: 112,
    height: 112,
    borderRadius: 56,
  },
  currentRing: {
    position: 'absolute',
    left: -9,
    top: -6,
    width: 94,
    height: 94,
    borderRadius: 47,
    borderWidth: 2,
  },
  disc: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: LESSON_NODE,
    height: LESSON_NODE,
    borderRadius: LESSON_NODE / 2,
  },
  lessonBase: {
    top: LESSON_DEPTH,
  },
  discLocked: {
    backgroundColor: V2Colors.surfaceDark,
    borderWidth: 1,
    borderColor: V2Colors.chipBorder,
  },
  // Figma "reflexo": elipse 56×30 no alto do disco.
  lessonShine: {
    position: 'absolute',
    left: 10,
    top: 6 - (56 - 30) / 2,
    width: 56,
    height: 56,
    borderRadius: 28,
    transform: [{ scaleY: 30 / 56 }],
  },
  shine: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  shineLocked: {
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  lessonIcon: {
    position: 'absolute',
    left: 22,
    top: 22,
  },
  badge: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2.5,
    borderColor: V2Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lessonBadge: {
    left: 54,
    top: -2,
  },
  doneBadge: {
    backgroundColor: V2Colors.success,
  },
  lockedBadge: {
    backgroundColor: V2Colors.surfaceDark,
  },
  finish: {
    width: FINISH_NODE,
    height: FINISH_NODE + FINISH_DEPTH,
  },
  finishGlow: {
    position: 'absolute',
    left: -40,
    top: -40,
  },
  finishAura: {
    position: 'absolute',
    left: -18,
    top: -18,
    width: 128,
    height: 128,
    borderRadius: 64,
  },
  // Figma "halo": anel tracejado de 112, na cor do app a 40%.
  finishHalo: {
    position: 'absolute',
    left: -10,
    top: -10,
    width: 112,
    height: 112,
    opacity: 0.4,
  },
  // As duas fitas numa imagem só (gerada do Figma "faixa esquerda/direita").
  ribbons: {
    position: 'absolute',
    left: 10,
    top: 58,
    width: 72,
    height: 70,
  },
  ribbonsLocked: {
    opacity: 0.06,
  },
  ribbonsOutline: {
    opacity: 0.1,
  },
  finishDisc: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: FINISH_NODE,
    height: FINISH_NODE,
    borderRadius: FINISH_NODE / 2,
  },
  finishBase: {
    top: FINISH_DEPTH,
  },
  finishRing: {
    position: 'absolute',
    left: 10,
    top: 10,
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1.5,
  },
  finishRingDone: {
    borderColor: 'rgba(255,255,255,0.38)',
  },
  finishRingLocked: {
    borderColor: 'rgba(255,255,255,0.08)',
  },
  // Figma "reflexo": elipse 66×34.
  finishShine: {
    position: 'absolute',
    left: 13,
    top: 7 - (66 - 34) / 2,
    width: 66,
    height: 66,
    borderRadius: 33,
    transform: [{ scaleY: 34 / 66 }],
  },
  finishShineDone: {
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  finishIcon: {
    position: 'absolute',
    left: 27,
    top: 27,
  },
  finishBadge: {
    left: 68,
    top: 2,
  },
});
