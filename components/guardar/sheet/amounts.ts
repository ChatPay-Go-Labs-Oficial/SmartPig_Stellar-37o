import { truncateDecimalString } from '@/lib/utils/format';
import { trimDecimal, type PiggyAsset } from '@/lib/utils/piggy';

// Formatos de quantidade dos sheets (Figma 08a–08p, 09a–09k, 16a–16p):
// saldo do dólar no Lite com 2 casas ("$12.40"); euro e cripto com as 7 da
// Stellar ("€12.0000000", "120.0000000 XLM"); o Pro sempre com 7 e o código.
// O XLM leva a unidade também no Lite (decisão de 15/10/2026, fora do Figma
// 08o): sem ela, "Deixamos 1.5 na carteira" não diz 1.5 de quê.

/** "Saldo disponível: …" e "Guardado neste porquinho: …". */
export function displayBalance(
  asset: PiggyAsset | null,
  symbol: string,
  value: string,
  isPro: boolean,
): string {
  const seven = truncateDecimalString(value, 7);
  if (isPro || !asset || asset === 'XLM') return `${seven} ${symbol}`;
  if (asset === 'USDC') return `$${truncateDecimalString(value, 2)}`;
  return `€${seven}`;
}

/** Valor curto, sem zeros à direita: "$10", "€10.5", "118.5 XLM". */
export function displayShort(asset: PiggyAsset | null, symbol: string, value: string): string {
  const trimmed = trimDecimal(truncateDecimalString(value, 7));
  if (asset === 'USDC') return `$${trimmed}`;
  if (asset === 'EURC') return `€${trimmed}`;
  return `${trimmed} ${symbol}`;
}

/**
 * Valor de uma operação nas frases (confirmação, sucesso): "$10.00", ou
 * "10.00 USDC" no Pro. Com `full`, o valor inteiro com até 7 casas: no
 * "Tudo" de um porquinho com menos de um centavo, 2 casas dariam "$0.00".
 */
export function operationAmount(
  asset: PiggyAsset | null,
  symbol: string,
  value: string,
  isPro: boolean,
  full = false,
): string {
  const shown = full ? trimDecimal(truncateDecimalString(value, 7)) : truncateDecimalString(value, 2);
  if (isPro || !asset || asset === 'XLM') return `${shown} ${symbol}`;
  return asset === 'USDC' ? `$${shown}` : `€${shown}`;
}

/** Prefixo do campo de valor; o XLM usa o logo (ver AmountField). */
export function currencyPrefix(asset: PiggyAsset | null): string | null {
  if (asset === 'USDC') return '$';
  if (asset === 'EURC') return '€';
  return null;
}
