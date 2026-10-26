import { Fragment, memo, useMemo } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
} from 'react-native';
import { Image } from 'expo-image';
import { V2Colors, V2Font } from '@/constants/theme-v2';
import { lessonIcon } from '@/constants/learning-trail';
import { mascotBox, type PigLevel } from '@/constants/pig-levels';
import { useAccent } from '@/hooks/use-accent';
import { AssetIcon, type AssetLogoId } from '../AssetIcon';
import { CircleGlow } from '../CircleGlow';
import { V2Icon } from '../V2Icon';
import { FINISH_NODE, FinishNode, LESSON_NODE, LessonNode, type LessonStatus } from './TrailNode';

// Medidas do Figma "caminho" (34a, 34j e 34g), na largura da coluna.
const SHIFT = 60;
/** Centro, direita, centro, esquerda: o zigue-zague das lições. */
const ZIGZAG = [0, 1, 0, -1] as const;
const TOP = 26;
/** Com o balão "Começar" na primeira lição, tudo desce 40 (34a). */
const BALLOON_SPACE = 40;
const LABELS_TOP = 100;
const LABELS_HEIGHT = 52;
/** Dos rótulos ao próximo nó; para a conclusão, 42; um marco no meio soma 62. */
const STEP_GAP = 58;
const FINISH_GAP = 42;
const MILESTONE_GAP = 62;
const MILESTONE_TOP = 26;
/**
 * Lição atual logo depois de um marco (sem quadro no Figma): o balão ficaria
 * a 5 da pílula do marco, parecendo parte dela; desce mais 24.
 */
const BALLOON_AFTER_MILESTONE = 24;
const FINISH_LABELS_TOP = 136;
const END_GAP = 36;
const END_HEIGHT = 16;
const END_BOTTOM = 6;
/** A ligação sai 10 abaixo dos rótulos e entra 10 abaixo do topo do próximo nó. */
const LINE_INSET = 10;
const LINE = 3;
/** Estrada de fundo: traço de 34, branco a 3,5%, de centro a centro dos nós. */
const ROAD = 34;
const ROAD_OPACITY = 0.035;
/**
 * O balão fica 51 acima do nó atual. A ligação que chega nele termina 6 abaixo
 * do topo do balão (no Figma, uma linha quase reta até a pílula).
 */
const BALLOON_RISE = 51;
const BALLOON_LINE_END = 6;
const BALLOON_BOX = 160;
/** Mascote ao lado do nó atual (ou da conclusão feita), pés na plataforma. */
const COMPANION_HEIGHT = 109.5;
const COMPANION_SQUARE = 72 / COMPANION_HEIGHT;
const LABEL_MAX_WIDTH = 260;

/** Curvas geradas do Figma (traço da ligação e da estrada), por altura. */
const LINE_IMAGES = [
  { height: 58, source: require('@/assets/images/v2/trilha-ligacao-curta.png') },
  { height: 120, source: require('@/assets/images/v2/trilha-ligacao-longa.png') },
];
const ROAD_IMAGES = [
  { height: 210, source: require('@/assets/images/v2/trilha-estrada-curta.png') },
  { height: 272, source: require('@/assets/images/v2/trilha-estrada-longa.png') },
];

/** Os dois brilhos do fundo, presos à 2ª e à 4ª lição (34j). */
const GLOWS = [
  { anchor: 1, dx: 90, size: 320, rise: 102, opacity: 0.35 },
  { anchor: 3, dx: -90, size: 300, rise: 92, opacity: 0.3 },
] as const;

/** Estrelas do fundo, em fração da largura e da altura do caminho. */
const STARS = [
  [0.06, 0.03, 2, 0.35],
  [0.92, 0.06, 3, 0.4],
  [0.18, 0.12, 2, 0.25],
  [0.78, 0.17, 2, 0.3],
  [0.03, 0.24, 3, 0.3],
  [0.95, 0.28, 2, 0.35],
  [0.22, 0.35, 2, 0.2],
  [0.88, 0.41, 3, 0.35],
  [0.05, 0.47, 2, 0.3],
  [0.7, 0.52, 2, 0.25],
  [0.96, 0.58, 2, 0.3],
  [0.12, 0.62, 3, 0.35],
  [0.84, 0.68, 2, 0.3],
  [0.02, 0.74, 2, 0.25],
  [0.93, 0.8, 3, 0.35],
  [0.16, 0.86, 2, 0.3],
  [0.8, 0.9, 2, 0.25],
  [0.06, 0.95, 3, 0.3],
] as const;

