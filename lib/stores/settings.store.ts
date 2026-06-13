import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsState {
  muted: boolean;
  toggleMute: () => void;
  setMuted: (muted: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      muted: false,
      toggleMute: () => set((state) => ({ muted: !state.muted })),
      setMuted: (muted) => set({ muted }),
    }),
    {
      name: 'smartpig-settings',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
