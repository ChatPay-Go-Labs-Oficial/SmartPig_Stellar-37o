import type { V2IconName } from '@/components/v2';
import { V2Colors } from '@/constants/theme-v2';
import type { KycStatusResponse } from '@/lib/api/blindpay';

export interface KycStatusInfo {
  label: string;
  color: string;
  icon: V2IconName;
  /** Texto de apoio da tela de Verificação. */
  description: string;
}

/**
 * Estado da verificação de identidade (Figma 26l–26p), usado na linha do
 * Perfil e na tela de Verificação.
 *
 * O motivo da recusa vem da BlindPay em inglês e aparece como veio: é a
 * instrução do compliance sobre o que corrigir, e reescrevê-la arrisca mudar o
 * sentido.
 */
export function kycStatusInfo(kyc: KycStatusResponse): KycStatusInfo {
  switch (kyc.kycStatus) {
    case 'APPROVED':
    case 'APPROVED_RFI':
      return {
        label: 'Aprovado',
        color: V2Colors.success,
        icon: 'check',
        description: 'Sua identidade foi verificada. Você já pode depositar e sacar via Pix.',
      };
    case 'VERIFYING':
      return {
        label: 'Em análise',
        color: V2Colors.warning,
        icon: 'clock',
        description: 'Estamos analisando seus documentos. Isso costuma levar poucos minutos.',
      };
    case 'COMPLIANCE_REQUEST':
      return {
        label: 'Ação necessária',
        color: V2Colors.warning,
        icon: 'alert',
        description: 'Precisamos de informações adicionais para concluir sua verificação.',
      };
    case 'REJECTED':
      return {
        label: 'Recusado',
        color: V2Colors.error,
        icon: 'alert',
        description:
          kyc.rejectionReason ??
          'Não foi possível verificar sua identidade com os documentos enviados.',
      };
  }
}
