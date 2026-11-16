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
  /**
   * Telas de entrada abertas que não têm store próprio (ex.: a Evolução! da
   * Home). Enquanto houver alguma, a pré-tela espera (ver NotificationsGate).
   */
  holds: number;
  /**
   * Rota que um toque em notificação pediu e que ainda espera a sessão ficar
   * pronta e desbloqueada (ver components/notifications/NotificationsGate).
   */
  pendingUrl: string | null;
  setPermission: (permission: PushPermission) => void;
  answerPrompt: () => void;
  hold: () => void;
  release: () => void;
  setPendingUrl: (url: string | null) => void;
  /** O que é da sessão (rota pendente) não passa para a próxima conta. */
  resetSession: () => void;
}

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set) => ({
      promptAnswered: false,
      permission: null,
      holds: 0,
      pendingUrl: null,
      setPermission: (permission) => set({ permission }),
      answerPrompt: () => set({ promptAnswered: true }),
      hold: () => set((s) => ({ holds: s.holds + 1 })),
      release: () => set((s) => ({ holds: Math.max(0, s.holds - 1) })),
      setPendingUrl: (pendingUrl) => set({ pendingUrl }),
      resetSession: () => set({ pendingUrl: null }),
    }),
    {
      name: 'smartpig-notifications',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ promptAnswered: state.promptAnswered }),
    },
  ),
);
