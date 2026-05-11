import { useQuery } from '@tanstack/react-query';
import { getVaults, getVault, getVaultApy, getVaultBalance, getVaultManagerVaults } from '@/lib/api/vaults';

export const vaultKeys = {
  all: ['vaults'] as const,
  detail: (id: string) => ['vaults', id] as const,
  apy: (id: string) => ['vaults', id, 'apy'] as const,
  balance: (id: string, wallet: string) => ['vaults', id, 'balance', wallet] as const,
  manager: ['vaults', 'manager'] as const,
};

export const useVaults = () =>
  useQuery({ queryKey: vaultKeys.all, queryFn: getVaults });

export const useVault = (id: string) =>
  useQuery({ queryKey: vaultKeys.detail(id), queryFn: () => getVault(id), enabled: !!id });

export const useVaultApy = (id: string) =>
  useQuery({
    queryKey: vaultKeys.apy(id),
    queryFn: () => getVaultApy(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,   // matches backend TTL of 5 min
    refetchInterval: 1000 * 60 * 5,
  });

export const useVaultBalance = (id: string, walletAddress: string | null) =>
  useQuery({
    queryKey: vaultKeys.balance(id, walletAddress ?? ''),
    queryFn: () => getVaultBalance(id, walletAddress!),
    enabled: !!id && !!walletAddress,
    refetchInterval: 1000 * 30,
  });

export const useManagerVaults = () =>
  useQuery({ queryKey: vaultKeys.manager, queryFn: getVaultManagerVaults });
