import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface VersionGateState {
  forceUpdateRequired: boolean;
  setForceUpdateRequired: (value: boolean) => void;
  dismissedLatestVersion: string | null;
  dismissBanner: (latestVersion: string) => void;
}

export const useVersionGateStore = create<VersionGateState>()(
  persist(
    (set) => ({
      forceUpdateRequired: false,
      setForceUpdateRequired: (value) => set({ forceUpdateRequired: value }),
      dismissedLatestVersion: null,
      dismissBanner: (latestVersion) =>
        set({ dismissedLatestVersion: latestVersion }),
    }),
    {
      name: "smartpig-version-gate",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        dismissedLatestVersion: state.dismissedLatestVersion,
      }),
    },
  ),
);
