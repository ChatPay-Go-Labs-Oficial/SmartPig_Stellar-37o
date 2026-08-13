import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppState, Platform, type AppStateStatus } from "react-native";
import { getAppVersionConfig, type AppPlatform } from "@/lib/api/app-config";

export const appConfigKeys = {
  version: (platform: AppPlatform) => ["app-version-config", platform] as const,
};

export function useAppConfigQuery() {
  const platform: AppPlatform = Platform.OS === "ios" ? "ios" : "android";

  const query = useQuery({
    queryKey: appConfigKeys.version(platform),
    queryFn: () => getAppVersionConfig(platform),
    staleTime: 1000 * 60 * 30,
    retry: 1,
  });

  const appStateRef = useRef(AppState.currentState);
  const refetchRef = useRef(query.refetch);
  refetchRef.current = query.refetch;

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState: AppStateStatus) => {
      const cameToForeground =
        appStateRef.current.match(/inactive|background/) && nextAppState === "active";
      appStateRef.current = nextAppState;
      if (cameToForeground) {
        refetchRef.current();
      }
    });
    return () => subscription.remove();
  }, []);

  return query;
}
