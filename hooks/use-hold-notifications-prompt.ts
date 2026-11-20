import { useEffect } from 'react';
import { useNotificationsStore } from '@/lib/stores/notifications.store';

/**
 * Segura a pré-tela de notificações enquanto `active` for verdadeiro. Toda
 * janela que pode estar aberta na Home (presente, saque, cenas de entrada,
 * Evolução!) chama este hook: a pré-tela só sobe com nenhuma na tela, e uma
 * janela nova só precisa avisar aqui (ver NotificationsGate).
 */
export function useHoldNotificationsPrompt(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const { hold, release } = useNotificationsStore.getState();
    hold();
    return release;
  }, [active]);
}
