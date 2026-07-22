import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Holds a gift code waiting to be claimed. The code can arrive before the
 * user even has an account (install referrer / manual entry), so it must
 * survive the whole auth + onboarding flow and app restarts.
 */
interface GiftState {
  pendingGiftCode: string | null;
  /** Install referrer is only meaningful on the very first launch. */
  referrerChecked: boolean;
  _hydrated: boolean;
  setPendingGiftCode: (code: string | null) => void;
  setReferrerChecked: () => void;
}

export const useGiftStore = create<GiftState>()(
  persist(
    (set) => ({
      pendingGiftCode: null,
      referrerChecked: false,
      _hydrated: false,
      setPendingGiftCode: (code) => set({ pendingGiftCode: code }),
      setReferrerChecked: () => set({ referrerChecked: true }),
    }),
    {
      name: 'smartpig-gift',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => () => {
        useGiftStore.setState({ _hydrated: true });
      },
    },
  ),
);