export interface TrailLesson {
  key: string;
  title: string;
  /** Ordem na trilha ("LIÇÃO 1"). */
  number: number;
  xp: number;
  status: LessonStatus;
}

export interface TrailMilestoneState {
  afterLesson: string;
  asset: AssetLogoId;
  name: string;
  unlocked: boolean;
}

interface TrailPathProps {
  /** Largura da coluna. */
  width: number;
  lessons: readonly TrailLesson[];
  milestones: readonly TrailMilestoneState[];
  moduleTitle: string | null;
  moduleXp: number | null;
  /** O porquinho atual: o mascote que acompanha a trilha. */
  pig: PigLevel;
  /** Abre a lição. Sem ele, os nós não respondem ao toque. */
  onOpenLesson?: (lessonKey: string) => void;
}

interface Point {
  x: number;
  y: number;
}

interface LessonSpot {
  lesson: TrailLesson;
  x: number;
  top: number;
  labelsBottom: number;
  milestone: { item: TrailMilestoneState; top: number } | null;
}

/**
 * Posição de cada nó, dos marcos e da conclusão (Figma 34a, 34j e 34g). Os
 * rótulos crescem com a fonte do aparelho; o resto do caminho desce junto.
 */
function layoutTrail(
  width: number,
  fontScale: number,
  lessons: readonly TrailLesson[],
  milestones: readonly TrailMilestoneState[],
) {
  const center = width / 2;
  const labelsHeight = Math.ceil(LABELS_HEIGHT * Math.max(1, fontScale));
  let y = TOP + (lessons[0]?.status === 'current' ? BALLOON_SPACE : 0);
  const spots: LessonSpot[] = lessons.map((lesson, index) => {
    const top = y;
    const labelsBottom = top + LABELS_TOP + labelsHeight;
    const item = milestones.find((milestone) => milestone.afterLesson === lesson.key);
    const last = index === lessons.length - 1;
    const balloonNext = lessons[index + 1]?.status === 'current';
    y =
      labelsBottom +
      (last ? FINISH_GAP : STEP_GAP) +
      (item ? MILESTONE_GAP + (balloonNext ? BALLOON_AFTER_MILESTONE : 0) : 0);
    return {
      lesson,
      x: center + ZIGZAG[index % ZIGZAG.length] * SHIFT,
      top,
      labelsBottom,
      milestone: item ? { item, top: labelsBottom + MILESTONE_TOP } : null,
    };
  });
  const finishTop = y;
  const finishLabelsTop = finishTop + FINISH_LABELS_TOP;
  const endTop = finishLabelsTop + labelsHeight + END_GAP;
  return {
    center,
    spots,
    finishTop,
    finishLabelsTop,
    endTop,
    height: endTop + Math.ceil(END_HEIGHT * Math.max(1, fontScale)) + END_BOTTOM,
  };
}

/**
 * O caminho da Trilha (Figma 34a a 34j): as lições em zigue-zague sobre a
 * estrada, ligadas por linhas (na cor do app depois de uma lição feita), os
 * marcos de liberação do Lite, o balão "Começar" e o mascote na lição atual,
 * e a conclusão do módulo no fim.
 */
