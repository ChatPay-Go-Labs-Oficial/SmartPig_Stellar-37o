import { apiClient } from './client';

export interface Vault {
  id: string;
  defindexVaultId: string;
  name: string;
  assetSymbol: string;
  description?: string;
  apy: string | null;    // Decimal from backend — string
  tvl: string | null;    // Decimal from backend — string
  lastSyncedAt: string | null;
}

export interface VaultDetail extends Vault {
  metadata?: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  liveInfo?: Record<string, unknown>;
}

export interface VaultApy {
  vaultId: string;
  apy: number;
  cached: boolean;
}

export interface VaultBalance {
  vaultId: string;
  walletAddress: string;
  // Raw share amount used when calculating withdrawals.
  dfTokens: string;
  // Normalized to asset units by getVaultBalance.
  underlyingBalance: string[];
}

const STELLAR_AMOUNT_DECIMALS = 7;

/** Converts contract integer amounts (7-decimal atomic units) to asset units. */
export function normalizeStellarAmount(amount: string | null | undefined): string {
  if (!amount) return '0';

  const value = amount.trim();
  // Decimal values are already expressed in asset units by the backend.
  if (value.includes('.')) return value;
  if (!/^-?\d+$/.test(value)) return '0';

  const negative = value.startsWith('-');
  const digits = (negative ? value.slice(1) : value).replace(/^0+(?=\d)/, '');
  const padded = digits.padStart(STELLAR_AMOUNT_DECIMALS + 1, '0');
  const integerPart = padded.slice(0, -STELLAR_AMOUNT_DECIMALS);
  const fractionalPart = padded
    .slice(-STELLAR_AMOUNT_DECIMALS)
    .replace(/0+$/, '');
  const normalized = fractionalPart ? `${integerPart}.${fractionalPart}` : integerPart;

  return negative && normalized !== '0' ? `-${normalized}` : normalized;
}

export const getVaults = async (): Promise<Vault[]> => {
  const { data } = await apiClient.get('/vaults');
  return data;
};

export const getVault = async (id: string): Promise<VaultDetail> => {
  const { data } = await apiClient.get(`/vaults/${id}`);
  return data;
};

export const getVaultApy = async (id: string): Promise<VaultApy> => {
  const { data } = await apiClient.get(`/vaults/${id}/apy`);
  return data;
};

export const getVaultBalance = async (id: string, walletAddress: string): Promise<VaultBalance> => {
  const { data } = await apiClient.get(`/vaults/${id}/balance`, { params: { walletAddress } });
  return {
    ...data,
    dfTokens: normalizeStellarAmount(String(data.dfTokens ?? '0')),
    underlyingBalance: Array.isArray(data.underlyingBalance)
      ? data.underlyingBalance.map(normalizeStellarAmount)
      : [],
  };
};

export const getVaultManagerVaults = async (): Promise<Vault[]> => {
  const { data } = await apiClient.get('/vault-manager/vaults');
  return data;
};
