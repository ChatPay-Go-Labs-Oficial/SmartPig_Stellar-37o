import * as LocalAuthentication from 'expo-local-authentication';
import { beginNativePicker, endNativePicker } from './native-picker-guard';

interface BiometricPromptOptions {
  promptMessage: string;
  promptSubtitle?: string;
  promptDescription?: string;
}

interface BiometricPromptResult {
  success: boolean;
  skipped: boolean;
  message?: string;
}

export async function authenticateWithDeviceBiometrics({
  promptMessage,
  promptSubtitle,
  promptDescription,
}: BiometricPromptOptions): Promise<BiometricPromptResult> {
  try {
    const [hasHardware, isEnrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);

    if (!hasHardware || !isEnrolled) {
      return { success: true, skipped: true };
    }

    // O PIN/padrão/senha do aparelho fica como alternativa à biometria: com o
    // sensor com defeito, a pessoa não pode ficar presa fora da conta. No
    // Android o prompt ganha "Usar PIN" e, se o sensor falhar, a lib cai
    // sozinha no bloqueio de tela; no iOS o código do aparelho entra depois
    // das tentativas de Face ID/Touch ID.
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
