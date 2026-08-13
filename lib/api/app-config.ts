import { apiClient } from "./client";

export type AppPlatform = "ios" | "android";

export interface AppVersionConfig {
  platform: "IOS" | "ANDROID";
  minVersion: string;
  latestVersion: string;
  storeUrl: string;
}

export async function getAppVersionConfig(
  platform: AppPlatform,
): Promise<AppVersionConfig> {
  const { data } = await apiClient.get<AppVersionConfig>(
    "/app-config/version",
    { params: { platform } },
  );
  return data;
}
