let activeCount = 0;
let activatedAt: number | null = null;
let graceUntil = 0;

// Teto de quanto tempo a trava fica valendo mesmo com activeCount > 0. Sem isso,
// um picker nativo esquecido aberto (app trocado de primeiro plano por muito
// tempo, processo do picker travado etc.) suspenderia o relock biométrico
// indefinidamente. 2 minutos cobre folgadamente o tempo real de uso da câmera/
// galeria, sem reabrir a janela de bypass por muito tempo em caso de esquecimento.
const MAX_ACTIVE_MS = 2 * 60 * 1000;

// O resultado do picker chega ao JS ANTES de o app voltar para "active": no
// Android o `onActivityResult` é entregue antes do `onResume`, e é do `onResume`
// que sai o evento AppState. Sem essa folga, `endNativePicker` soltava a trava no
// mesmo tick em que a Promise resolvia, e aí o AppGate lia a volta da câmera/
// galeria como "o usuário saiu do app" — remontando o Modal de bloqueio e
// abrindo o BiometricPrompt enquanto a Activity ainda retomava e a tela
// re-renderizava com a foto. Isso derrubava o app no Fabric com "addViewAt:
// failed to insert view into parent". A corrida era perdida sempre, não de vez
// em quando.
const RESUME_GRACE_MS = 2000;

/**
 * Câmera/galeria nativas levam o app para "inactive/background" por um instante,
 * o que o AppGate normalmente interpreta como o usuário saindo do app e usa para
 * re-exigir biometria. Telas que abrem um picker nativo devem envolver a chamada
 * com begin/end para que essa transição específica seja ignorada.
 */
export function beginNativePicker() {
  activeCount++;
  activatedAt = Date.now();
  graceUntil = 0;
}

export function endNativePicker() {
  activeCount = Math.max(0, activeCount - 1);
  if (activeCount === 0) {
    activatedAt = null;
    graceUntil = Date.now() + RESUME_GRACE_MS;
  }
}

export function isNativePickerActive() {
  // A folga pós-picker vale mesmo com activeCount já zerado — é justamente a
  // janela em que o app ainda está voltando do picker (ver RESUME_GRACE_MS).
  if (Date.now() < graceUntil) return true;
  if (activeCount === 0 || activatedAt === null) return false;
  if (Date.now() - activatedAt > MAX_ACTIVE_MS) return false;
  return true;
}
