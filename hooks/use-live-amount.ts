import { useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { NavigationContext } from '@react-navigation/native';
import { fromUnits } from '@/lib/utils/piggy';
import { useAppLockStore } from '@/lib/stores/app-lock.store';
import {
  clockNow,
  floorFor,
  grownUnits,
  makeGrowth,
  releaseAnchor,
  retainAnchor,
  subscribeClock,
  type Growth,
} from '@/lib/utils/live-amount';

const noSubscribe = () => () => {};

/**
 * A quantidade crescendo pelo APY, com 7 casas ("771.8263012"). Sem APY ou
 * sem saldo, devolve a quantidade como veio.
 *
 * Só anda com o app em primeiro plano, a tela em foco (as abas ficam
 * montadas: sem isso, toda aba visitada seguiria contando por trás) e nada do
 * gate por cima. O componente só redesenha quando o texto muda.
 */
export function useLiveAmount(amount: string, apyPercent: number | null | undefined): string {
  const growth = useMemo(() => makeGrowth(amount, apyPercent ?? null), [amount, apyPercent]);

  // Segura o ponto de partida enquanto esta quantidade estiver na tela.
  useEffect(() => {
    if (!growth) return;
    retainAnchor(growth.key, growth.since);
    return () => releaseAnchor(growth.key);
  }, [growth]);

  // Leitura nova: piso para o número não voltar casas por pouco (ver
  // HOLD_WINDOW_MS). Calculado na troca, a partir do que estava na tela.
  const shown = useRef<bigint | null>(null);
  const anchor = useRef<Growth | null>(null);
  const floor = useRef(0n);
  if (anchor.current !== growth) {
    floor.current = growth ? floorFor(shown.current, growth, Date.now()) : 0n;
    anchor.current = growth;
  }

  const active = useActive();

  const units = useSyncExternalStore(
    growth && active ? subscribeClock : noSubscribe,
    // Texto (não BigInt): o mesmo valor devolve a mesma string, e o React
    // não redesenha.
    () => {
      if (!growth) return null;
      const grown = grownUnits(growth, Math.max(clockNow(), growth.since));
      return (grown > floor.current ? grown : floor.current).toString();
    },
  );

  if (units == null) {
    shown.current = null;
    return amount;
  }
  const value = BigInt(units);
  shown.current = value;
  return fromUnits(value);
}

/**
 * App em primeiro plano, sem o gate cobrindo (abertura, cadeado) e, dentro de
 * uma navegação, a tela em foco. A home monta por baixo da abertura: contando
 * ali, redesenhava 10 vezes por segundo enquanto a abertura animava.
 */
function useActive(): boolean {
  const locked = useAppLockStore((s) => s.locked);
  const navigation = useContext(NavigationContext);
  const [focused, setFocused] = useState(() => navigation?.isFocused() ?? true);
  const [foreground, setForeground] = useState(() => AppState.currentState === 'active');

  useEffect(() => {
    if (!navigation) return;
    setFocused(navigation.isFocused());
    const offFocus = navigation.addListener('focus', () => setFocused(true));
    const offBlur = navigation.addListener('blur', () => setFocused(false));
    return () => {
      offFocus();
      offBlur();
    };
  }, [navigation]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => setForeground(state === 'active'));
    return () => subscription.remove();
  }, []);

  return focused && foreground && !locked;
}
