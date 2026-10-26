import { apiClient } from './client';

/** Modo do produto no backend. No app é 'lite' | 'pro' (lib/utils/experience-mode.ts converte). */
export type ExperienceMode = 'LITE' | 'PRO';

/** GET /users/me. A pessoa vem do token, não do `userId`. */
export interface CurrentUser {
  id: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  /** null até a pessoa criar o nome de usuário, que é permanente. */
  username: string | null;
  usernameSetAt: string | null;
  isOnboarded: boolean;
  /** Já o modo efetivo: conta que nunca escolheu vem como PRO. */
  experienceMode: ExperienceMode;
  /** ISO da última escolha; null quando a pessoa nunca escolheu. */
  experienceModeUpdatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export const getCurrentUser = async (): Promise<CurrentUser> => {
  const { data } = await apiClient.get('/users/me');
  return data;
};

/** Grava o modo escolhido no app. Idempotente; devolve o perfil atualizado. */
export const updateExperienceMode = async (mode: ExperienceMode): Promise<CurrentUser> => {
  const { data } = await apiClient.patch('/users/me/experience-mode', { mode });
  return data;
};
