// Etapas finais de Guardar e Tirar: assinar com prazo e confirmar o que de
// fato aconteceu com a transação depois de assinada.
//
// Depois da assinatura, um erro no envio NÃO significa que nada aconteceu:
// o backend pode ter submetido e só a resposta se perdeu (timeout de 15 s do
// client, queda de conexão, 5xx). Voltar ao campo com "tente de novo" levaria
// a uma segunda operação on-chain.
//
// Por isso o resultado vem de duas fontes, consultadas juntas: o status do
// intent no backend e a própria rede. A rede manda: o backend pode perder o
// fim do envio e deixar o intent parado (visto em 15/10/2026: depósito na
// rede às 12:32:17 UTC, intent "pendente" minutos depois), e a transação
// final é a fee-bump da tesouraria, que o Horizon acha pelo hash da
// transação assinada no aparelho.

import { signXdr, transactionHash } from '@/lib/stellar/kit';
import { STELLAR_CONFIG } from '@/lib/stellar/config';

/** O que o backend devolve no envio e na consulta do intent. */
interface IntentSnapshot {
  /** Status bruto do intent (CREATED … CONFIRMED / FAILED). */
  status?: string;
  /** Projeção para o cliente (SUCCESS, FAILED, REJECTED, EXPIRED, PENDING…). */
  state?: string;
}

export type OperationOutcome = 'confirmed' | 'failed' | 'pending';
type Settled = Exclude<OperationOutcome, 'pending'>;

export class SignTimeoutError extends Error {
  constructor() {
    super('A assinatura não respondeu a tempo.');
    this.name = 'SignTimeoutError';
  }
}

const SIGN_TIMEOUT_MS = 60_000;

/** Assina com prazo: antes do envio, abortar é seguro (nada saiu do aparelho). */
export async function signWithTimeout(unsignedXdr: string): Promise<string> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      signXdr(unsignedXdr),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new SignTimeoutError()), SIGN_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Hash da transação assinada, para achá-la na rede (null se não der). */
export function signedTxHash(signedXdr: string): string | null {
  try {
    return transactionHash(signedXdr);
  } catch {
    return null;
  }
}

function outcomeOf({ status, state }: IntentSnapshot): Settled | null {
  if (state === 'SUCCESS' || status === 'CONFIRMED') return 'confirmed';
  if (state === 'FAILED' || state === 'REJECTED' || state === 'EXPIRED' || status === 'FAILED') {
    return 'failed';
  }
  return null;
}

/**
 * Prazo de cada consulta ao Horizon. Sem ele, no Android o fetch não tem
 * limite (OkHttp sem timeout) e uma conexão travada prenderia a tela no
 * "Confirmando..." sem poder fechar.
 */
const HORIZON_TIMEOUT_MS = 8_000;

/**
 * A transação na rede: incluída com sucesso, incluída e falhou, ou ainda não
 * apareceu (null). Uma transação que falha na rede não move nada.
 */
