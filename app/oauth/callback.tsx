import { router } from 'expo-router';
import { useEffect } from 'react';

/**
 * Destino do redirect do OAuth (Google, Apple). O Privy recebe o resultado pela
 * sessão do navegador, e o app/+native-intent.tsx descarta o link antes de o
 * expo-router navegar. Esta rota fica de reserva, se ele chegar a navegar.
 *
 * Ela só devolve a pessoa ao login que abriu o OAuth — a mesma instância, com
 * a entrada em andamento. Um `replace` montava um login novo: o "Conectando..."
 * sumia, o formulário voltava parado por alguns segundos e as duas instâncias
 * faziam o login no backend. Sem login embaixo (o Android fechou o app durante
 * o OAuth), o `dismissTo` abre um.
 *
 * Transparente e sem animação (app/_layout.tsx): nada aparece entre o
 * navegador e o login.
 */
export default function OAuthCallbackScreen() {
  useEffect(() => {
    router.dismissTo('/(auth)');
  }, []);

  return null;
}
