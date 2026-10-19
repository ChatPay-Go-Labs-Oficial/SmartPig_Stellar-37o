import type { ImageSourcePropType } from 'react-native';

/**
 * Níveis do porquinho, pelo total guardado em dólar. Fonte única para a Home,
 * a Evolução do porquinho, a animação de nível e o Perfil.
 *
 * Artes do kit V2 (Figma, componentes "Mascote/…"). Os dois últimos níveis
 * são o Porquinho Rei ("Gold King Pig": coroa e capa) e o Porquinho Rei
 * Dourado ("King Pig": armadura dourada).
 */
export interface PigLevel {
  /**
   * Identificador fixo, gravado no aparelho como "último nível visto". Os
   * nomes podem mudar (o 4º e o 5º já mudaram); o id não muda.
   */
  id: 'bebe' | 'esperto' | 'forte' | 'rei' | 'rei-dourado';
  label: string;
  minBalance: number;
  art: ImageSourcePropType;
  /**
   * Proporção (largura / altura) da caixa do mascote no Figma. A arte é
   * desenhada com `contain` dentro dela: o Bebê é quadrado, o Esperto tem a
   * caixa mais estreita, os demais seguem a arte (2:3).
   */
  aspect: number;
  /** Mascote do cabeçalho da Home ("Home · Tela" 04/04a/04b), preso pela base. */
  hero: { width: number; height: number };
}

const TALL = 0.673;
const KING_HERO = { width: 123, height: 184 };

export const PIG_LEVELS: readonly PigLevel[] = [
  {
    id: 'bebe',
    label: 'Porquinho Bebê',
    minBalance: 0,
    art: require('@/assets/images/v2/mascote-baby-pig.png'),
    aspect: 1,
    hero: { width: 128, height: 140 },
  },
  {
    id: 'esperto',
    label: 'Porquinho Esperto',
    minBalance: 100,
    art: require('@/assets/images/v2/mascote-smart-pig.png'),
    aspect: 0.553,
    hero: { width: 103, height: 186 },
  },
  {
    id: 'forte',
    label: 'Porquinho Forte',
    minBalance: 500,
    art: require('@/assets/images/v2/mascote-strong-pig.png'),
    aspect: TALL,
    hero: KING_HERO,
  },
  {
    id: 'rei',
    label: 'Porquinho Rei',
    minBalance: 1000,
    art: require('@/assets/images/v2/mascote-gold-king-pig.png'),
    aspect: TALL,
    hero: KING_HERO,
  },
  {
    id: 'rei-dourado',
    label: 'Porquinho Rei Dourado',
    minBalance: 5000,
    art: require('@/assets/images/v2/mascote-king-pig.png'),
    aspect: TALL,
    hero: KING_HERO,
  },
];

/**
 * Caixa do mascote numa altura: o Bebê ocupa `squareRatio` dela (Figma: 46
 * na miniatura de 52, 118 na moldura de 150); os altos usam a altura cheia.
 */
export function mascotBox(level: PigLevel, height: number, squareRatio = 0.88) {
  if (level.aspect === 1) {
    const side = Math.round(height * squareRatio);
    return { width: side, height: side };
  }
  return { width: Math.round(height * level.aspect), height };
}

export interface LevelProgress {
  current: PigLevel;
  index: number;
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
  if (!next) return { current, index, next, remaining: 0, progress: 1 };
  return {
    current,
    index,
    next,
    remaining: Math.max(0, next.minBalance - value),
    progress: Math.min(1, Math.max(0, (value - current.minBalance) / (next.minBalance - current.minBalance))),
  };
}

/** Milhar com vírgula, como o resto dos valores em dólar do app: 1,000. */
export const groupThousands = (value: number) =>
  Math.trunc(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