function TrailPathView({
  width,
  lessons,
  milestones,
  moduleTitle,
  moduleXp,
  pig,
  onOpenLesson,
}: TrailPathProps) {
  const accent = useAccent();
  const { fontScale } = useWindowDimensions();
  const plan = useMemo(
    () => layoutTrail(width, fontScale, lessons, milestones),
    [width, fontScale, lessons, milestones],
  );
  const { center, spots, finishTop } = plan;
  const finishDone = lessons.length > 0 && lessons.every((lesson) => lesson.status === 'done');
  const current = spots.find((spot) => spot.lesson.status === 'current');

  const centers: Point[] = [
    ...spots.map((spot) => ({ x: spot.x, y: spot.top + LESSON_NODE / 2 })),
    { x: center, y: finishTop + FINISH_NODE / 2 },
  ];
  const links = spots.map((spot, index) => {
    const next = spots[index + 1];
    const to: Point = next
      ? {
          x: next.x,
          y:
            next.lesson.status === 'current'
              ? next.top - BALLOON_RISE + BALLOON_LINE_END
              : next.top + LINE_INSET,
        }
      : { x: center, y: finishTop + LINE_INSET };
    return { from: { x: spot.x, y: spot.labelsBottom + LINE_INSET }, to, done: spot.lesson.status === 'done' };
  });

  return (
    <View style={{ width, height: plan.height }}>
      {GLOWS.map((glow) => {
        const anchor = spots[glow.anchor];
        if (!anchor) return null;
        return (
          <CircleGlow
            key={glow.anchor}
            size={glow.size}
            opacity={glow.opacity}
            style={{
              position: 'absolute',
              left: center + glow.dx - glow.size / 2,
              top: anchor.top - glow.rise,
            }}
          />
        );
      })}
      {STARS.map(([fx, fy, size, opacity]) => (
        <View
          key={`${fx}-${fy}`}
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: fx * width,
            top: fy * plan.height,
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: '#ffffff',
            opacity,
          }}
        />
      ))}

      {centers.slice(1).map((to, index) => (
        <Stroke
          key={`estrada-${index}`}
          from={centers[index]}
          to={to}
          thickness={ROAD}
          images={ROAD_IMAGES}
          color="#ffffff"
          opacity={ROAD_OPACITY}
        />
      ))}
      {links.map((link, index) => (
        <Stroke
          key={`ligacao-${index}`}
          from={link.from}
          to={link.to}
          thickness={LINE}
          images={LINE_IMAGES}
          color={link.done ? accent.base : '#ffffff'}
          opacity={link.done ? 1 : 0.14}
        />
      ))}

      {spots.map((spot) => {
        const { lesson } = spot;
        const locked = lesson.status === 'locked';
        const pressable = !!onOpenLesson && !locked;
        const label = `Lição ${lesson.number}, ${lesson.title}. ${
          lesson.status === 'done' ? 'Concluída' : locked ? 'Bloqueada' : 'Lição atual'
        }. Mais ${lesson.xp} XP`;
        const node = <LessonNode icon={lessonIcon(lesson.key)} status={lesson.status} />;
        return (
          <Fragment key={lesson.key}>
            <Platform x={spot.x} top={spot.top + 70} width={100} height={24} lit={!locked} />
            {pressable ? (
              <Pressable
                onPress={() => onOpenLesson?.(lesson.key)}
                style={[styles.node, { left: spot.x - LESSON_NODE / 2, top: spot.top }]}
                accessibilityRole="button"
                accessibilityLabel={label}
              >
                {node}
              </Pressable>
            ) : (
              <View
                style={[styles.node, { left: spot.x - LESSON_NODE / 2, top: spot.top }]}
                accessible
                accessibilityLabel={label}
              >
                {node}
              </View>
            )}
            <Labels
              x={spot.x}
              top={spot.top + LABELS_TOP}
              pathWidth={width}
              kicker={lesson.status === 'done' ? 'CONCLUÍDA' : `LIÇÃO ${lesson.number}`}
              kickerDone={lesson.status === 'done'}
              title={lesson.title}
              xp={lesson.xp}
              dim={locked}
            />
            {spot.milestone ? <Milestone top={spot.milestone.top} item={spot.milestone.item} /> : null}
          </Fragment>
        );
      })}

      <Platform x={center} top={finishTop + 92} width={132} height={28} lit={finishDone} />
      <View
        style={[styles.node, { left: center - FINISH_NODE / 2, top: finishTop }]}
        accessible
        accessibilityLabel={`${moduleTitle ?? 'Módulo'}. ${finishDone ? 'Módulo concluído' : 'Conclusão do módulo'}`}
      >
        <FinishNode done={finishDone} />
      </View>
      <Labels
        x={center}
        top={plan.finishLabelsTop}
        pathWidth={width}
        kicker={finishDone ? 'MÓDULO CONCLUÍDO' : 'CONCLUSÃO DO MÓDULO'}
        kickerDone={finishDone}
        title={moduleTitle}
        xp={moduleXp}
        dim={!finishDone}
      />

      {current ? (
        <Balloon
          x={current.x}
          top={current.top - BALLOON_RISE}
          onPress={onOpenLesson ? () => onOpenLesson(current.lesson.key) : undefined}
        />
      ) : null}
      {current ? (
        <Companion pig={pig} left={current.x + 56} bottom={current.top + 80} />
      ) : finishDone ? (
        <Companion pig={pig} left={center + 70} bottom={finishTop + 92} />
      ) : null}

      <View style={[styles.end, { top: plan.endTop }]} pointerEvents="none">
        <V2Icon name="sparkles" size={16} color={V2Colors.textTertiary} />
        <Text style={styles.endText}>Mais trilhas chegando em breve</Text>
      </View>
    </View>
  );
}

