import { create } from 'zustand';
import type { ExperienceLevel } from '@/lib/api/experience';

// Cena de subida do Nível de Usuário (Figma 37a). Quem recebe do backend um
// `levelAfter` maior que o `levelBefore` (resposta que conclui a lição,
// recompensa do dia) pede a cena aqui; ela aparece por cima das abas. A
// subida só chega uma vez, na resposta que a causou: nada fica guardado.

interface LevelUpState {
  /** Nível novo a celebrar; null sem cena. */
  pending: ExperienceLevel | null;
  celebrate: (level: ExperienceLevel) => void;
  dismiss: () => void;
}

export const useLevelUpStore = create<LevelUpState>()((set) => ({
  pending: null,
  celebrate: (level) => set({ pending: level }),
  dismiss: () => set({ pending: null }),
}));
