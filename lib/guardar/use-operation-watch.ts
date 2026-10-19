import { useCallback, useEffect, useRef, useState } from 'react';
import { watchOutcome, type OperationOutcome } from './vault-operation';

/** Acompanhamento depois do prazo: verificando, ou desistiu sem resposta. */
export type WatchState = 'checking' | 'gaveUp' | null;

interface WatchSources {
  fetchStatus: () => Promise<{ status?: string; state?: string }>;
  txHash: string | null;
}

/**
 * Estado compartilhado por Guardar e Tirar depois da assinatura: o aviso de
 * demora e o acompanhamento de uma operação que ficou "pending".
 *
 * Cada operação (e cada reabertura do sheet) ganha um número; um aviso que
 * chega de uma operação antiga, ou com o sheet fechado, atualiza os saldos
 * mas não mexe mais na tela (nem toca som com nada à vista).
 */
export function useOperationWatch(visible: boolean) {
  const visibleRef = useRef(visible);
  visibleRef.current = visible;
  const current = useRef(0);
  const cancel = useRef<(() => void) | null>(null);
  const [slow, setSlow] = useState(false);
  const [watch, setWatch] = useState<WatchState>(null);

  // A tela saiu: o acompanhamento para.
  useEffect(() => () => cancel.current?.(), []);

  /** Nova operação, ou o sheet reaberto. Devolve o número da operação. */
  const begin = useCallback(() => {
    current.current += 1;
    setSlow(false);
    setWatch(null);
    return current.current;
  }, []);

  const isCurrent = useCallback((token: number) => current.current === token && visibleRef.current, []);

  /** Para o onSlow do envio: só a operação em curso mostra o aviso. */
  const slowFor = useCallback(
    (token: number) => () => {
      if (current.current === token) setSlow(true);
    },
    [],
  );

  const keepWatching = useCallback(
    (token: number, sources: WatchSources, onSettled: (outcome: OperationOutcome) => void) => {
      cancel.current?.();
      setWatch('checking');
      cancel.current = watchOutcome({
        ...sources,
        onSettled: (outcome) => {
          if (current.current === token) setWatch(outcome === 'pending' ? 'gaveUp' : null);
          onSettled(outcome);
        },
      });
    },
    [],
  );

  return { slow, watch, begin, isCurrent, slowFor, keepWatching };
}
