import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface WalletState {
  walletAddress: string | null;
  setWalletAddress: (address: string) => void;
  clearWallet: () => void;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set) => ({
      walletAddress: null,
      setWalletAddress: (address) => set({ walletAddress: address }),
      clearWallet: () => set({ walletAddress: null }),
    }),
    {
      name: 'stellarpig-wallet',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
