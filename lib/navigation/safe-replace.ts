import { InteractionManager } from 'react-native';
import { router } from 'expo-router';

/**
 * O Android com Fabric (New Architecture) tem um bug conhecido e ainda não
 * corrigido no react-native-screens: trocar de tela enquanto uma view ainda
 * está em transição (spring de toque de botão, teclado fechando) pode
 * derrubar o app com "IllegalStateException: The specified child already
 * has a parent" (github.com/software-mansion/react-native-screens#3249).
 * Adiar a navegação até as interações em curso terminarem reduz bastante a
 * chance de cair nessa corrida — não é uma garantia, já que o bug real está
 * no código nativo da biblioteca, não no nosso.
 */
export function safeReplace(href: string) {
  InteractionManager.runAfterInteractions(() => {
    router.replace(href as any);
  });
}
