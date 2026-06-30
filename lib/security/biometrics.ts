import * as LocalAuthentication from 'expo-local-authentication';

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

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      promptSubtitle,
      promptDescription,
      cancelLabel: 'Cancelar',
      fallbackLabel: '',
      disableDeviceFallback: true,
      biometricsSecurityLevel: 'weak',
    });

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
