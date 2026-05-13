import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface AuthState {
  contractId: string | null;
  isAuthenticated: boolean;
  setAuth: (contractId: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      contractId: null,
      isAuthenticated: false,
      setAuth: (contractId) => set({ contractId, isAuthenticated: true }),
      clearAuth: () => set({ contractId: null, isAuthenticated: false }),
    }),
    {
      name: 'stellarpig-auth',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
