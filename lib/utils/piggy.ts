import type { Vault } from '@/lib/api/vaults';
import type { PortfolioPosition, PortfolioSummary } from '@/lib/api/portfolio';
import { portfolioPositionUsdValue } from '@/lib/utils/portfolio';
import { lessonLockOf, type LessonLock } from '@/lib/utils/vault-access';

// Modelo dos porquinhos da aba Guardar: a lista de vaults (GET /vaults) cruzada
// com o portfólio (GET /portfolio/summary). Uma requisição de saldo para todos,
// em vez de uma por cartão (o fan-out estourava o limite do DeFindex).

export const PIGGY_ASSETS = ['USDC', 'EURC', 'XLM'] as const;
export type PiggyAsset = (typeof PIGGY_ASSETS)[number];

/** Casas da Stellar: o Figma mostra as quantidades sempre com 7. */
export const PIGGY_DECIMALS = 7;

export function piggyAsset(symbol: string): PiggyAsset | null {
  const upper = symbol.toUpperCase();
  return (PIGGY_ASSETS as readonly string[]).includes(upper) ? (upper as PiggyAsset) : null;
}

export interface Piggy {
  vault: Vault;
  asset: PiggyAsset | null;
  position: PortfolioPosition | undefined;
  /** Quantidade no ativo do vault, em unidades inteiras ("0" sem posição). */
  amount: string;
  /**
   * false quando o portfólio não conseguiu ler algum vault e este veio sem
   * posição: pode ser zero, pode ser falha. A tela mostra "—" em vez de 0.
   */
  balanceKnown: boolean;
  hasBalance: boolean;
  /** Valor em USD (USDC pela paridade); null sem cotação. */
  usd: number | null;
  depositsPaused: boolean;
  /** Aceite de riscos pendente. O USDC é isento no backend. */
  risksPending: boolean;
  /** Guardar pede lições da trilha (Lite, Figma 10b, 10c, 11a, 11c); null liberado. */
  lessonLock: LessonLock | null;
}

/**
 * Porquinhos na ordem do backend (displayOrder).
 *
 * Aparecem os que a pessoa acessa (`canAccess`: todos com o `access` do
 * backend; sem ele, a flag Pro-only) e também qualquer um em que ela tenha
 * saldo: dinheiro guardado nunca some da tela, para que tirar continue
 * sempre possível.
 */
export function buildPiggies(
  vaults: readonly Vault[],
  summary: PortfolioSummary,
  canAccess: (assetSymbol: string) => boolean,
  /**
   * Vaults em que a pessoa já teve saldo nesta sessão. Numa leitura parcial
   * a posição some do portfólio; com isto o cartão fica, com saldo "—".
   */
  knownHeld: ReadonlySet<string> = new Set(),
): Piggy[] {
  const positions = new Map(summary.positions.map((p) => [p.vaultId, p]));
  const partial = summary.totalUsd === null;

  return vaults
    .filter(
      (vault) =>
        canAccess(vault.assetSymbol) ||
        positions.has(vault.id) ||
        (partial && knownHeld.has(vault.id)),
    )
    .map((vault) => {
      const asset = piggyAsset(vault.assetSymbol);
      const position = positions.get(vault.id);
      const amount = toPlainDecimal(position?.amountAsset ?? '0');
      const hasBalance = !!position && Number(amount) > 0;
      return {
        vault,
        asset,
        position,
        amount,
        balanceKnown: !!position || !partial,
        hasBalance,
        usd: position ? portfolioPositionUsdValue(position) : 0,
        depositsPaused: vault.depositsEnabled === false,
        risksPending: asset !== 'USDC' && vault.disclosure?.acknowledgmentRequired === true,
        lessonLock: lessonLockOf(vault),
      };
    });
}

/** Porquinho que a aba abre: o destacado pelo backend, senão o primeiro. */
export function initialPiggyIndex(piggies: readonly Piggy[]): number {
  return Math.max(0, piggies.findIndex((p) => p.vault.isFeatured));
}

export type GuardarTotal =
  /** Só dólar guardado: a soma exata, com 7 casas (Figma 10a). */
  | { kind: 'exact'; amount: string }
  /** Há moeda cotada: equivalente em dólar, 2 casas, com "≈" (Figma 10d). */
  | { kind: 'estimated'; usd: number; assets: PiggyAsset[] }
  /** Algum vault não pôde ser lido ou cotado: sem número confiável. */
  | { kind: 'unknown' };

export function guardarTotal(piggies: readonly Piggy[], summary: PortfolioSummary): GuardarTotal {
  if (summary.totalUsd === null) return { kind: 'unknown' };

  const held = piggies.filter((p) => p.hasBalance);
  if (held.every((p) => p.asset === 'USDC')) {
    return { kind: 'exact', amount: addDecimalStrings(held.map((p) => p.amount)) };
  }

  let usd = 0;
  for (const piggy of held) {
    if (piggy.usd === null) return { kind: 'unknown' };
    usd += piggy.usd;
  }
  const assets = PIGGY_ASSETS.filter((asset) => held.some((p) => p.asset === asset));
  return { kind: 'estimated', usd, assets };
}

// ─── Quantidades ─────────────────────────────────────────────────────────────

/**
 * Decimal em notação simples. O Decimal do Prisma (decimal.js) serializa
 * valores pequenos em notação científica: 0.0000003 chega como "3e-7".
 */