export async function lookupOnChain(txHash: string): Promise<Settled | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HORIZON_TIMEOUT_MS);
  try {
    const response = await fetch(`${STELLAR_CONFIG.horizonUrl}/transactions/${txHash}`, {
      signal: controller.signal,
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Horizon ${response.status}`);
    const body = (await response.json()) as { successful?: boolean };
    return body.successful ? 'confirmed' : 'failed';
  } finally {
    clearTimeout(timer);
  }
}

interface Sources {
  fetchStatus: () => Promise<IntentSnapshot>;
  /** Hash da transação assinada; null se não deu para calcular. */
  txHash: string | null;
}

interface Check {
  outcome: Settled | null;
  /** Status bruto do intent, quando o backend respondeu. */
  status?: string;
}

/** Uma rodada de consulta: a rede primeiro, depois o backend. */
async function checkOnce({ fetchStatus, txHash }: Sources): Promise<Check> {
  if (txHash) {
    try {
      const onChain = await lookupOnChain(txHash);
      if (onChain) return { outcome: onChain };
    } catch {
      // Horizon fora do ar ou lento: o backend ainda pode responder.
    }
  }
  try {
    const snapshot = await fetchStatus();
    return { outcome: outcomeOf(snapshot), status: snapshot.status };
  } catch {
    // Falha de rede na consulta: a próxima rodada tenta de novo.
    return { outcome: null };
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Recusas em que o backend responde sem ter posto nada na rede: 400 (intent
// vencido, em FAILED, sem XDR), 422 (a DeFindex rejeitou a transação) e
// 401/403 (o guard de autenticação recusa antes de o envio começar). Um 404
// não entra: ele pode vir da DeFindex depois de a transação já ter saído.
const NOT_SUBMITTED = new Set([400, 401, 403, 422]);

interface SubmitOptions extends Sources {
  submit: () => Promise<IntentSnapshot>;
  /** Chamado uma vez quando a confirmação passa do tempo normal. */
  onSlow?: () => void;
  slowAfterMs?: number;
  intervalMs?: number;
  timeoutMs?: number;
}

/**
 * Envia a transação assinada e só devolve "confirmed" quando a rede (ou o
 * backend) confirma. Recusa antes da rede sobe como erro; sem resposta, 409
 * (já enviado), 5xx ou status em trânsito viram consulta até se resolver ou
 * até o prazo, que devolve "pending".
 *
 * Se o envio ficou sem resposta e o backend mostra que nunca recebeu a
 * transação (intent ainda em XDR_GENERATED), ela é reenviada uma vez. É a
 * mesma transação assinada: pela sequência da conta, só uma cópia pode
 * entrar na rede.
 */
export async function submitAndConfirm({
  submit,
  fetchStatus,
  txHash,
  onSlow,
  slowAfterMs = 12_000,
  intervalMs = 3_000,
  timeoutMs = 60_000,
}: SubmitOptions): Promise<OperationOutcome> {
  const started = Date.now();
  const slowTimer = onSlow ? setTimeout(onSlow, slowAfterMs) : undefined;

  // true = o backend recebeu (respondeu, mesmo com erro); false = sem resposta.
  const send = async (): Promise<{ outcome: Settled | null; answered: boolean }> => {
    try {
      return { outcome: outcomeOf(await submit()), answered: true };
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status != null && NOT_SUBMITTED.has(status)) throw error;
      return { outcome: null, answered: status != null };
    }
  };

  try {
    const first = await send();
    if (first.outcome) return first.outcome;
    let resent = first.answered;

    while (Date.now() - started < timeoutMs) {
      const check = await checkOnce({ fetchStatus, txHash });
      if (check.outcome) return check.outcome;
      if (!resent && check.status === 'XDR_GENERATED') {
        resent = true;
        const again = await send();
        if (again.outcome) return again.outcome;
      }
      await sleep(intervalMs);
    }
    return 'pending';
  } finally {
    if (slowTimer) clearTimeout(slowTimer);
  }
}

interface WatchOptions extends Sources {
  /** Resultado final, ou "pending" quando o prazo acaba sem resposta. */
  onSettled: (outcome: OperationOutcome) => void;
  intervalMs?: number;
  timeoutMs?: number;
}

/**
 * Continua acompanhando uma operação que ficou "pending", em segundo plano.
 * Devolve a função que cancela (a tela saiu): depois dela, nada é avisado.
 */
export function watchOutcome({
  fetchStatus,
  txHash,
  onSettled,
  intervalMs = 5_000,
  timeoutMs = 4 * 60_000,
}: WatchOptions): () => void {
  let cancelled = false;
  const started = Date.now();
  (async () => {
    while (!cancelled && Date.now() - started < timeoutMs) {
      await sleep(intervalMs);
      if (cancelled) return;
      const { outcome } = await checkOnce({ fetchStatus, txHash });
      if (cancelled) return;
      if (outcome) {
        onSettled(outcome);
        return;
      }
    }
    if (!cancelled) onSettled('pending');
  })();
  return () => {
    cancelled = true;
  };
}
