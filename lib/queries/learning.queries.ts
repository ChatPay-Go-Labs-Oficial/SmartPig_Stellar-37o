import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { answerQuestion, getLearningProgress, getLessons } from '../api/learning';
import { useAuthStore } from '../stores/auth.store';

export const learningKeys = {
  lessons: ['learning', 'lessons'] as const,
  progress: (userId: string | null) => ['learning', 'progress', userId] as const,
};
export function useLearning() {
  const userId = useAuthStore((s) => s.contractId);
  const lessons = useQuery({ queryKey: learningKeys.lessons, queryFn: getLessons, enabled: !!userId });
  const progress = useQuery({ queryKey: learningKeys.progress(userId), queryFn: getLearningProgress, enabled: !!userId });
  return { lessons, progress };
}
export function useAnswerQuestion() {
  const userId = useAuthStore((s) => s.contractId);
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ lessonId, questionId, optionId, version }: { lessonId: number; questionId: string; optionId: string; version: number }) => answerQuestion(lessonId, questionId, optionId, version),
    onSuccess: () => {
      // Refetch canonical totals; out-of-order responses cannot lower cached points.
      void client.invalidateQueries({ queryKey: learningKeys.progress(userId) });
      void client.invalidateQueries({ queryKey: ['vaults'] });
    },
  });
}
