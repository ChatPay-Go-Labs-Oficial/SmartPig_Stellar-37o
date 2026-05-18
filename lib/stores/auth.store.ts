import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface AuthState {
  userId: string | null;
  userName: string | null;
  contractId: string | null;
  isAuthenticated: boolean;
  isOnboarded: boolean;
  setAuth: (contractId: string) => void;
  setUserId: (userId: string) => void;
  setUserName: (name: string) => void;
  setOnboarded: () => void;
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
      setAuth: (contractId) => set({ contractId, isAuthenticated: true }),
      setUserId: (userId) => set({ userId }),
      setUserName: (userName) => set({ userName }),
      setOnboarded: () => set({ isOnboarded: true }),
      clearAuth: () => set({ userId: null, userName: null, contractId: null, isAuthenticated: false, isOnboarded: false }),
    }),
    {
      name: 'stellarpig-auth',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
