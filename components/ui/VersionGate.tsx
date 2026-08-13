import { useEffect } from "react";
import * as Application from "expo-application";
import { useAppConfigQuery } from "@/lib/queries/app-config.queries";
import { useVersionGateStore } from "@/lib/stores/version-gate.store";
import { isVersionBelow } from "@/lib/utils/version";
import { MandatoryUpdateModal } from "./MandatoryUpdateModal";
import { UpdateAvailableBanner } from "./UpdateAvailableBanner";

export function VersionGate() {
  const { data: config } = useAppConfigQuery();
  const setForceUpdateRequired = useVersionGateStore(
    (s) => s.setForceUpdateRequired,
  );
  const dismissedLatestVersion = useVersionGateStore(
    (s) => s.dismissedLatestVersion,
  );
  const dismissBanner = useVersionGateStore((s) => s.dismissBanner);

  const currentVersion = Application.nativeApplicationVersion ?? "0.0.0";
  const mustForceUpdate = !!config && isVersionBelow(currentVersion, config.minVersion);
  const hasRecommendedUpdate =
    !!config && !mustForceUpdate && isVersionBelow(currentVersion, config.latestVersion);
  const bannerDismissedForThisVersion =
    !!config && dismissedLatestVersion === config.latestVersion;

  useEffect(() => {
    setForceUpdateRequired(mustForceUpdate);
  }, [mustForceUpdate, setForceUpdateRequired]);

  if (mustForceUpdate && config) {
    return <MandatoryUpdateModal storeUrl={config.storeUrl} />;
  }

  if (hasRecommendedUpdate && config && !bannerDismissedForThisVersion) {
    return (
      <UpdateAvailableBanner
        storeUrl={config.storeUrl}
        onDismiss={() => dismissBanner(config.latestVersion)}
      />
    );
  }

  return null;
}
