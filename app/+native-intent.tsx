/**
 * Links que chegam ao app pelo sistema, antes de o expo-router navegar.
 *
 * O redirect do OAuth (Google, Apple) volta para `/oauth/callback`. O Privy
 * recebe o resultado pela sessão do navegador; o link não precisa levar a
 * lugar nenhum. Navegando, a rota entrava e saía por cima do login, e a tela
 * ficava escura por um instante na volta do navegador. Com o app aberto, o
 * link é ignorado (vazio: o expo-router não navega); abrindo o app (o Android
 * o fechou durante o OAuth), segue para a rota inicial.
 */
export function redirectSystemPath({ path, initial }: { path: string; initial: boolean }) {
  if (path.includes('oauth/callback')) return initial ? '/' : '';
  return path;
}
