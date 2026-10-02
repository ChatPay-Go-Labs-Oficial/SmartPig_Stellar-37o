import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/**
 * Informa se o app já esteve em primeiro plano nesta execução do processo.
 *
 * O iOS pode iniciar o processo em segundo plano, minutos antes de o usuário
 * tocar no ícone (prewarming). Nesse caso o JS roda e é suspenso logo em
 * seguida. Uma vez `true`, não volta a `false`: serve para adiar o que não pode
 * começar em segundo plano, não para acompanhar o estado do app.
 *
 * `inactive` conta como primeiro plano porque é o estado de uma abertura normal
 * antes do `didBecomeActive`.
 */
export function useHasBeenForegrounded(): boolean {
  const [foregrounded, setForegrounded] = useState(
    () => AppState.currentState !== 'background',
  );

  useEffect(() => {
    if (foregrounded) return;

    // O estado pode ter mudado entre o render e este efeito, antes de haver
    // listener para ouvir a mudança.
    if (AppState.currentState !== 'background') {
      setForegrounded(true);
      return;
    }

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState !== 'background') setForegrounded(true);
    });

    return () => subscription.remove();
  }, [foregrounded]);

  return foregrounded;
}
