import type { V2IconName } from '@/components/v2';
import type { ExperienceLevel, ExperienceTier } from '@/lib/api/experience';

// Nível de Usuário: as quatro etapas da jornada (Figma "Trilha · Seu nível",
// "Sua jornada"). O backend decide nível e etapa; aqui só o que a tela mostra.

/** Etapa da jornada. O Nível 0 (UNRANKED no backend) aparece como Iniciante, como no Figma. */
export type JourneyTier = Exclude<ExperienceTier, 'UNRANKED'>;

export interface TierInfo {
  tier: JourneyTier;
  label: string;
  firstLevel: number;
  lastLevel: number;
  /** Ícone da etapa: marcador da jornada, pílula do tier e selo do sheet. */
  icon: V2IconName;
  /** Recompensa por completar a etapa (sheet de níveis). */
  reward: string;
  /** Linha da etapa ainda por completar. */
  rewardPending: string;
  /** Linha da etapa concluída. */
  rewardDone: string;
  /** Forma dos pontos de luz da moldura nesta etapa. */
  dot: 'circle' | 'diamond';
}

export const JOURNEY: readonly TierInfo[] = [
  {
    tier: 'BEGINNER',
    label: 'Iniciante',
    firstLevel: 1,
    lastLevel: 10,
    icon: 'sparkles',
    reward: 'Título Porquinho Iniciante e uma moldura nova.',
    rewardPending: 'Ao completar: título Porquinho Iniciante e uma moldura nova.',
    rewardDone: 'Você ganhou o título Porquinho Iniciante e a moldura nova.',
    dot: 'circle',
  },
  {
    tier: 'CONSISTENT',
    label: 'Consistente',
    firstLevel: 11,
    lastLevel: 25,
    icon: 'star',
    reward: 'Um emblema ao lado do seu nome em todo o app.',
    rewardPending: 'Ao completar: um emblema ao lado do seu nome em todo o app.',
    rewardDone: 'Você ganhou o emblema ao lado do seu nome.',
    dot: 'diamond',
  },
  {
    tier: 'DEDICATED',
    label: 'Dedicado',
    firstLevel: 26,
    lastLevel: 40,
    icon: 'zap',
    reward: 'Novas poses e expressões para o seu porquinho.',
    rewardPending: 'Ao completar: novas poses e expressões para o seu porquinho.',
    rewardDone: 'Você ganhou novas poses e expressões para o seu porquinho.',
    dot: 'diamond',
  },
  {
    tier: 'VETERAN',
    label: 'Veterano',
    firstLevel: 41,
    lastLevel: 50,
    icon: 'trophy',
    reward: 'Um visual exclusivo para o seu porquinho.',
    rewardPending: 'Ao completar: um visual exclusivo para o seu porquinho.',
    rewardDone: 'Você ganhou o visual exclusivo do seu porquinho.',
    dot: 'diamond',
  },
];

/** Etapa em que a pessoa está, para exibição. */
export function journeyTier(tier: ExperienceTier): TierInfo {
  return JOURNEY.find((info) => info.tier === tier) ?? JOURNEY[0];
}

/** Recompensa do backend que dá o título (Figma "Título: Porquinho Iniciante"). */
export const TITLE_REWARD_TIER = 'BEGINNER';

/**
 * Tamanho do nível atual em XP (o "196" de "51/196 XP"), para desenhar a régua.
 * null no nível máximo.
 */
export function levelSpan(level: ExperienceLevel): number | null {
  return level.nextLevelXp === null ? null : level.nextLevelXp - level.currentLevelXp;
}

/** Quanto do nível atual já foi percorrido, de 0 a 1. Cheio no nível máximo. */
export function levelFraction(level: ExperienceLevel): number {
  const span = levelSpan(level);
  if (span === null) return 1;
  return span > 0 ? Math.min(1, Math.max(0, level.xpIntoLevel / span)) : 0;
}
