import { memo, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { V2Colors, V2Font } from '@/constants/theme-v2';
import type { TierInfo } from '@/constants/experience-tiers';
import { useAccent } from '@/hooks/use-accent';
import type { ExperienceProfile } from '@/lib/api/experience';
import { Button3D } from '../Button3D';
import { V2Icon } from '../V2Icon';
import { V2Sheet } from '../V2Sheet';

const NODE = 30;
const RULER_HEIGHT = 66;
const TRACK_TOP = 32.5;

interface TierLevelsSheetProps {
  /** Etapa aberta; null fecha o sheet. */
  tier: TierInfo | null;
  profile: ExperienceProfile;
  onClose: () => void;
  onGoToTrail: () => void;
}

/**
 * Níveis de uma etapa (Figma 36j): a régua só com os níveis dela. Concluídos
 * acesos, o atual em destaque, o próximo com o XP total que ele pede e o
 * último com o ícone da recompensa. Tocar em um nível mostra o XP dele.
 */
function TierLevelsSheetView({ tier, profile, onClose, onGoToTrail }: TierLevelsSheetProps) {
  const accent = useAccent();
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);

  const first = tier?.firstLevel ?? 1;
  const last = tier?.lastLevel ?? 10;
  const current = profile.level;
  const isCurrentTier = current >= first && current <= last;
  const isFutureTier = current < first;

  // Ao abrir uma etapa: o próximo nível dela (ou o primeiro, se é futura).
  useEffect(() => {
    if (!tier) return;
    if (isFutureTier) setSelected(first);
    else if (isCurrentTier && current < last) setSelected(current + 1);
    else setSelected(null);
  }, [tier, isFutureTier, isCurrentTier, current, first, last]);

  if (!tier) return null;

  const levels = Array.from({ length: last - first + 1 }, (_, index) => first + index);
  const step = width > NODE ? (width - NODE) / (levels.length - 1) : 0;
  const centerOf = (level: number) => NODE / 2 + (level - first) * step;
  const reached = Math.min(Math.max(current, first - 1), last);
  const thresholdOf = (level: number) =>
    profile.levelThresholds.find((item) => item.level === level)?.totalXp ?? null;
  const selectedXp = selected !== null ? thresholdOf(selected) : null;

  const intro = isCurrentTier
    ? `Você está no Nível ${current} de ${last} e tem ${profile.totalXp} XP no total.`
    : `Você está no Nível ${current} e tem ${profile.totalXp} XP no total.`;

  return (
    <V2Sheet visible onClose={onClose} title={`Níveis do ${tier.label}`} icon={tier.icon}>
      <View style={styles.body}>
        <Text style={styles.intro}>{intro}</Text>

        <View
          style={styles.ruler}
          onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
        >
          {width > 0 ? (
            <>
              <View style={[styles.track, { left: NODE / 2, right: NODE / 2 }]} />
              {reached >= first ? (
                <View
                  style={[
                    styles.track,
                    {
                      left: NODE / 2,
                      width: centerOf(reached) - NODE / 2,
                      backgroundColor: accent.base,
                    },
                  ]}
                />
              ) : null}
              {levels.map((level) => (
                <LevelNode
                  key={level}
                  level={level}
                  left={centerOf(level) - NODE / 2}
                  state={
                    level === last
                      ? level <= current
                        ? 'lastReached'
                        : 'last'
                      : level < current
                        ? 'done'
                        : level === current
                          ? 'current'
                          : level === current + 1
                            ? 'next'
                            : 'future'
                  }
                  tierIcon={tier.icon}
                  onPress={() => setSelected(level)}
                />
              ))}
              {selected !== null && selectedXp !== null ? (
                <View
                  pointerEvents="none"
                  style={[
                    styles.xpPill,
                    {
                      left: centerOf(selected) - 26,
                      backgroundColor: accent.alpha(0.14),
                      borderColor: accent.alpha(0.32),
                    },
                  ]}
                >
                  <Text style={[styles.xpPillText, { color: accent.light }]}>{selectedXp} XP</Text>
                </View>
              ) : null}
            </>
          ) : null}
        </View>

        <View style={styles.rewardCard}>
          <View
            style={[
              styles.rewardSeal,
              { backgroundColor: accent.alpha(0.14), borderColor: accent.alpha(0.32) },
            ]}
          >
            <V2Icon name="trophy" size={17} color={accent.light} />
          </View>
          <View style={styles.rewardTexts}>
            <Text style={styles.rewardTitle}>Ao completar o Nível {last}</Text>
            <Text style={styles.rewardText}>{tier.reward}</Text>
          </View>
        </View>

        <Text style={styles.note}>
          Cada nível acende um ponto de luz na sua moldura. Toque em um nível para ver o XP que ele
          pede.
        </Text>

        <Button3D label="Ir pra Trilha" onPress={onGoToTrail} />
      </View>
    </V2Sheet>
  );
}

