import { apiClient } from './client';

export interface PortfolioPosition {
  vaultId: string;
  vaultName: string;
  assetSymbol: string;
  /** Whole units of the underlying vault asset. */
  amountAsset: string;
  /** USD value, or null when this position could not be priced. */
  amountUsd: string | null;
  /** Whole units of the vault shares. */
  shares: string;
}

export interface PortfolioSummary {
  /** Null when any held position could not be read or priced. */
  totalUsd: string | null;
  asOf: string;
  priceSource: 'REFLECTOR' | 'STATIC' | 'MIXED' | null;
  stale: boolean;
  positions: PortfolioPosition[];
}

export async function getPortfolioSummary(): Promise<PortfolioSummary> {
  const { data } = await apiClient.get<PortfolioSummary>('/portfolio/summary');
  return data;
}
