/**
 * Impede a restauração automática de sessão depois de sair ou de excluir a
 * conta.
 *
 * O usuário do Privy sobrevive alguns instantes em memória — no logout, até o
 * Privy terminar de sair; na exclusão, depois de apagado no servidor — e a tela
 * de autenticação o leria como sessão caída: entraria de novo na conta que
 * acabou de sair, ou recriaria a que acabou de ser destruída.
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
 * cache é o que saiu (ou foi excluído) e o login precisa ser refeito do zero.
 */
export function consumeSessionRestoreBlock(): boolean {
  const wasBlocked = blocked;
  blocked = false;
  return wasBlocked;
}
