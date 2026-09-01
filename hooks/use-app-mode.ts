import { useAppModeStore, type AppMode } from '@/lib/stores/app-mode.store';

export type { AppMode };

/**
 * Fronteira de acesso ao modo Lite/Pro. Telas importam daqui e nunca do store
 * direto — é isso que permite plugar a sincronização com o backend depois sem
 * tocar em nenhuma tela.
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
  const setMode = useAppModeStore((s) => s.setMode);
  const markProExplainerSeen = useAppModeStore((s) => s.markProExplainerSeen);
  const hasSeenProExplainer = useAppModeStore((s) => s.hasSeenProExplainer);

  return { setMode, markProExplainerSeen, hasSeenProExplainer };
}
