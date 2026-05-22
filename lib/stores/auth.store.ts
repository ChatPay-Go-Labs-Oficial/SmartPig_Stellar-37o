import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthState {
  walletAddress: string | null;
  contractId: string | null;
  isAuthenticated: boolean;
  setAuth: (contractId: string) => void;
  setWalletAddress: (address: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      walletAddress: null,
      contractId: null,
      isAuthenticated: false,
      setAuth: (contractId) => set({ contractId, isAuthenticated: true }),
      setWalletAddress: (address) => set({ walletAddress: address }),
      clearAuth: () => {
        import('@/lib/stellar/kit').then(({ getKit }) => {
          getKit().disconnect().catch(() => {});
        });
        set({ walletAddress: null, contractId: null, isAuthenticated: false });
      },
    }),
    {
      name: 'smartpig-auth',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
