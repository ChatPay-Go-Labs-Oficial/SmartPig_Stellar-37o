import { truncateDecimalString } from '@/lib/utils/format';
import { trimDecimal, type PiggyAsset } from '@/lib/utils/piggy';

// Formatos de quantidade dos sheets (Figma 08a–08p, 09a–09k, 16a–16p):
// saldo do dólar no Lite com 2 casas ("$12.40"); euro e cripto com as 7 da
// Stellar ("€12.0000000", "120.0000000"); o Pro sempre com 7 e o código.

/** "Saldo disponível: …" e "Guardado neste porquinho: …". */
export function displayBalance(
  asset: PiggyAsset | null,
  symbol: string,
  value: string,
  isPro: boolean,
): string {
  const seven = truncateDecimalString(value, 7);
  if (isPro || !asset) return `${seven} ${symbol}`;
  if (asset === 'USDC') return `$${truncateDecimalString(value, 2)}`;
  if (asset === 'EURC') return `€${seven}`;
  return seven;
}

/** Valor curto, sem zeros à direita: "$10", "€10.5", "118.5 XLM". */
export function displayShort(asset: PiggyAsset | null, symbol: string, value: string): string {
  const trimmed = trimDecimal(truncateDecimalString(value, 7));
  if (asset === 'USDC') return `$${trimmed}`;
  if (asset === 'EURC') return `€${trimmed}`;
  return `${trimmed} ${symbol}`;
}

/** Valor com 2 casas para frases ("Autorize tirar €10.00 do porquinho"). */
export function displayTwoDecimals(asset: PiggyAsset | null, symbol: string, value: string): string {
  const two = truncateDecimalString(value, 2);
  if (asset === 'USDC') return `$${two}`;
  if (asset === 'EURC') return `€${two}`;
  return `${two} ${symbol}`;
}

/** Prefixo do campo de valor; o XLM usa o logo (ver AmountField). */
export function currencyPrefix(asset: PiggyAsset | null): string | null {
  if (asset === 'USDC') return '$';
  if (asset === 'EURC') return '€';
  return null;
}
