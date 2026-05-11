import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
      name: 'smartpig-wallet',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
