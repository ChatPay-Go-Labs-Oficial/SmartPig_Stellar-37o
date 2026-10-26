import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { V2Colors, V2Font, V2Radius } from '@/constants/theme-v2';
import { JOURNEY, type TierInfo } from '@/constants/experience-tiers';
import { useAccent } from '@/hooks/use-accent';
import { V2Icon } from '../V2Icon';

export type TierStatus = 'done' | 'current' | 'locked';

const MARKER = 50;
/** Do topo da etapa ao fim do marcador (8 + 2 + 54) e a folga até a linha. */
const LINE_TOP = 8 + 2 + MARKER + 4 + 3;

interface TierJourneyProps {
  /** Situação de cada etapa, na ordem de JOURNEY. */
  statuses: readonly TierStatus[];
  onOpenTier: (tier: TierInfo) => void;
}

/**
 * Sua jornada (Figma 36a, 36e, 36h): as quatro etapas, ligadas por uma linha.
 * A etapa atual leva "Você está aqui" e o brilho; as concluídas, o selo verde;
 * as próximas, o cadeado. O toque abre os níveis da etapa (36j).
 */
function TierJourneyView({ statuses, onOpenTier }: TierJourneyProps) {
  const accent = useAccent();
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Sua jornada</Text>
        <Text style={styles.count}>4 etapas, 50 níveis</Text>
      </View>
      {JOURNEY.map((tier, index) => {
        const status = statuses[index] ?? 'locked';
        const locked = status === 'locked';
        return (
          <Pressable
            key={tier.tier}
            onPress={() => onOpenTier(tier)}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`${tier.label}, níveis ${tier.firstLevel} a ${tier.lastLevel}. ${
              status === 'done' ? 'Concluída' : status === 'current' ? 'Você está aqui' : 'Bloqueada'
            }`}
          >
            {index < JOURNEY.length - 1 ? (
              <View
                style={[
                  styles.line,
                  { backgroundColor: status === 'done' ? accent.base : 'rgba(255,255,255,0.1)' },
                ]}
              />
            ) : null}
            <View style={styles.column}>
              <TierMarker tier={tier} status={status} />
            </View>
            <View style={styles.texts}>
              <View style={styles.nameRow}>
                <Text style={[styles.name, locked && styles.nameLocked]}>{tier.label}</Text>
                {status === 'current' ? (
                  <View style={[styles.tag, { backgroundColor: accent.alpha(0.14) }]}>
                    <Text style={[styles.tagText, { color: accent.light }]}>Você está aqui</Text>
                  </View>
                ) : status === 'done' ? (
                  <View style={[styles.tag, styles.doneTag]}>
                    <Text style={[styles.tagText, styles.doneTagText]}>Concluída</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.range}>
                Níveis {tier.firstLevel} a {tier.lastLevel}
              </Text>
              <Text style={[styles.reward, locked && styles.rewardLocked]}>
                {status === 'done' ? tier.rewardDone : tier.rewardPending}
              </Text>
            </View>
            <View style={styles.arrow}>
              <V2Icon name="chevron-right" size={18} color={V2Colors.textTertiary} />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Marcador 3D da etapa (Figma "marcador · atual / feita / bloqueada"). */
function TierMarker({ tier, status }: { tier: TierInfo; status: TierStatus }) {
  const accent = useAccent();
  const locked = status === 'locked';
  return (
    <View style={styles.marker}>
      {status === 'current' ? (
        <>
          <View style={[styles.halo, { backgroundColor: accent.alpha(0.14) }]} />
          <View style={[styles.haloRing, { borderColor: accent.alpha(0.4) }]} />
        </>
      ) : null}
      <View
        style={[
          styles.disc,
          styles.discBase,
          { backgroundColor: locked ? 'rgba(255,255,255,0.08)' : accent.dark },
        ]}
      />
      <View style={[styles.disc, locked ? styles.discLocked : { backgroundColor: accent.base }]} />
      <View
        style={[
          styles.shine,
          { backgroundColor: locked ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.1)' },
        ]}
      />
      <View style={styles.icon}>
        <V2Icon
          name={tier.icon}
          size={22}
          color={locked ? V2Colors.textTertiary : V2Colors.onPrimary}
        />
      </View>
      {status === 'done' ? (
        <View style={[styles.badge, styles.doneBadge]}>
          <V2Icon name="check" size={11} color={V2Colors.onPrimary} />
        </View>
      ) : locked ? (
        <View style={[styles.badge, styles.lockedBadge]}>
          <V2Icon name="lock" size={11} color={V2Colors.textSecondary} />
        </View>
      ) : null}
    </View>
  );
}

export const TierJourney = memo(TierJourneyView);

const styles = StyleSheet.create({
  card: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderRadius: V2Radius.list,
    borderWidth: 1,
    borderColor: V2Colors.surfaceBorderStrong,
    backgroundColor: V2Colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
  },
  title: {
    fontFamily: V2Font.extraBold,
    fontSize: 15,
    color: V2Colors.text,
  },
  count: {
    fontFamily: V2Font.medium,
    fontSize: 12,
    color: V2Colors.textTertiary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    paddingTop: 8,
    paddingBottom: 14,
  },
  pressed: {
    opacity: 0.85,
  },
  // Figma "linha": do fim do marcador até pouco antes do próximo.
  line: {
    position: 'absolute',
    left: (56 - 3) / 2,
    top: LINE_TOP,
    bottom: -5,
    width: 3,
    borderRadius: 2,
  },
  column: {
    width: 56,
    alignItems: 'center',
    paddingTop: 2,
  },
  texts: {
    flex: 1,
    minWidth: 0,
    gap: 3,
    paddingTop: 3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontFamily: V2Font.extraBold,
    fontSize: 15,
    color: V2Colors.text,
  },
  nameLocked: {
    color: V2Colors.textSecondary,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  tagText: {
    fontFamily: V2Font.extraBold,
    fontSize: 10.5,
  },
  doneTag: {
    backgroundColor: 'rgba(61,224,138,0.14)',
  },
  doneTagText: {
    color: V2Colors.success,
  },
  range: {
    fontFamily: V2Font.semiBold,
    fontSize: 12,
    color: V2Colors.textTertiary,
  },
  reward: {
    fontFamily: V2Font.medium,
    fontSize: 12.5,
    lineHeight: 17.5,
    color: V2Colors.textSecondary,
  },
  rewardLocked: {
    color: V2Colors.textTertiary,
  },
  arrow: {
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  marker: {
    width: MARKER,
    height: MARKER + 4,
  },
  // Figma: brilho e anel centrados entre o disco e a base (2 abaixo do disco).
  halo: {
    position: 'absolute',
    left: -13,
    top: -11,
    width: 76,
    height: 76,
    borderRadius: 38,
  },
  haloRing: {
    position: 'absolute',
    left: -7,
    top: -5,
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
  },
  disc: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: MARKER,
    height: MARKER,
    borderRadius: MARKER / 2,
  },
  discBase: {
    top: 4,
  },
  discLocked: {
    backgroundColor: V2Colors.surfaceDark,
    borderWidth: 1,
    borderColor: V2Colors.chipBorder,
  },
  // Figma "reflexo": elipse 36×19 no alto do disco.
  shine: {
    position: 'absolute',
    left: 7,
    top: 4 - (36 - 19) / 2,
    width: 36,
    height: 36,
    borderRadius: 18,
    transform: [{ scaleY: 19 / 36 }],
  },
  icon: {
    position: 'absolute',
    left: 14,
    top: 14,
  },
  badge: {
    position: 'absolute',
    left: 34,
    top: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2.5,
    borderColor: V2Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBadge: {
    backgroundColor: V2Colors.success,
  },
  lockedBadge: {
    backgroundColor: V2Colors.surfaceDark,
  },
});
