let activeCount = 0;

/**
 * Câmera/galeria nativas levam o app para "inactive/background" por um instante,
 * o que o AppGate normalmente interpreta como o usuário saindo do app e usa para
 * re-exigir biometria. Telas que abrem um picker nativo devem envolver a chamada
 * com begin/end para que essa transição específica seja ignorada.
 */
export function beginNativePicker() {
  activeCount++;
}

export function endNativePicker() {
  activeCount = Math.max(0, activeCount - 1);
}

export function isNativePickerActive() {
  return activeCount > 0;
}
