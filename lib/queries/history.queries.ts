import { useEffect } from 'react';
import { InteractionManager } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/stores/auth.store';
import { listDeposits } from '@/lib/api/deposits';
import { listWithdrawals } from '@/lib/api/withdrawals';
import { listGifts } from '@/lib/api/gifts';
import { listRampTransactions } from '@/lib/api/blindpay-ramp';
import { getVaults } from '@/lib/api/vaults';
import { listUsdcTransfers } from '@/lib/stellar/transfers';
import { depositKeys } from './deposits.queries';
import { withdrawalKeys } from './withdrawals.queries';
import { giftKeys } from './gifts.queries';
import { vaultKeys } from './vaults.queries';
import { walletKeys } from './wallets.queries';
import { blindpayRampKeys } from './blindpay-ramp.queries';

/**
 * Pré-carrega as fontes do Histórico enquanto a Carteira está aberta.
 *
 * Sem isso, a página do Histórico monta durante a transição e dispara cinco
 * consultas ao mesmo tempo; a lista chega no meio da animação e a troca de
 * "carregando" para conteúdo trava o empurrão da tela. Com o cache quente, ela
 * já abre com os dados. Roda depois das interações para não competir com a
 * própria Carteira, e respeita o staleTime (não refaz o que está fresco).
 */
export function usePrefetchHistory(enabled: boolean) {
  const queryClient = useQueryClient();
  const contractId = useAuthStore((s) => s.contractId);
  const walletAddress = useAuthStore((s) => s.walletAddress);

  useEffect(() => {
    if (!enabled || !contractId) return;

    const task = InteractionManager.runAfterInteractions(() => {
      queryClient.prefetchQuery({
        queryKey: depositKeys.all(contractId),
        queryFn: () => listDeposits(contractId),
      });
      queryClient.prefetchQuery({
        queryKey: withdrawalKeys.all(contractId),
        queryFn: () => listWithdrawals(contractId),
      });
      queryClient.prefetchQuery({
        queryKey: giftKeys.all(contractId),
        queryFn: () => listGifts(contractId),
      });
      queryClient.prefetchQuery({ queryKey: vaultKeys.all, queryFn: getVaults });
      queryClient.prefetchQuery({
        queryKey: blindpayRampKeys.history(contractId),
        queryFn: listRampTransactions,
        staleTime: 30_000,
      });
      if (walletAddress) {
        queryClient.prefetchQuery({
          queryKey: walletKeys.transfers(walletAddress),
          queryFn: () => listUsdcTransfers(walletAddress, 20),
          staleTime: 30_000,
        });
      }
    });

    return () => task.cancel();
  }, [enabled, contractId, walletAddress, queryClient]);
}
