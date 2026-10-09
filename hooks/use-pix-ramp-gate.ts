import { router } from 'expo-router';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useBlindPayReceiver, useKycStatus } from '@/lib/queries/blindpay.queries';

/**
 * Porta de entrada do Pix (depósito e saque via BlindPay).
 *
 * Quem ainda não tem conta bancária + carteira cadastradas, ou não está com o
 * KYC liberado, vai para o onboarding em vez de abrir o modal de ramp.
 *
 * `enabled` controla quando as consultas rodam (ex.: só com o seletor aberto).
 */
export function usePixRampGate(enabled: boolean) {
  const contractId = useAuthStore((s) => s.contractId);
  const { data: receiver, isLoading: receiverLoading } = useBlindPayReceiver(
    enabled ? contractId : null,
  );
  const { data: kyc, isLoading: kycLoading } = useKycStatus(enabled ? contractId : null);

  const isLoading = receiverLoading || kycLoading;
  // `approved_rfi` também libera: nesse estado a BlindPay mantém o cliente
  // operacional, o RFI aberto só precisa ser respondido antes do prazo.
  const isKycCleared = kyc?.kycStatus === 'APPROVED' || kyc?.kycStatus === 'APPROVED_RFI';

  /**
   * Abre o ramp (`onReady`) ou leva ao onboarding. Devolve `false` sem fazer
   * nada enquanto as consultas não terminaram.
   */
  function proceed(onReady: () => void): boolean {
    // Enquanto as consultas ainda estão em andamento os dados são `undefined` —
    // sem essa trava, um toque rápido manda até usuário já cadastrado pro
    // onboarding à toa (o próprio onboarding se autocorrige depois, mas o
    // usuário vê um flash de tela sem motivo aparente).
    if (isLoading) return false;

    const hasRampAccounts =
      receiver &&
      (receiver.bankAccounts?.length ?? 0) > 0 &&
      (receiver.blockchainWallets?.length ?? 0) > 0;

    // Ter conta e wallet não basta: um KYC recusado ou em análise deixa os dois
    // registros de pé, e mandar esse usuário para o modal de ramp só produz um
    // erro cru vindo da BlindPay lá na frente.
    if (!hasRampAccounts || !isKycCleared) {
      router.replace('/(blindpay-onboarding)' as any);
      return true;
    }
    onReady();
    return true;
  }

  return { isLoading, kycStatus: kyc?.kycStatus, proceed };
}
