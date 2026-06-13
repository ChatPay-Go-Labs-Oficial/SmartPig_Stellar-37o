import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface LearningProgress {
  completedLessonIds: number[];
  totalXp: number;
  updatedAt: string | null;
}

interface LearningState {
  progressByUser: Record<string, LearningProgress>;
  completeLesson: (userId: string, lessonId: number, xp: number) => void;
  resetProgress: (userId: string) => void;
}

const EMPTY_PROGRESS: LearningProgress = {
  completedLessonIds: [],
  totalXp: 0,
  updatedAt: null,
};

export function getLearningProgress(
  progressByUser: LearningState['progressByUser'],
  userId: string | null,
): LearningProgress {
  if (!userId) return EMPTY_PROGRESS;
  return progressByUser[userId] ?? EMPTY_PROGRESS;
}

export const useLearningStore = create<LearningState>()(
  persist(
    (set) => ({
      progressByUser: {},
      completeLesson: (userId, lessonId, xp) =>
        set((state) => {
          const current = state.progressByUser[userId] ?? EMPTY_PROGRESS;
          if (current.completedLessonIds.includes(lessonId)) return state;

          return {
            progressByUser: {
              ...state.progressByUser,
              [userId]: {
                completedLessonIds: [...current.completedLessonIds, lessonId].sort(
                  (a, b) => a - b,
                ),
                totalXp: current.totalXp + xp,
                updatedAt: new Date().toISOString(),
              },
            },
          };
        }),
      resetProgress: (userId) =>
        set((state) => {
          const progressByUser = { ...state.progressByUser };
          delete progressByUser[userId];
          return { progressByUser };
        }),
    }),
    {
      name: 'smartpig-learning-progress',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      partialize: (state) => ({ progressByUser: state.progressByUser }),
    },
  ),
);
