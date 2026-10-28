import type { AssetLogoId, V2IconName } from '@/components/v2';

// Trilha "Introdução ao PigFi" (Figma "Trilha · Tela", 34a a 34j). Títulos,
// XP e conclusão vêm do backend; aqui fica só o desenho de cada lição e os
// marcos de liberação.

/** Ícone do nó de cada lição, pela chave (Figma 34a). */
const LESSON_ICONS: Record<string, V2IconName> = {
  M1: 'book',
  M2: 'wallet',
  M3: 'coins',
  M4: 'trending',
  M5: 'arrow-up',
};

export function lessonIcon(lessonKey: string): V2IconName {
  return LESSON_ICONS[lessonKey] ?? 'book';
}

export interface TrailMilestone {
  /** A lição que, concluída, libera o porquinho. */
  afterLesson: string;
  asset: AssetLogoId;
  /** "Libera o porquinho em euro" e "Porquinho em euro liberado". */
  name: string;
}

/**
 * Marcos do Lite (34a a 34d). Espelham a política publicada no backend
 * (docs/integracao-learning-experience.md, seção 5: euro com M1 a M3,
 * criptomoeda com M1 a M5), que nenhuma rota de leitura devolve. No Pro nada
 * fica bloqueado, e os marcos não aparecem (34g).
 */
export const TRAIL_MILESTONES: readonly TrailMilestone[] = [
  { afterLesson: 'M3', asset: 'EURC', name: 'euro' },
  { afterLesson: 'M5', asset: 'XLM', name: 'criptomoeda' },
];
