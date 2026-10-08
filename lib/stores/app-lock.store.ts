import { create } from 'zustand';

interface AppLockState {
  /**
   * O AppGate está cobrindo o app: carregando a sessão, no erro de sessão ou no
   * cadeado de biometria. A home é montada por baixo do cadeado, então o que ela
   * abriria sozinha (um Modal) precisa esperar — o iOS não apresenta um segundo
   * Modal enquanto o do gate está apresentado, e o descarta em silêncio.
   */
  locked: boolean;
  setLocked: (locked: boolean) => void;
}

// Não persistido: reflete só o estado do gate nesta execução do app.
export const useAppLockStore = create<AppLockState>((set) => ({
  locked: true,
  setLocked: (locked) => set({ locked }),
}));
