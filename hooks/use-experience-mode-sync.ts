import { useEffect, useRef } from 'react';
import { useAppModeReady } from '@/hooks/use-app-mode';
import { useCurrentUser, usePushExperienceMode } from '@/lib/queries/users.queries';
import { useAppModeStore } from '@/lib/stores/app-mode.store';
import { reconcileExperienceMode } from '@/lib/utils/experience-mode';

/**
 * Concilia o modo Lite/Pro do aparelho com o do backend quando a sessão
 * começa (login ou abertura com sessão salva), uma vez por conta. Vence quem
 * mudou por último (lib/utils/experience-mode.ts). As trocas feitas depois
 * vão ao backend na hora (useAppModeActions).
 */
export function useExperienceModeSync() {
  const modeReady = useAppModeReady();
  const { data: user } = useCurrentUser();
  const { mutate: pushMode } = usePushExperienceMode();
  const reconciledFor = useRef<string | null>(null);

  useEffect(() => {
    if (!modeReady || !user || reconciledFor.current === user.id) return;
    reconciledFor.current = user.id;

    // Lido na hora, não por seletor: vale o modo deste instante.
    const device = useAppModeStore.getState();
    const decision = reconcileExperienceMode(
      { mode: device.mode, updatedAt: device.modeUpdatedAt },
      { mode: user.experienceMode, updatedAt: user.experienceModeUpdatedAt },
    );
    if (decision.action === 'push') pushMode();
    if (decision.action === 'pull') device.applyRemoteMode(decision.mode, decision.updatedAt);
  }, [modeReady, pushMode, user]);
}
