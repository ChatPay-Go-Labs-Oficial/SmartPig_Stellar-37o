import type { PortfolioPosition } from '@/lib/api/portfolio';

/** USDC is presented at its product peg, matching the amount the user withdraws. */
export function portfolioPositionUsdValue(position: PortfolioPosition): number | null {
  const rawValue = position.assetSymbol.toUpperCase() === 'USDC'
    ? position.amountAsset
    : position.amountUsd;
  if (rawValue === null) return null;

  const value = Number(rawValue);
  return Number.isFinite(value) ? value : null;
}

export function positionUsesMarketPrice(position: PortfolioPosition): boolean {
  return position.assetSymbol.toUpperCase() !== 'USDC';
}
