import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import {
  acknowledgeVaultDisclosure,
  getVaults,
  getVault,
  getVaultApy,
  getVaultDisclosure,
  getVaultManagerVaults,
  type AcknowledgeDisclosureBody,
  type Vault,
  type VaultDetail,
} from '@/lib/api/vaults';
import { useAuthStore } from '@/lib/stores/auth.store';

export const vaultKeys = {
  all: ['vaults'] as const,
  detail: (id: string) => ['vaults', id] as const,
  apy: (id: string) => ['vaults', id, 'apy'] as const,
  balance: (id: string, wallet: string) => ['vaults', id, 'balance', wallet] as const,
  manager: ['vaults', 'manager'] as const,
  disclosure: (id: string) => ['vaults', id, 'disclosure'] as const,
};

/**
 * GET /vaults exige token. Telas montam por um instante antes de o AppGate
 * redirecionar para o login (e o GiftClaimGate vive na raiz), então a consulta
 * só roda com sessão.
 */
export const useVaults = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({ queryKey: vaultKeys.all, queryFn: getVaults, enabled: isAuthenticated });
};

/** Busca os porquinhos antes de a Home montar (fim do login). Mesma chave do useVaults. */
export const prefetchVaults = (qc: QueryClient) =>
  qc.prefetchQuery({ queryKey: vaultKeys.all, queryFn: getVaults });

export const useVault = (id: string) =>
  useQuery({ queryKey: vaultKeys.detail(id), queryFn: () => getVault(id), enabled: !!id });

export const useVaultApy = (id: string) =>
  useQuery({
    queryKey: vaultKeys.apy(id),
    queryFn: () => getVaultApy(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 60 * 5,
  });

export const useManagerVaults = () =>
  useQuery({ queryKey: vaultKeys.manager, queryFn: getVaultManagerVaults });

/** Texto de riscos atual do vault e se a pessoa ainda deve o aceite. */
export const useVaultDisclosure = (id: string) =>
  useQuery({
    queryKey: vaultKeys.disclosure(id),
    queryFn: () => getVaultDisclosure(id),
    enabled: !!id,
    // Sempre a versão mais nova ao abrir a tela: aceitar texto velho é
    // justamente o que o aceite existe para evitar.
    staleTime: 0,
  });

/**
 * Marca o aceite nas listas já carregadas (selo e aviso somem na hora) e
 * pede a leitura nova só das chaves do vault, sem refazer APY e saldos.
 * `refetch: false` só corrige o cache: usado quando a lista e o texto de
 * riscos discordam, para uma leitura não desfazer a outra em ciclo.
 */
export function markDisclosureAcknowledged(qc: QueryClient, vaultId: string, { refetch = true } = {}) {
  const clear = <T extends Vault>(vault: T): T =>
    vault.id === vaultId && vault.disclosure
      ? { ...vault, disclosure: { ...vault.disclosure, acknowledgmentRequired: false } }
      : vault;
  qc.setQueryData<Vault[]>(vaultKeys.all, (list) => list?.map(clear));
  qc.setQueryData<VaultDetail>(vaultKeys.detail(vaultId), (detail) => (detail ? clear(detail) : detail));
  if (!refetch) return;
  qc.invalidateQueries({ queryKey: vaultKeys.all, exact: true });
  qc.invalidateQueries({ queryKey: vaultKeys.detail(vaultId), exact: true });
  qc.invalidateQueries({ queryKey: vaultKeys.disclosure(vaultId), exact: true });
}

export const useAcknowledgeDisclosure = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ vaultId, body }: { vaultId: string; body: AcknowledgeDisclosureBody }) =>
      acknowledgeVaultDisclosure(vaultId, body),
    onSuccess: (_, { vaultId }) => markDisclosureAcknowledged(qc, vaultId),
  });
};
