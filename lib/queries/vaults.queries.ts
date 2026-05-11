import { useQuery } from '@tanstack/react-query';
import { getVaults, getVault, getVaultManagerVaults } from '@/lib/api/vaults';

export const vaultKeys = {
  all: ['vaults'] as const,
  detail: (id: string) => ['vaults', id] as const,
  manager: ['vaults', 'manager'] as const,
};

export const useVaults = () =>
  useQuery({ queryKey: vaultKeys.all, queryFn: getVaults });

export const useVault = (id: string) =>
  useQuery({ queryKey: vaultKeys.detail(id), queryFn: () => getVault(id), enabled: !!id });

export const useManagerVaults = () =>
  useQuery({ queryKey: vaultKeys.manager, queryFn: getVaultManagerVaults });
