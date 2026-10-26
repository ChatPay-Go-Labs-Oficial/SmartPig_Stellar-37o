import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { hasApiErrorCode, retryUnlessClientError } from '@/lib/api/errors';
import {
  answerLearningQuestion,
  getLearningContent,
  getLearningModule,
  getLearningModules,
  getLearningProgress,
  saveLearningStep,
  type LearningAnswerBody,
} from '@/lib/api/learning';
import { experienceKeys } from '@/lib/queries/experience.queries';
import { refreshVaultAccess } from '@/lib/queries/vaults.queries';
import { useAuthStore } from '@/lib/stores/auth.store';

export const learningKeys = {
  all: ['learning'] as const,
  content: (userId: string) => ['learning', 'content', userId] as const,
  modules: (userId: string) => ['learning', 'modules', userId] as const,
  module: (moduleKey: string, userId: string) => ['learning', 'module', moduleKey, userId] as const,
  progress: (userId: string) => ['learning', 'progress', userId] as const,
};

/** Toda leitura da trilha é por conta e só roda com sessão. */
function useLearningOwner() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userId = useAuthStore((s) => s.contractId);
  return { userId: userId ?? '', enabled: isAuthenticated && !!userId };
}

/** Boas-vindas do módulo e dicionário. */
export function useLearningContent() {
  const { userId, enabled } = useLearningOwner();
  return useQuery({
    queryKey: learningKeys.content(userId),
    queryFn: getLearningContent,
    enabled,
    retry: retryUnlessClientError,
  });
}

/** As cinco lições, com conclusão e último passo de cada uma. */
export function useLearningModules() {
  const { userId, enabled } = useLearningOwner();
  return useQuery({
    queryKey: learningKeys.modules(userId),
    queryFn: getLearningModules,
    enabled,
    retry: retryUnlessClientError,
  });
}

/** Lição completa, com os passos já na ordem. */
export function useLearningModule(moduleKey: string) {
  const { userId, enabled } = useLearningOwner();
  return useQuery({
    queryKey: learningKeys.module(moduleKey, userId),
    queryFn: () => getLearningModule(moduleKey),
    enabled: enabled && !!moduleKey,
    retry: retryUnlessClientError,
  });
}

/** Perguntas acertadas e onde retomar. */
export function useLearningProgress() {
  const { userId, enabled } = useLearningOwner();
  return useQuery({
    queryKey: learningKeys.progress(userId),
    queryFn: getLearningProgress,
    enabled,
    retry: retryUnlessClientError,
  });
}

/**
 * Salva o passo atual para retomar em outro aparelho. Não bloqueia a lição:
 * se falhar, o passo seguinte salva de novo. A retomada e a lista ficam
 * marcadas como velhas e são relidas quando a Trilha voltar a aparecer.
 */
export function useSaveLearningStep() {
  const qc = useQueryClient();
  const { userId } = useLearningOwner();
  return useMutation({
    mutationKey: ['learning', 'step'],
    mutationFn: ({ moduleKey, stepKey }: { moduleKey: string; stepKey: string }) =>
      saveLearningStep(moduleKey, stepKey),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: learningKeys.progress(userId), refetchType: 'none' });
      qc.invalidateQueries({ queryKey: learningKeys.modules(userId), refetchType: 'none' });
    },
  });
}

export interface AnswerQuestionVariables extends LearningAnswerBody {
  moduleKey: string;
  questionKey: string;
}

/**
 * Responde uma pergunta. O retorno já traz conclusão, XP, níveis e liberações.
 *
 * - Retomada, lista de lições e nível são relidos.
 * - A lição aberta não é relida a cada resposta: ela segue na tela, e a
 *   próxima abertura busca a versão nova.
 * - Lição concluída ou porquinho liberado mudam o `access` dos vaults.
 * - Texto mudou no meio (409 LEARNING_CONTENT_VERSION_STALE): a lição é
 *   relida, para a pergunta voltar com a versão nova.
 */
export function useAnswerLearningQuestion() {
  const qc = useQueryClient();
  const { userId } = useLearningOwner();
  return useMutation({
    mutationKey: ['learning', 'answer'],
    mutationFn: ({ questionKey, optionId, contentVersion }: AnswerQuestionVariables) =>
      answerLearningQuestion(questionKey, { optionId, contentVersion }),
    onSuccess: (result, { moduleKey }) => {
      qc.invalidateQueries({
        queryKey: learningKeys.module(moduleKey, userId),
        refetchType: 'none',
      });
      qc.invalidateQueries({ queryKey: learningKeys.progress(userId) });
      qc.invalidateQueries({ queryKey: learningKeys.modules(userId) });
      qc.invalidateQueries({ queryKey: experienceKeys.profile(userId) });
      if (result.lessonCompleted || result.newUnlocks.length > 0) refreshVaultAccess(qc);
    },
    onError: (error, { moduleKey }) => {
      if (hasApiErrorCode(error, 'LEARNING_CONTENT_VERSION_STALE')) {
        qc.invalidateQueries({ queryKey: learningKeys.module(moduleKey, userId) });
      }
    },
  });
}
