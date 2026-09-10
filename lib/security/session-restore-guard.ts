/**
 * Impede a restauração automática de sessão depois de excluir a conta.
 *
 * O usuário do Privy sobrevive alguns instantes em memória depois de apagado no
 * servidor, e a tela de autenticação leria isso como sessão caída — recriando a
 * conta segundos depois de destruí-la.
 */
let blocked = false;

export function blockSessionRestore(): void {
  blocked = true;
}

export function isSessionRestoreBlocked(): boolean {
  return blocked;
}

/**
 * Libera o bloqueio e informa se ele estava ativo — quando estava, o usuário em
 * cache é o excluído e o login precisa ser refeito do zero.
 */
export function consumeSessionRestoreBlock(): boolean {
  const wasBlocked = blocked;
  blocked = false;
  return wasBlocked;
}
