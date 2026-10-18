/** Quadros seguidos dentro do prazo que contam como "aparelho livre". */
const CALM_FRAMES = 8;
const CALM_FRAME_MS = 34;
/** Espera máxima por quadros livres antes de seguir mesmo assim. */
const CALM_MAX_MS = 1_500;

/**
 * Chama `onCalm` quando o aparelho volta a entregar quadros no ritmo: alguns
 * seguidos sem atraso, ou o tempo-limite. Os quadros do JS só chegam quando a
 * thread de UI os libera, então um travamento em qualquer uma das duas atrasa
 * a contagem.
 *
 * Para animações que não podem disputar o aparelho com uma montagem pesada
 * (a entrada da abertura, a saída do login): elas esperam a montagem passar.
 * Devolve o cancelamento.
 */
export function waitForCalm(onCalm: () => void, maxMs = CALM_MAX_MS): () => void {
  const start = performance.now();
  let last = start;
  let streak = 0;
  let frame = 0;
  let done = false;

  const tick = () => {
    const now = performance.now();
    streak = now - last < CALM_FRAME_MS ? streak + 1 : 0;
    last = now;
    if (streak >= CALM_FRAMES || now - start > maxMs) {
      done = true;
      onCalm();
      return;
    }
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);

  return () => {
    if (!done) cancelAnimationFrame(frame);
  };
}

/** `waitForCalm` em forma de Promise. */
export function calmFrames(maxMs = CALM_MAX_MS): Promise<void> {
  return new Promise((resolve) => {
    waitForCalm(resolve, maxMs);
  });
}
