import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthState {
  walletAddress: string | null;
  walletAccountId: string | null;
  contractId: string | null;
  isAuthenticated: boolean;
  isActivated: boolean;
  /**
   * Quando a conta foi criada no backend (ISO). Vem no login; sessões de antes
   * deste campo só o recebem no próximo login.
   */
  accountCreatedAt: string | null;
  /** Último nível do porquinho visto, por carteira: o id de constants/pig-levels. */
  lastSeenPigLevelByWallet: Record<string, string>;
  _hydrated: boolean;
  setAuth: (contractId: string) => void;
  setWalletAddress: (address: string) => void;
  setWalletAccountId: (id: string) => void;
  setIsActivated: (activated: boolean) => void;
  setAccountCreatedAt: (createdAt: string | null) => void;
  setLastSeenPigLevel: (walletAddress: string, level: string) => void;
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
      accountCreatedAt: null,
      lastSeenPigLevelByWallet: {},
      _hydrated: false,
      setAuth: (contractId) => set({ contractId, isAuthenticated: true }),
      setWalletAddress: (address) => set({ walletAddress: address }),
      setWalletAccountId: (id) => set({ walletAccountId: id }),
      setIsActivated: (activated) => set({ isActivated: activated }),
      setAccountCreatedAt: (createdAt) => set({ accountCreatedAt: createdAt }),
      setLastSeenPigLevel: (walletAddress, level) =>
        set((state) => ({
          lastSeenPigLevelByWallet: {
            ...state.lastSeenPigLevelByWallet,
            [walletAddress]: level,
          },
        })),
      clearAuth: () => {
        import('@/lib/stellar/kit').then(({ getKit }) => {
          getKit().disconnect().catch(() => {});
        });
        set({
          walletAddress: null,
          walletAccountId: null,
          contractId: null,
          isAuthenticated: false,
          isActivated: false,
          accountCreatedAt: null,
        });
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
