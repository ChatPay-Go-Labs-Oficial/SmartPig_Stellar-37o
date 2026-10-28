import { create } from 'zustand';

// Porquinho liberado pela trilha (Figma 11b). A conclusão da lição que libera
// pede a cena ao abrir o porquinho ("Ver o porquinho em euro"); ela aparece
// por cima da aba Guardar, já nele. A liberação só chega uma vez, na resposta
// que a causou: nada fica guardado.

interface PiggyUnlockState {
  /** Vault liberado a celebrar; null sem cena. */
  pending: string | null;
  celebrate: (vaultId: string) => void;
  dismiss: () => void;
}

export const usePiggyUnlockStore = create<PiggyUnlockState>()((set) => ({
  pending: null,
  celebrate: (vaultId) => set({ pending: vaultId }),
  dismiss: () => set({ pending: null }),
}));
