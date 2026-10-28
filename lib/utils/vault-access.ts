import type { LearningModuleSummary } from '@/lib/api/learning';
import type { Vault } from '@/lib/api/vaults';

// Bloqueio dos porquinhos pela trilha (E6, plano 5.4). A regra é do backend:
// o `access` de cada vault diz se o Lite precisa das lições e quais faltam. O
// bloqueio vale só para guardar; ver saldo, tirar e sacar nunca são bloqueados.

export interface LessonLock {
  /** Lições que faltam ('M2', 'M3'). */
  missingModules: string[];
  /** Nível mínimo, só quando a regra pede um (> 0). */
  requiredLevel: number | null;
  currentLevel: number | null;
}

/** Bloqueio do vault pelas lições; null quando liberado ou sem `access`. */
export function lessonLockOf(vault: Pick<Vault, 'access'>): LessonLock | null {
  const access = vault.access;
  if (!access?.educationRequired || !access.educationEnforced || access.educationUnlocked) return null;
  return {
    missingModules: access.missingModules,
    requiredLevel: access.requiredLevel !== null && access.requiredLevel > 0 ? access.requiredLevel : null,
    currentLevel: access.currentLevel,
  };
}

/** Número da lição na trilha ('M3' → 3), pela ordem do backend quando já carregou. */
export function lessonNumber(key: string, modules?: readonly LearningModuleSummary[]): number {
  return modules?.find((module) => module.key === key)?.displayOrder ?? (Number(key.replace(/\D/g, '')) || 0);
}

/**
 * A lição que, concluída, libera o porquinho: a última que falta. As regras
 * do Meridian vão do começo da trilha até uma lição (euro até a 3, cripto até
 * a 5), então as anteriores a ela são as que a regra pede.
 */
export function unlockingLesson(lock: LessonLock, modules?: readonly LearningModuleSummary[]): number | null {
  if (lock.missingModules.length === 0) return null;
  return Math.max(...lock.missingModules.map((key) => lessonNumber(key, modules)));
}

export type UnlockStep =
  | { kind: 'lesson'; key: string; title: string; done: boolean }
  | { kind: 'level'; key: string; level: number; done: boolean };

/**
 * Passos do "Pra liberar" (Figma 10b, 11a, 11c): as lições até a que libera,
 * feitas ou não, e o nível quando a regra pede um. Sem as lições carregadas,
 * só o nível (os títulos vêm de GET /learning/modules).
 */
export function unlockSteps(lock: LessonLock, modules?: readonly LearningModuleSummary[]): UnlockStep[] {
  const steps: UnlockStep[] = [];
  const last = unlockingLesson(lock, modules);
  if (last !== null && modules) {
    const missing = new Set(lock.missingModules);
    for (const module of [...modules].sort((a, b) => a.displayOrder - b.displayOrder)) {
      if (module.displayOrder > last) break;
      steps.push({ kind: 'lesson', key: module.key, title: module.title, done: !missing.has(module.key) });
    }
  }
  if (lock.requiredLevel !== null) {
    steps.push({
      kind: 'level',
      key: 'level',
      level: lock.requiredLevel,
      done: (lock.currentLevel ?? 0) >= lock.requiredLevel,
    });
  }
  return steps;
}
