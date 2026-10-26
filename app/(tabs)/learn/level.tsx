import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ScreenGlow, SubScreenHeader, V2Icon, V2Spinner } from '@/components/v2';
import {
  DailyRewardCard,
  LevelAvatar,
  TierJourney,
  TierLevelsSheet,
  XpBar,
  XpGainPill,
  XpWaysCard,
  type TierStatus,
} from '@/components/v2/experience';
import {
  JOURNEY,
  TITLE_REWARD_TIER,
  journeyTier,
  levelFraction,
  levelSpan,
  type TierInfo,
} from '@/constants/experience-tiers';
import { levelProgress } from '@/constants/pig-levels';
import { V2Colors, V2Font, V2Layout } from '@/constants/theme-v2';
import { useAccent } from '@/hooks/use-accent';
import { useInvestedTotal } from '@/hooks/use-invested-total';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import type { ExperienceProfile } from '@/lib/api/experience';
import { useClaimDailyReward, useExperienceProfile } from '@/lib/queries/experience.queries';
import { useLearningContent, useLearningModules } from '@/lib/queries/learning.queries';

/** Figma: 18 de margem e 18 entre os blocos (36a). */
const GUTTER = 18;
/** Altura da área de carregando e de erro (Figma "estado", 36f e 36g). */
const STATE_HEIGHT = 520;

/** Dica abaixo da régua (36a, 36d, 36h). */
function nextLevelHint(profile: ExperienceProfile): string {
  if (profile.nextLevelXp === null) return 'Você completou todas as etapas da jornada.';
  if (profile.level === 0) return 'Conclua lições da Trilha para chegar ao Nível 1.';
  return `No Nível ${profile.level + 1}, sua moldura ganha mais um ponto de luz.`;
}

/** Etapas concluídas, a atual e as bloqueadas; no nível máximo, todas concluídas. */
function tierStatuses(profile: ExperienceProfile): TierStatus[] {
  const current =
    profile.nextLevelXp === null
      ? JOURNEY.length
      : JOURNEY.findIndex((info) => info.tier === journeyTier(profile.tier).tier);
  return JOURNEY.map((_, index) =>
    index < current ? 'done' : index === current ? 'current' : 'locked',
  );
}

/**
 * Seu nível (Figma "Trilha · Seu nível", 36a a 36j): a moldura com o nível, o
 * XP na régua, a recompensa do dia, a jornada das quatro etapas e como ganhar
 * XP. Tudo vem do backend; o app só desenha a régua.
 */
