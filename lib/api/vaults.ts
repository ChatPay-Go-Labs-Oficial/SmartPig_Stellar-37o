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
  dfTokens: string;
  underlyingBalance: string[];
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
  return data;
};

export const getVaultManagerVaults = async (): Promise<Vault[]> => {
  const { data } = await apiClient.get('/vault-manager/vaults');
  return data;
};
