import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface PixState {
  pixKey: string;
  setPixKey: (key: string) => void;
}

export const usePixStore = create<PixState>()(
  persist(
    (set) => ({
      pixKey: '',
      setPixKey: (pixKey) => set({ pixKey }),
    }),
    {
      name: 'stellarpig-pix',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
