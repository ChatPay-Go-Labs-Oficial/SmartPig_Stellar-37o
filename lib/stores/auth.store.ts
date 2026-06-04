import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthState {
  walletAddress: string | null;
  walletAccountId: string | null;
  contractId: string | null;
  isAuthenticated: boolean;
  isActivated: boolean;
  _hydrated: boolean;
  setAuth: (contractId: string) => void;
  setWalletAddress: (address: string) => void;
  setWalletAccountId: (id: string) => void;
  setIsActivated: (activated: boolean) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      walletAddress: null,
      walletAccountId: null,
      contractId: null,
      isAuthenticated: false,
      isActivated: false,
      _hydrated: false,
      setAuth: (contractId) => set({ contractId, isAuthenticated: true }),
      setWalletAddress: (address) => set({ walletAddress: address }),
      setWalletAccountId: (id) => set({ walletAccountId: id }),
      setIsActivated: (activated) => set({ isActivated: activated }),
      clearAuth: () => {
        import('@/lib/stellar/kit').then(({ getKit }) => {
          getKit().disconnect().catch(() => {});
        });
        set({ walletAddress: null, walletAccountId: null, contractId: null, isAuthenticated: false, isActivated: false });
      },
    }),
    {
      name: 'smartpig-auth',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => () => {
        useAuthStore.setState({ _hydrated: true });
      },
    },
  ),
);
