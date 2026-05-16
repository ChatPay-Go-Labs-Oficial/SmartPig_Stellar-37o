import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface AuthState {
  userId: string | null;
  userName: string | null;
  contractId: string | null;
  isAuthenticated: boolean;
  isOnboarded: boolean;
  onboardingStatus: 'unknown' | 'not_started' | 'organization_created' | 'completed';
  setAuth: (contractId: string) => void;
  setUserId: (userId: string) => void;
  setUserName: (name: string) => void;
  setOnboarded: () => void;
  setOnboardingStatus: (status: AuthState['onboardingStatus']) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      userId: null,
      userName: null,
      contractId: null,
      isAuthenticated: false,
      isOnboarded: false,
      onboardingStatus: 'unknown',
      setAuth: (contractId) => set({ contractId, isAuthenticated: true, onboardingStatus: 'unknown' }),
      setUserId: (userId) => set({ userId }),
      setUserName: (userName) => set({ userName }),
      setOnboarded: () => set({ isOnboarded: true, onboardingStatus: 'completed' }),
      setOnboardingStatus: (onboardingStatus) =>
        set({ onboardingStatus, isOnboarded: onboardingStatus === 'completed' }),
      clearAuth: () =>
        set({
          userId: null,
          userName: null,
          contractId: null,
          isAuthenticated: false,
          isOnboarded: false,
          onboardingStatus: 'unknown',
        }),
    }),
    {
      name: 'stellarpig-auth',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
