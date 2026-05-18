import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface AuthState {
  userId: string | null;
  walletAccountId: string | null;
  stellarAddress: string | null;
  isAuthenticated: boolean;
  setAuth: (params: { userId: string; walletAccountId: string; stellarAddress: string }) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      userId: null,
      walletAccountId: null,
      stellarAddress: null,
      isAuthenticated: false,
      setAuth: ({ userId, walletAccountId, stellarAddress }) =>
        set({ userId, walletAccountId, stellarAddress, isAuthenticated: true }),
      clearAuth: () =>
        set({ userId: null, walletAccountId: null, stellarAddress: null, isAuthenticated: false }),
    }),
    {
      name: 'stellarpig-auth-v2',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
