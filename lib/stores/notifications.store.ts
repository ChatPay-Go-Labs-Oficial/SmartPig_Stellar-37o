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
   * Janelas abertas que seguram a pré-tela: toda janela que pode estar na
   * Home avisa enquanto está aberta (ver hooks/use-hold-notifications-prompt).
   * Enquanto houver alguma, a pré-tela espera (ver NotificationsGate).
   */
  holds: number;
  /**
   * A pré-tela ocupa a tela: aberta, descendo ou com o pedido do sistema
   * aberto. Janela que abre sozinha (a Evolução! da Home, a subida de nível)
   * espera ficar false: no iOS, um Modal que abre enquanto outro ainda sai não
   * aparece.
   */
  promptOnScreen: boolean;
  /**
   * A conta foi criada nesta abertura do app (cadastro, `isNewUser` no login):
   * a pré-tela fica para a próxima abertura. Não persistido.
   */
  newAccount: boolean;
  /**
   * Rota que um toque em notificação pediu e que ainda espera a sessão ficar
   * pronta e desbloqueada (ver components/notifications/NotificationsGate).
   */
  pendingUrl: string | null;
  setPermission: (permission: PushPermission) => void;
  answerPrompt: () => void;
  hold: () => void;
  release: () => void;
  setPromptOnScreen: (onScreen: boolean) => void;
  markNewAccount: () => void;
  clearNewAccount: () => void;
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
      promptOnScreen: false,
      newAccount: false,
      pendingUrl: null,
      setPermission: (permission) => set({ permission }),
      answerPrompt: () => set({ promptAnswered: true }),
      hold: () => set((s) => ({ holds: s.holds + 1 })),
      release: () => set((s) => ({ holds: Math.max(0, s.holds - 1) })),
      setPromptOnScreen: (promptOnScreen) => set({ promptOnScreen }),
      markNewAccount: () => set({ newAccount: true }),
      clearNewAccount: () => set({ newAccount: false }),
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
