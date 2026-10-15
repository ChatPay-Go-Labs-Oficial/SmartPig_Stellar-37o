import * as LocalAuthentication from 'expo-local-authentication';
import { beginNativePicker, endNativePicker } from './native-picker-guard';

// Cancelar não é falha de identidade: a tela volta sem mensagem de erro.
const CANCELLED = new Set<LocalAuthentication.LocalAuthenticationError>(['user_cancel', 'system_cancel', 'app_cancel']);

interface BiometricPromptOptions {
  promptMessage: string;
  promptSubtitle?: string;
  promptDescription?: string;
  /**
   * Operações com dinheiro: sem nenhum bloqueio de tela no aparelho, falha com
   * `reason: 'noDeviceLock'` em vez de seguir sem confirmação. Sem a opção
   * (ex.: abrir o app), o aparelho sem bloqueio passa direto.
   */
  requireDeviceLock?: boolean;
}

interface BiometricPromptResult {
  success: boolean;
  skipped: boolean;
  /**
   * Por que falhou, quando a tela precisa reagir diferente: sem bloqueio de
   * tela, ou a pessoa (ou o sistema) cancelou o pedido.
   */
  reason?: 'noDeviceLock' | 'cancelled';
  message?: string;
}

export async function authenticateWithDeviceBiometrics({
  promptMessage,
  promptSubtitle,
  promptDescription,
  requireDeviceLock = false,
}: BiometricPromptOptions): Promise<BiometricPromptResult> {
  try {
    // Qualquer bloqueio de tela serve: biometria, PIN, padrão ou senha. O
    // aparelho só com PIN também confirma (antes passava direto, sem pedir).
    const level = await LocalAuthentication.getEnrolledLevelAsync();

    if (level === LocalAuthentication.SecurityLevel.NONE) {
      if (requireDeviceLock) {
        return {
          success: false,
          skipped: false,
          reason: 'noDeviceLock',
          message: 'Ative o bloqueio de tela do aparelho para continuar.',
        };
      }
      return { success: true, skipped: true };
    }

    // O PIN/padrão/senha do aparelho fica como alternativa à biometria: com o
    // sensor com defeito, a pessoa não pode ficar presa fora da conta. No
    // Android o prompt ganha "Usar PIN" e, se o sensor falhar, a lib cai
    // sozinha no bloqueio de tela; sem biometria cadastrada, vai direto ao
    // PIN. No iOS o código do aparelho entra depois das tentativas de Face
    // ID/Touch ID.
    //
    // A tela de PIN do Android é outra Activity (Ajustes → ConfirmLockPassword):
    // o app vai a "background" enquanto a pessoa digita e, na volta, o AppGate
    // leria isso como saída do app e pediria a confirmação de novo, em ciclo.
    // A mesma trava dos pickers de câmera/galeria ignora essa ida e volta,
    // inclusive a folga em que o resultado chega antes do "active".
    beginNativePicker();
    let result: LocalAuthentication.LocalAuthenticationResult;
    try {
      result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        promptSubtitle,
        promptDescription,
        cancelLabel: 'Cancelar',
        disableDeviceFallback: false,
        biometricsSecurityLevel: 'weak',
      });
    } finally {
      endNativePicker();
    }

    if (result.success) {
      return { success: true, skipped: false };
    }

    return {
      success: false,
      skipped: false,
      // As outras telas seguem mostrando a mensagem; Guardar e Tirar usam o
      // motivo para voltar sem erro quando a pessoa cancelou.
      reason: CANCELLED.has(result.error) ? 'cancelled' : undefined,
      message: 'Não foi possível confirmar sua identidade. Tente novamente.',
    };
  } catch {
    return {
      success: false,
      skipped: false,
      message: 'Biometria indisponível no momento. Tente novamente.',
    };
  }
}
