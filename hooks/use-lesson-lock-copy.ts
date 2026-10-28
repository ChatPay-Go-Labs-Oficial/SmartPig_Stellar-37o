import { useMemo } from 'react';
import { useTerms } from '@/hooks/use-terms';
import { useLearningModules } from '@/lib/queries/learning.queries';
import { unlockSteps, unlockingLesson, type LessonLock } from '@/lib/utils/vault-access';

export interface UnlockStepCopy {
  key: string;
  /** Lição “Fundamentos” / Chegar ao Nível 5. */
  label: string;
  done: boolean;
}

/**
 * Textos do bloqueio pela trilha (Figma 10b, 10c, 11a, 11c e 17a), com o
 * número e o título das lições de GET /learning/modules, a mesma leitura da
 * Trilha. Antes de ela chegar, o número sai da chave ('M3' → 3).
 */
export function useLessonLockCopy() {
  const { t, p } = useTerms();
  const modules = useLearningModules().data;

  return useMemo(
    () => ({
      /** "Libera ao concluir a lição 3"; com uma só faltando, "Falta 1 lição" (11a). */
      caption(lock: LessonLock): string {
        const lesson = unlockingLesson(lock, modules);
        if (lesson === null) return lock.requiredLevel ? p('guardar.lock.level', { level: lock.requiredLevel }) : '';
        return lock.missingModules.length === 1 ? t('guardar.lock.one') : p('guardar.lock.until', { lesson });
      },
      /** Selo à direita das linhas bloqueadas (17a): "Lição 3". */
      pill(lock: LessonLock): string | null {
        const lesson = unlockingLesson(lock, modules);
        if (lesson !== null) return p('guardar.lock.pill', { lesson });
        return lock.requiredLevel ? p('guardar.lock.levelPill', { level: lock.requiredLevel }) : null;
      },
      /** Passos do "Pra liberar": as lições até a que libera e, se houver, o nível. */
      steps(lock: LessonLock): UnlockStepCopy[] {
        return unlockSteps(lock, modules).map((step) => ({
          key: step.key,
          label:
            step.kind === 'lesson'
              ? p('guardar.unlock.lesson', { title: step.title })
              : p('guardar.unlock.level', { level: step.level }),
          done: step.done,
        }));
      },
    }),
    [modules, p, t],
  );
}