export const TrailPath = memo(TrailPathView);

/**
 * Traço entre dois pontos: reto (mesmo x), quase reto (a ligação até o balão)
 * ou a curva em S do Figma, espelhada quando vai para a esquerda.
 */
function Stroke({
  from,
  to,
  thickness,
  images,
  color,
  opacity,
}: {
  from: Point;
  to: Point;
  thickness: number;
  images: readonly { height: number; source: ImageSourcePropType }[];
  color: string;
  opacity: number;
}) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const half = thickness / 2;
  const left = Math.min(from.x, to.x) - half;
  if (dx === 0 || dy < thickness * 4) {
    const flat = dx !== 0;
    return (
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left,
          top: flat ? from.y + dy / 2 - half : from.y - half,
          width: Math.abs(dx) + thickness,
          height: flat ? thickness : dy + thickness,
          borderRadius: half,
          backgroundColor: color,
          opacity,
        }}
      />
    );
  }
  const image = images.reduce((best, item) =>
    Math.abs(item.height - dy) < Math.abs(best.height - dy) ? item : best,
  );
  return (
    <Image
      source={image.source}
      tintColor={color}
      contentFit="fill"
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left,
          top: from.y - half,
          width: Math.abs(dx) + thickness,
          height: dy + thickness,
          opacity,
        },
        dx < 0 && styles.mirror,
      ]}
    />
  );
}

/** Plataforma elíptica sob o nó (Figma "plataforma"). */
function Platform({ x, top, width, height, lit }: { x: number; top: number; width: number; height: number; lit: boolean }) {
  const accent = useAccent();
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: x - width / 2,
        top: top + height / 2 - width / 2,
        width,
        height: width,
        borderRadius: width / 2,
        transform: [{ scaleY: height / width }],
        backgroundColor: lit ? accent.alpha(0.14) : 'rgba(255,255,255,0.04)',
      }}
    />
  );
}

