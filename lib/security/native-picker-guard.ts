let activeCount = 0;
let activatedAt: number | null = null;

// Teto de quanto tempo a trava fica valendo mesmo com activeCount > 0. Sem isso,
// um picker nativo esquecido aberto (app trocado de primeiro plano por muito
// tempo, processo do picker travado etc.) suspenderia o relock biométrico
// indefinidamente. 2 minutos cobre folgadamente o tempo real de uso da câmera/
// galeria, sem reabrir a janela de bypass por muito tempo em caso de esquecimento.
const MAX_ACTIVE_MS = 2 * 60 * 1000;

/**
 * Câmera/galeria nativas levam o app para "inactive/background" por um instante,
 * o que o AppGate normalmente interpreta como o usuário saindo do app e usa para
 * re-exigir biometria. Telas que abrem um picker nativo devem envolver a chamada
 * com begin/end para que essa transição específica seja ignorada.
 */
export function beginNativePicker() {
  activeCount++;
  activatedAt = Date.now();
}

export function endNativePicker() {
  activeCount = Math.max(0, activeCount - 1);
  if (activeCount === 0) activatedAt = null;
}

export function isNativePickerActive() {
  if (activeCount === 0 || activatedAt === null) return false;
  if (Date.now() - activatedAt > MAX_ACTIVE_MS) return false;
  return true;
}
