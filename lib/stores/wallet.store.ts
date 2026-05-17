import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface WalletState {
  walletAddress: string | null;
  walletAccountId: string | null;
  setWalletAddress: (address: string) => void;
  setWalletAccountId: (id: string) => void;
  clearWallet: () => void;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set) => ({
      walletAddress: null,
      walletAccountId: null,
      setWalletAddress: (address) => set({ walletAddress: address }),
      setWalletAccountId: (id) => set({ walletAccountId: id }),
      clearWallet: () => set({ walletAddress: null, walletAccountId: null }),
    }),
    {
      name: 'stellarpig-wallet',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
