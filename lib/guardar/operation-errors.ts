// Classificação dos erros de Guardar e Tirar para os avisos dos sheets.
// O backend manda `code` nos erros de regra (vault-registry.errors.ts); o
// resto é rede, sessão ou falha da própria transação.

import { SignTimeoutError } from './vault-operation';

export type OperationErrorKind =
  | 'paused'
  | 'risks'
  | 'risksMissing'
  | 'insufficient'
  | 'liquidity'
  | 'network'
  | 'session'
  | 'biometrics'
  | 'signing'
  | 'generic';

interface ApiErrorShape {
  response?: { status?: number; data?: { code?: string; message?: string | string[] } };
  message?: string;
  code?: string;
}

export class BiometricsDeclinedError extends Error {
  constructor(message?: string) {
    super(message ?? 'Biometria não confirmada.');
    this.name = 'BiometricsDeclinedError';
  }
}

export function classifyOperationError(error: unknown): OperationErrorKind {
  if (error instanceof BiometricsDeclinedError) return 'biometrics';
  if (error instanceof SignTimeoutError) return 'signing';

  const e = error as ApiErrorShape;
  const code = e?.response?.data?.code;
  if (code === 'VAULT_DEPOSITS_PAUSED') return 'paused';
  if (code === 'DISCLOSURE_NOT_ACKNOWLEDGED') return 'risks';
  // Sem texto de riscos publicado: a pessoa não tem o que aceitar.
  if (code === 'VAULT_DISCLOSURE_MISSING') return 'risksMissing';

  const status = e?.response?.status;
  if (status === 401 || status === 403) return 'session';

  const rawMessage = e?.response?.data?.message;
  const text = [Array.isArray(rawMessage) ? rawMessage.join(' ') : rawMessage, e?.message, e?.code]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (!e?.response && /network|timeout|econn|fetch|abort/.test(text)) return 'network';
  if (/liquidity|liquidez|insufficient_liquidity|not enough.*(idle|free)/.test(text)) return 'liquidity';
  if (/insufficient|underfunded|saldo insuficiente|not enough (balance|funds)/.test(text)) return 'insufficient';
  // "expired" sozinho não é sessão: o intent vencido também diz "expired".
  if (/unauthorized|forbidden|não autenticado/.test(text)) return 'session';
  return 'generic';
}
