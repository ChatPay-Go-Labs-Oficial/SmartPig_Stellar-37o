import type { ImageSourcePropType } from 'react-native';

/**
 * Níveis do porquinho da Home, pelo total guardado em dólar.
 *
 * `image` é a arte da animação de evolução (LevelUpAnimation, ainda V1).
 * `hero` é o mascote do cabeçalho V2, com a caixa de cada um no Figma
 * ("Home · Tela" 04/04a/04b): alinhado pela base, pode passar do topo da coluna.
 */
export interface PigLevel {
  label: string;
  minBalance: number;
  image: ImageSourcePropType;
  hero: { source: ImageSourcePropType; width: number; height: number };
}

const KING_BOX = { width: 123, height: 184 };

export const PIG_LEVELS: readonly PigLevel[] = [
  {
    label: 'Porquinho Bebê',
    minBalance: 0,
    image: require('@/assets/images/pig_babe.png'),
    hero: { source: require('@/assets/images/v2/mascote-baby-pig.png'), width: 128, height: 140 },
  },
  {
    label: 'Porquinho Esperto',
    minBalance: 100,
    image: require('@/assets/images/pig1.png'),
    hero: { source: require('@/assets/images/v2/mascote-smart-pig.png'), width: 103, height: 186 },
  },
  {
    label: 'Porquinho Forte',
    minBalance: 500,
    image: require('@/assets/images/pig-muscle.png'),
    hero: { source: require('@/assets/images/pig-muscle.png'), ...KING_BOX },
  },
  {
    label: 'Porquinho Dourado',
    minBalance: 1000,
    image: require('@/assets/images/pig-gold.png'),
    hero: { source: require('@/assets/images/pig-gold.png'), ...KING_BOX },
  },
  {
    label: 'Porquinho Rei',
    minBalance: 5000,
    image: require('@/assets/images/pig-king.png'),
    hero: { source: require('@/assets/images/pig-king.png'), ...KING_BOX },
  },
];

export interface LevelProgress {
  current: PigLevel;
  /** undefined no nível máximo. */
  next: PigLevel | undefined;
  /** Quanto falta, em dólar, para o próximo nível (0 no máximo). */
  remaining: number;
  /** 0–1 dentro da faixa do nível atual (1 no máximo). */
  progress: number;
}

export function levelProgress(totalUsd: number): LevelProgress {
  const value = Number.isFinite(totalUsd) ? Math.max(0, totalUsd) : 0;
  let index = 0;
  for (let i = PIG_LEVELS.length - 1; i >= 0; i--) {
    if (value >= PIG_LEVELS[i].minBalance) {
      index = i;
      break;
    }
  }
  const current = PIG_LEVELS[index];
  const next = PIG_LEVELS[index + 1];
  if (!next) return { current, next, remaining: 0, progress: 1 };
  return {
    current,
    next,
    remaining: Math.max(0, next.minBalance - value),
    progress: Math.min(1, Math.max(0, (value - current.minBalance) / (next.minBalance - current.minBalance))),
  };
}
