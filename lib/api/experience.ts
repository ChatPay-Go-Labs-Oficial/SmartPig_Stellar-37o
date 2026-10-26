import { apiClient } from './client';

// Nível de Usuário: XP, nível e recompensa do dia. O backend calcula tudo; o
// app só exibe (curva round(40 × nível^1,8), níveis de 0 a 50).

export type ExperienceTier = 'UNRANKED' | 'BEGINNER' | 'CONSISTENT' | 'DEDICATED' | 'VETERAN';

export interface ExperienceLevel {
  /** 0 = usuário novo, sem tier. */
  level: number;
  tier: ExperienceTier;
  totalXp: number;
  /** XP total em que o nível atual começa. */
  currentLevelXp: number;
  /** XP total do próximo nível; null no nível máximo. */
  nextLevelXp: number | null;
  xpIntoLevel: number;
  /** null no nível máximo. */
  xpToNextLevel: number | null;
}

export interface LevelThreshold {
  level: number;
  totalXp: number;
}

export interface DailyRewardStatus {
  available: boolean;
  xp: number;
  /** ISO da próxima meia-noite de America/Sao_Paulo. */
  nextAvailableAt: string;
}

/** Recompensa de nível já conquistada. Sem uso no Meridian (badges ficam fora). */
export interface ExperienceRewardUnlock {
  unlockedAt: string;
  sourceLevel: number | null;
  reward: {
    key: string;
    /** string, não união: uma recompensa nova não pode quebrar este build. */
    type: string;
    name: string;
    description: string | null;
    tier: string | null;
    payload: unknown;
  };
}

/** GET /experience/profile. */
export interface ExperienceProfile extends ExperienceLevel {
  rewards: ExperienceRewardUnlock[];
  /** Níveis de 1 a 50, para a régua e o sheet de níveis. */
  levelThresholds: LevelThreshold[];
  dailyReward: DailyRewardStatus;
}

/** POST /experience/daily-reward/claim. */
export interface DailyRewardClaim {
  xpAwarded: number;
  totalXp: number;
  levelBefore: number;
  levelAfter: number;
  tierAfter: ExperienceTier;
  nextAvailableAt: string;
}

export const getExperienceProfile = async (): Promise<ExperienceProfile> => {
  const { data } = await apiClient.get('/experience/profile');
  return data;
};

/** Uma vez por dia; repetir no mesmo dia dá 409 DAILY_REWARD_ALREADY_CLAIMED. */
export const claimDailyReward = async (): Promise<DailyRewardClaim> => {
  const { data } = await apiClient.post('/experience/daily-reward/claim');
  return data;
};