type NodeState = 'done' | 'current' | 'next' | 'future' | 'last' | 'lastReached';

function LevelNode({
  level,
  left,
  state,
  tierIcon,
  onPress,
}: {
  level: number;
  left: number;
  state: NodeState;
  tierIcon: TierInfo['icon'];
  onPress: () => void;
}) {
  const accent = useAccent();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={[styles.node, { left }]}
      accessibilityRole="button"
      accessibilityLabel={`Nível ${level}`}
    >
      <View style={styles.nodeShape}>
        {state === 'done' ? (
          <View style={[styles.dot, { backgroundColor: accent.base }]} />
        ) : state === 'current' ? (
          <>
            <View style={[styles.currentRing, { borderColor: accent.alpha(0.4) }]} />
            <View style={[styles.currentDisc, { backgroundColor: accent.base }]}>
              <Text style={styles.currentText}>{level}</Text>
            </View>
          </>
        ) : state === 'next' ? (
          <View style={[styles.nextDot, { borderColor: accent.alpha(0.6) }]} />
        ) : state === 'future' ? (
          <View style={styles.futureDot} />
        ) : (
          <View
            style={[
              styles.lastNode,
              state === 'lastReached'
                ? { backgroundColor: accent.base, borderColor: accent.base }
                : { borderColor: accent.alpha(0.4) },
            ]}
          >
            <V2Icon
              name={tierIcon}
              size={12}
              color={state === 'lastReached' ? V2Colors.onPrimary : accent.light}
            />
          </View>
        )}
      </View>
      {state !== 'current' ? (
        <Text
          style={[
            styles.nodeLabel,
            state === 'next' && { fontFamily: V2Font.extraBold, color: accent.light },
          ]}
        >
          {level}
        </Text>
      ) : null}
    </Pressable>
  );
}

export const TierLevelsSheet = memo(TierLevelsSheetView);

const styles = StyleSheet.create({
  body: {
    gap: 16,
  },
  intro: {
    fontFamily: V2Font.medium,
    fontSize: 14,
    color: V2Colors.textSecondary,
  },
  ruler: {
    height: RULER_HEIGHT,
  },
  track: {
    position: 'absolute',
    top: TRACK_TOP,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  node: {
    position: 'absolute',
    top: TRACK_TOP + 1.5 - NODE / 2,
    width: NODE,
    alignItems: 'center',
  },
  nodeShape: {
    width: NODE,
    height: NODE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  currentRing: {
    position: 'absolute',
    width: NODE,
    height: NODE,
    borderRadius: NODE / 2,
    borderWidth: 1.5,
  },
  currentDisc: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentText: {
    fontFamily: V2Font.black,
    fontSize: 10.5,
    color: V2Colors.onPrimary,
  },
  nextDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
    backgroundColor: V2Colors.background,
  },
  futureDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  lastNode: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    backgroundColor: V2Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeLabel: {
    marginTop: 0,
    fontFamily: V2Font.semiBold,
    fontSize: 10,
    color: V2Colors.textTertiary,
  },
  // Figma "XP do próximo nível": centrado sobre o nível, acima da régua.
  xpPill: {
    position: 'absolute',
    top: -2,
    width: 52,
    alignItems: 'center',
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  xpPillText: {
    fontFamily: V2Font.extraBold,
    fontSize: 10,
  },
  rewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: V2Colors.surfaceBorderStrong,
    backgroundColor: V2Colors.surface,
  },
  rewardSeal: {
    width: 36,
    height: 36,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardTexts: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  rewardTitle: {
    fontFamily: V2Font.extraBold,
    fontSize: 13.5,
    color: V2Colors.text,
  },
  rewardText: {
    fontFamily: V2Font.medium,
    fontSize: 13,
    color: V2Colors.textSecondary,
  },
  note: {
    fontFamily: V2Font.medium,
    fontSize: 12,
    lineHeight: 17.4,
    color: V2Colors.textTertiary,
  },
});
