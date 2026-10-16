import { toUnits } from './piggy';

// Saldo "vivo" dos porquinhos: entre uma leitura e outra do backend (a cada
// 30 s), o valor cresce na tela pelo APY do vault, para a pessoa ver o
// rendimento acontecendo nas 7 casas.
//
// A conta parte da quantidade exata (unidades inteiras, BigInt) e soma só o
// ganho, calculado em número: no instante da leitura o valor mostrado é o real
// até a última casa, sem erro de ponto flutuante.

const YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;
const UNITS = 1e7;

/**
 * Quanto rendimento (em tempo) o número segura quando uma leitura nova vem
 * abaixo do que já estava na tela: em vez de voltar casas, ele espera a conta
 * alcançar. Uma queda maior que isso (um saque) aparece na hora.
 */
export const HOLD_WINDOW_MS = 120_000;

/** Ritmo do relógio compartilhado: 10 vezes por segundo no máximo. */
export const CLOCK_MS = 100;

/**
 * Até onde a projeção anda sem uma leitura com valor novo. Normalmente cada
 * leitura (30 s) traz um valor diferente e o ponto de partida se renova; se o
 * vault parar de render com a taxa salva ainda positiva, o número para aqui
 * em vez de crescer sem limite.
 */
export const MAX_PROJECTION_MS = 10 * 60 * 1000;

export interface Growth {
  baseUnits: bigint;
  /** A mesma quantidade em número, só para a conta do ganho. */
  base: number;
  /** ln(1 + APY) por milissegundo: juros compostos contínuos. */
  ratePerMs: number;
  /** Quando esta quantidade apareceu pela primeira vez no app. */
  since: number;
  /** Chave do ponto de partida compartilhado (a quantidade). */
  key: string;
}

/** APY do vault ("6.9", em %) como número; null sem taxa. */
export function apyNumber(apy: string | number | null | undefined): number | null {
  if (apy == null) return null;
  const value = typeof apy === 'number' ? apy : parseFloat(apy);
  return Number.isFinite(value) && value > 0 ? value : null;
}

// Primeira vez que cada quantidade foi vista. O total e o cartão de um mesmo
// porquinho mostram a mesma quantidade: com o mesmo ponto de partida e o
// mesmo relógio, as casas andam iguais nos dois. A chave é só a quantidade
// (a taxa média do total pode diferir da do cartão no último bit).
//
// Cada tela que mostra a quantidade a segura (retainAnchor/releaseAnchor);
// sem ninguém segurando, a entrada sai. Assim, um valor que volta depois
// (tirar tudo e guardar o mesmo valor) começa da hora em que voltou.
const firstSeen = new Map<string, { since: number; holders: number }>();
const FIRST_SEEN_LIMIT = 200;

function sinceFor(key: string, now: number): number {
  const known = firstSeen.get(key);
  if (known) return known.since;
  if (firstSeen.size >= FIRST_SEEN_LIMIT) {
    for (const [k, entry] of firstSeen) if (entry.holders <= 0) firstSeen.delete(k);
  }
  firstSeen.set(key, { since: now, holders: 0 });
  return now;
}

/**
 * Recria a entrada se ela saiu no mesmo commit (a taxa mudou e a quantidade
 * não: a limpeza da âncora velha roda antes da retenção da nova).
 */
export function retainAnchor(key: string, since: number): void {
  const entry = firstSeen.get(key);
  if (entry) entry.holders += 1;
  else firstSeen.set(key, { since, holders: 1 });
}

export function releaseAnchor(key: string): void {
  const entry = firstSeen.get(key);
  if (!entry) return;
  entry.holders -= 1;
  if (entry.holders <= 0) firstSeen.delete(key);
}

/** Crescimento de uma quantidade, ou null quando ela não rende (sem APY, zero). */
export function makeGrowth(amount: string, apyPercent: number | null, now = Date.now()): Growth | null {
  if (apyPercent == null || apyPercent <= 0) return null;
  const baseUnits = toUnits(amount);
  if (baseUnits <= 0n) return null;
  const key = baseUnits.toString();
  return {
    baseUnits,
    base: Number(baseUnits) / UNITS,
    ratePerMs: Math.log1p(apyPercent / 100) / YEAR_MS,
    since: sinceFor(key, now),
    key,
  };
}

/** A quantidade com o rendimento até `now`, em unidades inteiras. */
export function grownUnits(growth: Growth, now: number): bigint {
  const elapsed = Math.min(Math.max(0, now - growth.since), MAX_PROJECTION_MS);
  const gain = growth.base * Math.expm1(growth.ratePerMs * elapsed) * UNITS;
  return growth.baseUnits + BigInt(Math.floor(gain));
}

/** Maior queda (em unidades) que o número segura numa leitura nova. */
export function holdTolerance(growth: Growth): bigint {
  return BigInt(Math.ceil(growth.base * growth.ratePerMs * HOLD_WINDOW_MS * UNITS));
}

/**
 * Piso para uma leitura nova: o valor que estava na tela, se a leitura veio
 * pouco abaixo dele; zero (sem piso) se veio acima ou muito abaixo.
 */
export function floorFor(shown: bigint | null, growth: Growth, now: number): bigint {
  if (shown == null) return 0n;
  const gap = shown - grownUnits(growth, now);
  return gap > 0n && gap <= holdTolerance(growth) ? shown : 0n;
}

// ─── Relógio compartilhado ───────────────────────────────────────────────────
// Um intervalo só para todos os saldos na tela, e só enquanto alguém ouve.

let clock = Date.now();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

export function subscribeClock(listener: () => void): () => void {
  listeners.add(listener);
  clock = Date.now();
  if (!timer) {
    timer = setInterval(() => {
      clock = Date.now();
      listeners.forEach((notify) => notify());
    }, CLOCK_MS);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

export function clockNow(): number {
  return clock;
}
