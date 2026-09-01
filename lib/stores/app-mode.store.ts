import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AppMode = 'lite' | 'pro';

interface AppModeState {
  mode: AppMode;
  /** O explicador do Pro já foi visto — evita reabrir a cada ativação. */
  hasSeenProExplainer: boolean;
  /**
   * Momento da última mudança local. Não tem consumidor hoje: existe para que
   * a sincronização com o backend possa resolver conflito por last-write-wins
   * sem exigir migração do formato já persistido nos aparelhos.
   */
  modeUpdatedAt: number;
  _hydrated: boolean;

  setMode: (mode: AppMode) => void;
  markProExplainerSeen: () => void;
  /**
   * Aplica um valor vindo do servidor. Só a camada de sync chama isso — telas
   * usam setMode. Ignora o remoto quando o local é mais recente.
   */
  applyRemoteMode: (mode: AppMode, updatedAt: number) => void;
}

/**
 * Modo Lite/Pro do app. Lite é o padrão e é a voz da marca (ver README: a
 * infraestrutura cripto não aparece para o usuário); Pro é opt-in e revela
 * terminologia real, dados on-chain e precisão numérica completa.
 *
 * O default pré-hidratação é 'lite' de propósito: no frame anterior à
 * hidratação um usuário Pro vê Lite, o que é inofensivo, enquanto o inverso
 * mostraria endereço Stellar e transferência para um usuário Lite.
 */
export const useAppModeStore = create<AppModeState>()(
  persist(
    (set, get) => ({
      mode: 'lite',
      hasSeenProExplainer: false,
      modeUpdatedAt: 0,
      _hydrated: false,

      setMode: (mode) => set({ mode, modeUpdatedAt: Date.now() }),
      markProExplainerSeen: () => set({ hasSeenProExplainer: true }),
      applyRemoteMode: (mode, updatedAt) => {
        if (updatedAt <= get().modeUpdatedAt) return;
        set({ mode, modeUpdatedAt: updatedAt });
      },
    }),
    {
      name: 'smartpig-app-mode',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        mode: s.mode,
        hasSeenProExplainer: s.hasSeenProExplainer,
        modeUpdatedAt: s.modeUpdatedAt,
      }),
      onRehydrateStorage: () => () => {
        useAppModeStore.setState({ _hydrated: true });
      },
    },
  ),
);
