import { useMemo } from 'react';
import { usePrivy } from '@privy-io/expo';

/**
 * Primeiro nome da pessoa, vindo da conta Google no Privy ("Oi, Matheus").
 *
 * O login com a Apple não traz nome (o Privy guarda só o e-mail), e o app não
 * pede o nome em nenhum lugar: nesses casos volta null e cada tela usa o seu
 * texto neutro. Substitui o "Investidor" fixo (decisão do Matheus, 18/10/2026).
 */
export function useFirstName(): string | null {
  const { user } = usePrivy();
  return useMemo(() => {
    const accounts = (user as { linked_accounts?: unknown[] } | null)?.linked_accounts ?? [];
    for (const account of accounts as { type?: string; name?: string | null }[]) {
      if (account?.type === 'google_oauth' && typeof account.name === 'string') {
        const first = account.name.trim().split(/\s+/)[0];
        if (first) return first;
      }
    }
    return null;
  }, [user]);
}
