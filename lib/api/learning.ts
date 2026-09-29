import { apiClient } from './client';

export interface VaultAccess {
  requiredPoints: number | null;
  points: number;
  unlocked: boolean;
  pointsRemaining: number | null;
}
export interface LearningProgress {
  points: number;
  completedQuestionIds: string[];
  completedLessonIds: number[];
  vaultAccess: Record<string, VaultAccess>;
}
export interface LearningLesson {
  id: number;
  version: number;
  title: string;
  subtitle: string;
  icon: string;
  duration: string;
  xp: number;
  cards: { title: string; content: string }[];
  questions: { id: string; question: string; options: { id: string; text: string }[]; points: number }[];
}
export interface AnswerResult {
  correct: boolean;
  explanation: string;
  awardedPoints: number;
  progress: LearningProgress;
}
export async function getLessons(): Promise<LearningLesson[]> {
  return (await apiClient.get('/learning/lessons')).data;
}
export async function getLearningProgress(): Promise<LearningProgress> {
  return (await apiClient.get('/learning/progress')).data;
}
export async function answerQuestion(lessonId: number, questionId: string, optionId: string, version: number): Promise<AnswerResult> {
  return (await apiClient.post(`/learning/lessons/${lessonId}/answers`, { questionId, optionId, version })).data;
}
