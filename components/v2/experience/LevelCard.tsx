import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { V2Colors, V2Font, V2Radius } from '@/constants/theme-v2';
import { journeyTier, levelFraction, levelSpan } from '@/constants/experience-tiers';
import { useAccent } from '@/hooks/use-accent';
import type { ExperienceProfile } from '@/lib/api/experience';
import { Button3D } from '../Button3D';
import { ProgressRing } from '../ProgressRing';
import { V2Icon } from '../V2Icon';
import { XpBar } from './XpBar';
import { XpGainPill } from './XpGainPill';

const RING = 44;
const RING_THICKNESS = 4;
const TRACK = 'rgba(255,255,255,0.1)';

interface LevelCardProps {
  profile: ExperienceProfile | undefined;
  /** Sem dados ainda (30f). */
  loading: boolean;
  /** Falhou sem dados (30g). */
  error: boolean;
  onRetry: () => void;
  /** Toque no card: abre o Seu nível. */
  onPress: () => void;
  claiming: boolean;
  onClaim: () => void;
}

/**
 * Card de Nível da Home (Figma 30i e 30j, sem a Chama): anel com o nível,
 * nível e etapa, XP na régua e a recompensa do dia. Disponível, o "+3 XP" pega
 * a recompensa ali mesmo; recebida, vira a pílula ao lado do XP (30h).
 */
function LevelCardView({
  profile,
  loading,
  error,
  onRetry,
  onPress,
  claiming,
  onClaim,
}: LevelCardProps) {
  const accent = useAccent();

  if (!profile && error) {
    return (
      <View style={styles.card}>
        <View style={styles.errorSeal}>
          <V2Icon name="alert" size={20} color={V2Colors.error} />
        </View>
        <View style={styles.errorTexts}>
          <Text style={styles.errorText}>Não foi possível carregar seu nível.</Text>
          <Pressable onPress={onRetry} hitSlop={8} accessibilityRole="button">
            <Text style={[styles.retry, { color: accent.light }]}>Tentar de novo</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!profile || loading) {
    return (
      <Pressable onPress={onPress} style={styles.card} accessibilityRole="button">
        <View style={styles.ring}>
          <ProgressRing
            size={RING}
            thickness={RING_THICKNESS}
            progress={0}
            color={accent.base}
            trackColor={TRACK}
          />
          <Text style={[styles.ringLabel, styles.placeholder]}>—</Text>
        </View>
        <View style={styles.texts}>
          <View style={styles.lines}>
            <Text style={[styles.title, styles.placeholder]}>Nível —</Text>
            <Text style={[styles.xp, styles.placeholder]}>— XP</Text>
          </View>
          <XpBar fraction={0} size="small" />
        </View>
        <V2Icon name="chevron-right" size={18} color={V2Colors.textTertiary} />
      </Pressable>
    );
  }

  const tier = journeyTier(profile.tier);
  const span = levelSpan(profile);
  const reward = profile.dailyReward;
  const xpLine = span === null ? 'Nível máximo atingido' : `${profile.xpIntoLevel}/${span} XP`;

  return (
    <Pressable
      onPress={onPress}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={`Nível ${profile.level}, ${tier.label}. ${xpLine}. Ver seu nível`}
    >
      <View style={styles.ring}>
        <ProgressRing
          size={RING}
          thickness={RING_THICKNESS}
          progress={levelFraction(profile)}
          color={accent.base}
          trackColor={TRACK}
        />
        <Text style={styles.ringLabel}>{profile.level}</Text>
      </View>
      <View style={styles.texts}>
        <View style={styles.lines}>
          <Text style={styles.title} numberOfLines={1}>
            Nível {profile.level} · {tier.label}
          </Text>
          <View style={styles.xpRow}>
            <Text style={styles.xp}>{xpLine}</Text>
            {!reward.available ? <XpGainPill xp={reward.xp} size="small" /> : null}
          </View>
        </View>
        <XpBar fraction={levelFraction(profile)} size="small" />
      </View>
      {reward.available ? (
        <Button3D
          label={`+${reward.xp} XP`}
          icon="gift"
          size="small"
          onPress={onClaim}
          loading={claiming}
          style={styles.rewardKey}
          accessibilityHint="Pega a recompensa do dia"
        />
      ) : null}
      <V2Icon name="chevron-right" size={18} color={V2Colors.textTertiary} />
    </Pressable>
  );
}

export const LevelCard = memo(LevelCardView);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: V2Radius.list,
    borderWidth: 1,
    borderColor: V2Colors.surfaceBorderStrong,
    backgroundColor: V2Colors.surface,
  },
  ring: {
    width: RING,
    height: RING,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringLabel: {
    position: 'absolute',
    fontFamily: V2Font.black,
    fontSize: 15,
    letterSpacing: -0.3,
    color: V2Colors.onPrimary,
  },
  texts: {
    flex: 1,
    minWidth: 0,
    gap: 8,
  },
  lines: {
    gap: 3,
  },
  title: {
    fontFamily: V2Font.extraBold,
    fontSize: 14.5,
    letterSpacing: -0.145,
    color: V2Colors.onPrimary,
  },
  xpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  xp: {
    fontFamily: V2Font.semiBold,
    fontSize: 12,
    color: V2Colors.textSecondary,
  },
  placeholder: {
    color: V2Colors.textTertiary,
  },
  // Figma "botão recompensa do dia": 74 de largura.
  rewardKey: {
    width: 74,
  },
  errorSeal: {
    width: 44,
    height: 44,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(255,90,127,0.32)',
    backgroundColor: 'rgba(255,90,127,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTexts: {
    flex: 1,
    minWidth: 0,
    gap: 4,
    alignItems: 'flex-start',
  },
  errorText: {
    fontFamily: V2Font.medium,
    fontSize: 12.5,
    color: V2Colors.textSecondary,
  },
  retry: {
    paddingVertical: 2,
    fontFamily: V2Font.bold,
    fontSize: 13,
  },
});