function Labels({
  x,
  top,
  pathWidth,
  kicker,
  kickerDone,
  title,
  xp,
  dim,
}: {
  x: number;
  top: number;
  pathWidth: number;
  kicker: string;
  kickerDone: boolean;
  title: string | null;
  xp: number | null;
  /** Lição bloqueada ou conclusão por fazer: textos apagados. */
  dim: boolean;
}) {
  const accent = useAccent();
  const width = Math.min(LABEL_MAX_WIDTH, 2 * Math.min(x, pathWidth - x));
  return (
    <View style={[styles.labels, { left: x - width / 2, top, width }]} pointerEvents="none">
      <Text style={[styles.kicker, kickerDone && styles.kickerDone]}>{kicker}</Text>
      {title ? (
        <Text
          style={[styles.title, dim && styles.titleDim]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {title}
        </Text>
      ) : null}
      {xp !== null ? (
        <View style={styles.xp}>
          <V2Icon name="star" size={12} color={dim ? V2Colors.textTertiary : accent.light} />
          <Text style={[styles.xpText, dim && styles.xpTextDim]}>+{xp} XP</Text>
        </View>
      ) : null}
    </View>
  );
}

/** Marco de liberação (Figma "marco · a liberar / liberado"). */
function Milestone({ top, item }: { top: number; item: TrailMilestoneState }) {
  return (
    <View style={[styles.milestoneRow, { top }]} pointerEvents="none">
      <View style={[styles.milestone, item.unlocked ? styles.milestoneDone : styles.milestoneLocked]}>
        <AssetIcon asset={item.asset} size={20} round />
        <Text style={[styles.milestoneText, item.unlocked && styles.milestoneTextDone]}>
          {item.unlocked ? `Porquinho em ${item.name} liberado` : `Libera o porquinho em ${item.name}`}
        </Text>
        {item.unlocked ? <V2Icon name="check" size={14} color={V2Colors.success} /> : null}
      </View>
    </View>
  );
}

/** Balão "Começar" sobre a lição atual (Figma "balão"). */
function Balloon({ x, top, onPress }: { x: number; top: number; onPress?: () => void }) {
  const accent = useAccent();
  const pill = (
    <View style={[styles.balloonPill, { backgroundColor: accent.base }]}>
      <Text style={styles.balloonText}>Começar</Text>
    </View>
  );
  return (
    <View style={[styles.balloon, { left: x - BALLOON_BOX / 2, top }]} pointerEvents="box-none">
      {onPress ? (
        <Pressable onPress={onPress} accessibilityRole="button" hitSlop={6}>
          {pill}
        </Pressable>
      ) : (
        pill
      )}
      <View style={[styles.balloonTip, { borderTopColor: accent.base }]} />
    </View>
  );
}

/** O porquinho atual ao lado da lição atual, com a sombra nos pés (Figma "companheiro"). */
function Companion({ pig, left, bottom }: { pig: PigLevel; left: number; bottom: number }) {
  const art = mascotBox(pig, COMPANION_HEIGHT, COMPANION_SQUARE);
  const shadow = art.width * 0.7;
  return (
    <>
      <View
        pointerEvents="none"
        style={[
          styles.shadow,
          {
            left: left + (art.width - shadow) / 2,
            top: bottom + 1 - shadow / 2,
            width: shadow,
            height: shadow,
            borderRadius: shadow / 2,
            transform: [{ scaleY: 10 / shadow }],
          },
        ]}
      />
      <Image
        source={pig.art}
        contentFit="contain"
        pointerEvents="none"
        style={{ position: 'absolute', left, top: bottom - art.height, width: art.width, height: art.height }}
        accessibilityIgnoresInvertColors
      />
    </>
  );
}

const styles = StyleSheet.create({
  node: {
    position: 'absolute',
  },
  mirror: {
    transform: [{ scaleX: -1 }],
  },
  labels: {
    position: 'absolute',
    alignItems: 'center',
    gap: 3,
  },
  kicker: {
    fontFamily: V2Font.extraBold,
    fontSize: 10.5,
    letterSpacing: 1.26,
    color: V2Colors.textTertiary,
  },
  kickerDone: {
    color: V2Colors.success,
  },
  title: {
    maxWidth: '100%',
    fontFamily: V2Font.extraBold,
    fontSize: 14,
    textAlign: 'center',
    color: V2Colors.text,
  },
  titleDim: {
    color: V2Colors.textSecondary,
  },
  xp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: 2,
  },
  xpText: {
    fontFamily: V2Font.bold,
    fontSize: 11.5,
    color: V2Colors.textSecondary,
  },
  xpTextDim: {
    color: V2Colors.textTertiary,
  },
  milestoneRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  milestone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 10,
    paddingRight: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  milestoneLocked: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: V2Colors.surfaceBorderStrong,
  },
  milestoneDone: {
    backgroundColor: 'rgba(61,224,138,0.12)',
    borderColor: 'rgba(61,224,138,0.32)',
  },
  milestoneText: {
    fontFamily: V2Font.bold,
    fontSize: 12.5,
    color: V2Colors.textSecondary,
  },
  milestoneTextDone: {
    color: V2Colors.text,
  },
  balloon: {
    position: 'absolute',
    width: BALLOON_BOX,
    alignItems: 'center',
  },
  balloonPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },
  balloonText: {
    fontFamily: V2Font.extraBold,
    fontSize: 12.5,
    color: V2Colors.onPrimary,
  },
  // Figma "ponta": triângulo de 12×6 para baixo.
  balloonTip: {
    marginTop: -0.5,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  shadow: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  end: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  endText: {
    fontFamily: V2Font.medium,
    fontSize: 13,
    color: V2Colors.textTertiary,
  },
});
