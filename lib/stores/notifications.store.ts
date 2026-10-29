import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

/** Status da permissão do sistema; null enquanto o app ainda não leu. */
export type PushPermission = 'granted' | 'denied' | 'undetermined';

interface NotificationsState {
  /**
   * A pré-tela de permissão já teve resposta (aceitou, recusou ou fechou).
   * Não volta a aparecer: quem recusou liga depois em Perfil > Preferências.
   * Persistido porque a pergunta é do aparelho, não da sessão.
   */
  promptAnswered: boolean;
  /** Permissão do sistema, relida ao abrir e ao voltar ao app. */
  permission: PushPermission | null;
  /** Uma ação de valor terminou (primeiro guardar): a pré-tela pode aparecer. */
  promptQueued: boolean;
  /**
   * Rota que um toque em notificação pediu e que ainda espera a sessão ficar
   * pronta e desbloqueada (ver components/notifications/NotificationsGate).
   */
  pendingUrl: string | null;
  setPermission: (permission: PushPermission) => void;
  queuePrompt: () => void;
  answerPrompt: () => void;
  setPendingUrl: (url: string | null) => void;
  /** O que é da sessão (rota pendente, pré-tela na fila) não passa para a próxima conta. */
  resetSession: () => void;
}

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set) => ({
      promptAnswered: false,
      permission: null,
      promptQueued: false,
      pendingUrl: null,
      setPermission: (permission) => set({ permission }),
      queuePrompt: () => set({ promptQueued: true }),
      answerPrompt: () => set({ promptAnswered: true, promptQueued: false }),
      setPendingUrl: (pendingUrl) => set({ pendingUrl }),
      resetSession: () => set({ promptQueued: false, pendingUrl: null }),
    }),
    {
      name: 'smartpig-notifications',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ promptAnswered: state.promptAnswered }),
    },
  ),
);