export function toPlainDecimal(raw: string): string {
  const value = raw.trim();
  const match = /^(-?)(\d*)(?:\.(\d*))?e([+-]?\d+)$/i.exec(value);
  if (!match) return value;
  const [, sign, intDigits, fracDigits = '', expText] = match;
  // Posição do ponto contada a partir do início de `digits`. Zeros à esquerda
  // não mudam o valor: saem dos dígitos e da posição juntos ("0.1e-6").
  const allDigits = `${intDigits}${fracDigits}`;
  const digits = allDigits.replace(/^0+/, '');
  if (!digits) return '0';
  const point = intDigits.length + Number(expText) - (allDigits.length - digits.length);
  let plain: string;
  if (point <= 0) plain = `0.${'0'.repeat(-point)}${digits}`;
  else if (point >= digits.length) plain = `${digits}${'0'.repeat(point - digits.length)}`;
  else plain = `${digits.slice(0, point)}.${digits.slice(point)}`;
  return `${sign}${plain}`;
}

/** Soma exata de decimais em string (sem ponto flutuante), truncando em `decimals`. */
export function addDecimalStrings(values: readonly string[], decimals = PIGGY_DECIMALS): string {
  const scale = 10n ** BigInt(decimals);
  let total = 0n;
  for (const raw of values) {
    const value = toPlainDecimal(raw);
    const [integerPart, fractionPart = ''] = value.trim().replace(/^-/, '').split('.');
    if (!/^\d*$/.test(integerPart) || !/^\d*$/.test(fractionPart)) continue;
    const units =
      BigInt(integerPart || '0') * scale +
      BigInt(fractionPart.padEnd(decimals, '0').slice(0, decimals) || '0');
    total += value.trim().startsWith('-') ? -units : units;
  }
  const negative = total < 0n;
  const abs = negative ? -total : total;
  const fraction = (abs % scale).toString().padStart(decimals, '0');
  return `${negative ? '-' : ''}${abs / scale}.${fraction}`;
}

/** Decimal em string → unidades inteiras (stroops), truncando em `decimals`. */
export function toUnits(value: string, decimals = PIGGY_DECIMALS): bigint {
  const plain = toPlainDecimal(value.trim() || '0');
  const negative = plain.startsWith('-');
  const [integer = '0', fraction = ''] = plain.replace(/^-/, '').split('.');
  const units =
    BigInt(integer.replace(/\D/g, '') || '0') * 10n ** BigInt(decimals) +
    BigInt(fraction.replace(/\D/g, '').padEnd(decimals, '0').slice(0, decimals) || '0');
  return negative ? -units : units;
}

/** Unidades inteiras → decimal com `decimals` casas ("10.5000000"). */
export function fromUnits(units: bigint, decimals = PIGGY_DECIMALS): string {
  const negative = units < 0n;
  const abs = negative ? -units : units;
  const scale = 10n ** BigInt(decimals);
  const fraction = (abs % scale).toString().padStart(decimals, '0');
  return `${negative ? '-' : ''}${abs / scale}${decimals > 0 ? `.${fraction}` : ''}`;
}

/** "10.5000000" → "10.5"; "10.0000000" → "10". Para preencher o campo. */
export function trimDecimal(value: string): string {
  return value.includes('.') ? value.replace(/0+$/, '').replace(/\.$/, '') : value;
}

export interface SplitAmount {
  /** Parte inteira com separador de milhar, já com o prefixo ("$1,284,530"). */
  integer: string;
  /** Ponto e casas, truncadas, nunca arredondadas (".5821937"). */
  fraction: string;
}

/** Quantidade em dois trechos: o inteiro em destaque e as casas menores. */
export function splitAmount(raw: string, prefix = '', decimals = PIGGY_DECIMALS): SplitAmount {
  const [integerPart = '0', fractionPart = ''] = toPlainDecimal(raw).split('.');
  const digits = integerPart.replace(/^-/, '').replace(/^0+(?=\d)/, '') || '0';
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const fraction = fractionPart.replace(/\D/g, '').padEnd(decimals, '0').slice(0, decimals);
  return { integer: `${prefix}${grouped}`, fraction: decimals > 0 ? `.${fraction}` : '' };
}

/**
 * Faixa de tamanho do inteiro (Figma 10l: "o inteiro reduz de tamanho conforme
 * cresce"). Conta prefixo e dígitos, sem as vírgulas: "$1,284,530" = 8.
 */
export function amountTier(integer: string): 0 | 1 | 2 | 3 {
  const length = integer.replace(/,/g, '').length;
  if (length <= 4) return 0;
  if (length <= 6) return 1;
  if (length <= 8) return 2;
  return 3;
}

/** Símbolo da quantidade no ativo: "$250", "€40", "118.5 XLM". */
export function piggyUnit(piggy: Pick<Piggy, 'asset' | 'vault'>): { prefix: string; suffix: string } {
  switch (piggy.asset) {
    case 'USDC':
      return { prefix: '$', suffix: '' };
    case 'EURC':
      return { prefix: '€', suffix: '' };
    case 'XLM':
      return { prefix: '', suffix: ' XLM' };
    default:
      return { prefix: '', suffix: ` ${piggy.vault.assetSymbol}` };
  }
}

/** Quantidade completa numa linha só: "€40.0000000". */
export function formatPiggyAmount(piggy: Pick<Piggy, 'asset' | 'vault' | 'amount'>): string {
  const { prefix, suffix } = piggyUnit(piggy);
  const { integer, fraction } = splitAmount(piggy.amount, prefix);
  return `${integer}${fraction}${suffix}`;
}

/** Hora da cotação ("14:32"), no fuso do aparelho. */
export function formatQuoteTime(iso: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** "Dólar e euro", "Dólar, euro e criptomoeda" (Lite) / "USDC + EURC" (Pro). */
export function joinAssetNames(names: readonly string[], isPro: boolean): string {
  if (isPro) return names.join(' + ');
  const lower = names.map((name, i) => (i === 0 ? name : name.toLowerCase()));
  if (lower.length <= 1) return lower.join('');
  return `${lower.slice(0, -1).join(', ')} e ${lower[lower.length - 1]}`;
}
