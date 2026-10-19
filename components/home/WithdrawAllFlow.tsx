import { useEffect, useRef, useState } from 'react';
import {
  BlindPayOfframpModal,
  RampMethodSelector,
  TransferModal,
  WithdrawModal,
} from '@/components/ui';

interface WithdrawAllFlowProps {
  /** Parâmetro `sacar` da rota da Home. */
  trigger: string | undefined;
  vaultId: string;
  assetSymbol: string;
  dfTokens: string;
  underlyingBalance: string;
  walletUsdc: number;
}

/**
 * Seletor de saque que a Exclusão de conta abre pela Home
 * (`/(tabs)?sacar=1`, DeleteAccountSheet): quem ainda tem dinheiro precisa
 * tirar antes de excluir. A Home V2 não tem mais os botões de saque (moram na
 * Carteira e na Guardar); este fluxo fica só para essa entrada.
 *
 * O ref garante que fechar o seletor não o reabra enquanto o parâmetro
 * seguir na rota.
 */
export function WithdrawAllFlow({
  trigger,
  vaultId,
  assetSymbol,
  dfTokens,
  underlyingBalance,
  walletUsdc,
}: WithdrawAllFlowProps) {
  const [methodOpen, setMethodOpen] = useState(false);
  const [vaultOpen, setVaultOpen] = useState(false);
  const [offrampOpen, setOfframpOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const handled = useRef(false);

  useEffect(() => {
    if (trigger !== '1' || handled.current) return;
    handled.current = true;
    setMethodOpen(true);
  }, [trigger]);

  return (
    <>
      <RampMethodSelector
        visible={methodOpen}
        type="withdraw"
        onSelectStellar={() => {
          setMethodOpen(false);
          setVaultOpen(true);
        }}
        onSelectRamp={() => {
          setMethodOpen(false);
          setOfframpOpen(true);
        }}
        onSelectTransfer={() => {
          setMethodOpen(false);
          setTransferOpen(true);
        }}
        onClose={() => setMethodOpen(false)}
      />
      <WithdrawModal
        visible={vaultOpen}
        vaultId={vaultId}
        dfTokens={dfTokens}
        underlyingBalance={underlyingBalance}
        assetSymbol={assetSymbol}
        onClose={() => setVaultOpen(false)}
      />
      <BlindPayOfframpModal
        visible={offrampOpen}
        maxAmount={walletUsdc}
        onClose={() => setOfframpOpen(false)}
      />
      <TransferModal visible={transferOpen} onClose={() => setTransferOpen(false)} />
    </>
  );
}
