import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
      clearAuth: () => {
        import('@/lib/stellar/kit').then(({ getKit }) => {
          getKit().disconnect().catch(() => {});
        });
        set({ contractId: null, isAuthenticated: false });
      },
    }),
    {
      name: 'smartpig-auth',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
