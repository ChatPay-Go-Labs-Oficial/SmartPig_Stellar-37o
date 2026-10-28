import { apiClient } from './client';

// Nome de usuário (@): único, permanente e resolvido só por nome exato, sem
// lista nem autocompletar. O backend resolve o @ para o endereço Stellar; o
// app monta e assina o envio.

/** A mesma regra do backend: 3 a 20, começa com letra, minúsculas, números, ponto e sublinhado. */
export const USERNAME_PATTERN = /^[a-z][a-z0-9._]{2,19}$/;

/** Como o backend normaliza (sem espaços nas pontas, minúsculas), sem o "@" digitado. */
export function normalizeUsername(raw: string): string {
  return raw.trim().replace(/^@+/, '').toLowerCase();
}

/** Formato inválido nunca vai ao backend. */
export function isValidUsername(username: string): boolean {
  return USERNAME_PATTERN.test(username);
}

export type UsernameAvailability =
  | { available: true }
  | { available: false; reason: 'INVALID' | 'TAKEN' };

/** Quem recebe por @. */
export interface ResolvedUsername {
  username: string;
  /** Nome do cadastro só quando verificado; senão "Usuário PigFi". */
  displayName: string;
  verified: boolean;
  stellarAddress: string;
  /** Moedas que a conta recebe hoje (trustlines; XLM é nativo). Conferir de novo antes de assinar. */
  receives: { USDC: boolean; EURC: boolean; XLM: boolean };
}

/** `signal` cancela a consulta de um nome que a pessoa já trocou. */
export const checkUsernameAvailability = async (
  username: string,
  signal?: AbortSignal,
): Promise<UsernameAvailability> => {
  const { data } = await apiClient.get(`/usernames/${encodeURIComponent(username)}/availability`, {
    signal,
  });
  return data;
};

/** Cria o @ da pessoa. Erros: USERNAME_INVALID (422), USERNAME_TAKEN e USERNAME_ALREADY_SET (409). */
export const createUsername = async (username: string): Promise<{ username: string }> => {
  const { data } = await apiClient.post('/users/me/username', { username });
  return data;
};

/** Erro: USERNAME_NOT_FOUND (404). */
export const resolveUsername = async (username: string): Promise<ResolvedUsername> => {
  const { data } = await apiClient.get(`/usernames/${encodeURIComponent(username)}`);
  return data;
};
