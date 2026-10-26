import { isAxiosError } from 'axios';

/**
 * Erros de regra de negócio do backend chegam como
 * `{ statusCode, message, code?, details? }` (HttpExceptionFilter do backend).
 * Este é o ponto único para ler esse formato: quem trata o erro reage pelo
 * `code`, nunca pelo texto da mensagem.
 */

/** Códigos que o app trata pelo nome. */
export type ApiErrorCode =
  | 'LEARNING_CONTENT_VERSION_STALE'
  | 'DAILY_REWARD_ALREADY_CLAIMED'
  | 'VAULT_EDUCATION_LOCKED'
  | 'USERNAME_INVALID'
  | 'USERNAME_TAKEN'
  | 'USERNAME_ALREADY_SET'
  | 'USERNAME_NOT_FOUND';

/** `details` dos códigos que trazem dados para a tela. */
export interface ApiErrorDetails {
  LEARNING_CONTENT_VERSION_STALE: { questionId: string; currentVersion: number };
  DAILY_REWARD_ALREADY_CLAIMED: { nextAvailableAt: string };
  VAULT_EDUCATION_LOCKED: {
    vaultId: string;
    currentLevel: number;
    minimumLevel: number | null;
    missingModules: string[];
    policyVersion: number | null;
  };
}

export interface ApiError {
  /** null quando não houve resposta (rede, tempo-limite). */
  status: number | null;
  /** null quando o backend não mandou código. */
  code: string | null;
  message: string | null;
  details: unknown;
}

interface ErrorBody {
  code?: unknown;
  message?: unknown;
  details?: unknown;
}

export function readApiError(error: unknown): ApiError {
  if (!isAxiosError<ErrorBody>(error)) {
    return {
      status: null,
      code: null,
      message: error instanceof Error ? error.message : null,
      details: null,
    };
  }

  const body = error.response?.data;
  const message = body?.message;
  return {
    status: error.response?.status ?? null,
    code: typeof body?.code === 'string' ? body.code : null,
    // Erro de validação chega como lista de mensagens.
    message: Array.isArray(message)
      ? message.join('. ')
      : typeof message === 'string'
        ? message
        : error.message,
    details: body?.details ?? null,
  };
}

export function hasApiErrorCode(error: unknown, code: ApiErrorCode): boolean {
  return readApiError(error).code === code;
}

/** `details` tipado de um código; null quando o erro é outro ou veio sem dados. */
export function apiErrorDetails<C extends keyof ApiErrorDetails>(
  error: unknown,
  code: C,
): ApiErrorDetails[C] | null {
  const { code: received, details } = readApiError(error);
  return received === code && details ? (details as ApiErrorDetails[C]) : null;
}

/**
 * `retry` das consultas novas. Tenta de novo falha de rede, 5xx e 401 (na
 * abertura, a chamada pode sair antes de o Privy restaurar a sessão; ver
 * client.ts). Os outros 4xx (não encontrado, regra de negócio) dariam o mesmo
 * resultado.
 */
export function retryUnlessClientError(failureCount: number, error: unknown): boolean {
  const { status } = readApiError(error);
  if (status !== null && status !== 401 && status >= 400 && status < 500) return false;
  return failureCount < 2;
}
