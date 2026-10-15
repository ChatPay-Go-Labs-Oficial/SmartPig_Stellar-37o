import { useEffect, useState } from 'react';
import { useNavigation } from 'expo-router';
import type { ParamListBase } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

/**
 * `true` depois que a animação de entrada da tela no stack termina.
 *
 * Use para adiar a parte pesada de uma tela empurrada (listas longas): montar
 * tudo no meio da transição ocupa o JS e a animação engasga. O teto garante
 * que a tela aparece mesmo quando o evento não vem (ex.: abertura por deep
 * link, sem animação).
 */
export function useTransitionReady(fallbackMs = 450): boolean {
  const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), fallbackMs);
    const unsubscribe = navigation.addListener('transitionEnd', (event) => {
      if (event.data.closing) return;
      clearTimeout(timer);
      setReady(true);
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [navigation, fallbackMs]);

  return ready;
}
