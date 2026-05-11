import { apiClient } from './client';

export interface Vault {
  id: string;
  name: string;
  asset: string;
  tvl: number;
  apy: number;
}

export const getVaults = async (): Promise<Vault[]> => {
  const { data } = await apiClient.get('/vaults');
  return data;
};

export const getVault = async (id: string): Promise<Vault> => {
  const { data } = await apiClient.get(`/vaults/${id}`);
  return data;
};

export const getVaultManagerVaults = async (): Promise<Vault[]> => {
  const { data } = await apiClient.get('/vault-manager/vaults');
  return data;
};