export default function LevelScreen() {
  const accent = useAccent();
  const screenInsets = useScreenInsets();
  const experience = useExperienceProfile();
  const claim = useClaimDailyReward();
  const modules = useLearningModules();
  const content = useLearningContent();
  const invested = useInvestedTotal();
  const [sheetTier, setSheetTier] = useState<TierInfo | null>(null);

  const profile = experience.data;
  const pig = levelProgress(invested.totalUsd).current;

  return (
    <View style={styles.screen}>
      <ScreenGlow />
      <ScrollView
        style={{ marginTop: screenInsets.top }}
        contentContainerStyle={[
          styles.content,
          { paddingTop: screenInsets.topGap, paddingBottom: screenInsets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <SubScreenHeader title="Seu nível" />

        {!profile && experience.isError ? (
          <View style={[styles.state, styles.errorState]}>
            <Text style={styles.errorText}>Não foi possível carregar o seu nível.</Text>
            <Pressable onPress={() => experience.refetch()} hitSlop={8} accessibilityRole="button">
              <Text style={[styles.retry, { color: accent.base }]}>Tentar novamente</Text>
            </Pressable>
          </View>
        ) : !profile ? (
          <View style={styles.state}>
            <V2Spinner size={32} />
          </View>
        ) : (
          <>
            <LevelHero profile={profile} pig={pig} />
            <DailyRewardCard
              reward={profile.dailyReward}
              claiming={claim.isPending}
              onClaim={() => claim.mutate()}
            />
            <TierJourney statuses={tierStatuses(profile)} onOpenTier={setSheetTier} />
            <XpWaysCard
              dailyRewardXp={profile.dailyReward.xp}
              lessonXp={modules.data?.[0]?.completionXp ?? null}
              moduleXp={content.data?.introModuleCompletionXp ?? null}
            />
          </>
        )}
      </ScrollView>

      {profile ? (
        <TierLevelsSheet
          tier={sheetTier}
          profile={profile}
          onClose={() => setSheetTier(null)}
          onGoToTrail={() => {
            setSheetTier(null);
            // Volta até a Trilha; se ela não estiver na pilha, troca por ela.
            router.dismissTo('/learn');
          }}
        />
      ) : null}
    </View>
  );
}

function LevelHero({
  profile,
  pig,
}: {
  profile: ExperienceProfile;
  pig: ReturnType<typeof levelProgress>['current'];
}) {
  const accent = useAccent();
  const tier = journeyTier(profile.tier);
  const span = levelSpan(profile);
  const max = span === null;
  const title = profile.rewards.find((unlock) => unlock.reward.tier === TITLE_REWARD_TIER)?.reward
    .name;

  return (
    <View
      style={styles.hero}
      accessible
      accessibilityLabel={`Nível ${profile.level}, ${tier.label}. ${
        max ? 'Nível máximo atingido' : `${profile.xpIntoLevel} de ${span} XP`
      }`}
    >
      <LevelAvatar
        level={profile.level}
        tier={profile.tier}
        max={max}
        fraction={levelFraction(profile)}
        pig={pig}
      />
      <Text style={styles.levelTitle}>Nível {profile.level}</Text>
      <View
        style={[styles.tierPill, { backgroundColor: accent.alpha(0.14), borderColor: accent.alpha(0.32) }]}
      >
        <V2Icon name={tier.icon} size={13} color={accent.light} />
        <Text style={[styles.tierText, { color: accent.light }]}>{tier.label}</Text>
      </View>
      {title ? (
        <View style={styles.titlePill}>
          <V2Icon name="trophy" size={12} color={V2Colors.textSecondary} />
          <Text style={styles.titleText}>Título: {title}</Text>
        </View>
      ) : null}
      <View style={styles.progress}>
        <View style={styles.numbers}>
          <View style={styles.xpRow}>
            <Text style={styles.xpText}>
              {max ? 'Nível máximo atingido' : `${profile.xpIntoLevel} / ${span} XP`}
            </Text>
            {!profile.dailyReward.available ? (
              <XpGainPill xp={profile.dailyReward.xp} size="regular" />
            ) : null}
          </View>
          {!max ? (
            <Text style={styles.remaining}>
              {profile.xpToNextLevel} XP para o Nível {profile.level + 1}
            </Text>
          ) : null}
        </View>
        <XpBar fraction={levelFraction(profile)} size="large" />
      </View>
      <View style={styles.hint}>
        <V2Icon name="sparkles" size={14} color={accent.light} />
        <Text style={styles.hintText}>{nextLevelHint(profile)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: V2Colors.background,
  },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: V2Layout.maxWidth,
    alignSelf: 'center',
    paddingHorizontal: GUTTER,
    gap: 18,
  },
  state: {
    height: STATE_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorState: {
    gap: 14,
  },
  errorText: {
    fontFamily: V2Font.semiBold,
    fontSize: 15,
    textAlign: 'center',
    color: V2Colors.textSecondary,
  },
  retry: {
    fontFamily: V2Font.extraBold,
    fontSize: 15,
  },
  hero: {
    alignItems: 'center',
    gap: 10,
    paddingBottom: 4,
  },
  levelTitle: {
    fontFamily: V2Font.black,
    fontSize: 30,
    color: V2Colors.text,
  },
  tierPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 11,
    paddingRight: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  tierText: {
    fontFamily: V2Font.extraBold,
    fontSize: 12.5,
  },
  titlePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 10,
    paddingRight: 11,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: V2Colors.chipBorder,
    backgroundColor: V2Colors.chip,
  },
  titleText: {
    fontFamily: V2Font.bold,
    fontSize: 11.5,
    color: V2Colors.textSecondary,
  },
  progress: {
    alignSelf: 'stretch',
    gap: 8,
    paddingTop: 10,
  },
  numbers: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  xpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  xpText: {
    fontFamily: V2Font.extraBold,
    fontSize: 13,
    color: V2Colors.text,
  },
  remaining: {
    flexShrink: 1,
    textAlign: 'right',
    fontFamily: V2Font.semiBold,
    fontSize: 12,
    color: V2Colors.textTertiary,
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingTop: 4,
  },
  hintText: {
    flexShrink: 1,
    fontFamily: V2Font.medium,
    fontSize: 12.5,
    color: V2Colors.textSecondary,
  },
});
