import { useCallback } from 'react';
import { usePushExperienceMode } from '@/lib/queries/users.queries';
import { useAppModeStore, type AppMode } from '@/lib/stores/app-mode.store';

export type { AppMode };

/**
 * Fronteira de acesso ao modo Lite/Pro. Telas importam daqui e nunca do store
 * direto — é isso que permite a sincronização com o backend sem tocar em
 * nenhuma tela: a troca feita por aqui também vai ao backend.
 *
 * Os seletores são separados de propósito: quem só precisa escrever (o toggle)
 * não re-renderiza quando o valor muda, e quem só lê não re-renderiza quando
 * uma ação é recriada.
 */

/** Modo atual. Antes da hidratação retorna 'lite'. */
export function useAppMode(): AppMode {
  return useAppModeStore((s) => s.mode);
}

/** Açúcar para o caso mais comum: `{isPro && <DetalheOnChain />}`. */
export function useIsPro(): boolean {
  return useAppModeStore((s) => s.mode === 'pro');
}

/** true quando o valor persistido já foi lido do disco. */
export function useAppModeReady(): boolean {
  return useAppModeStore((s) => s._hydrated);
}

export function useAppModeActions() {
  const setLocalMode = useAppModeStore((s) => s.setMode);
  const markProExplainerSeen = useAppModeStore((s) => s.markProExplainerSeen);
  const hasSeenProExplainer = useAppModeStore((s) => s.hasSeenProExplainer);
  const { mutate: pushMode } = usePushExperienceMode();

  // Vale na hora no aparelho; o backend recebe em seguida. Se o envio falhar,
  // o aparelho fica com a troca mais nova e a conciliação do próximo início de
  // sessão reenvia (useExperienceModeSync).
  const setMode = useCallback(
    (mode: AppMode) => {
      setLocalMode(mode);
      pushMode();
    },
    [pushMode, setLocalMode],
  );

  return { setMode, markProExplainerSeen, hasSeenProExplainer };
}
