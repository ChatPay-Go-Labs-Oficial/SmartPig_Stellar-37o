import { create } from 'zustand';

interface OpeningState {
  /** A entrada animada da abertura terminou, com a pausa do logo. */
  introDone: boolean;
  /** Status sob o logo, decidido pelo AppGate ("Entrando..."). */
  status?: string;
  /** A abertura deve se dissolver no que está embaixo (login, home). */
  exiting: boolean;
  /** A abertura saiu da tela (dissolveu ou ficou coberta pela tela do gate). */
  exited: boolean;
}

/**
 * A abertura do app (OpeningSplash) é desenhada pelo layout raiz, antes de o
 * resto do app existir: a entrada anima com o aparelho livre, e só então o
 * Privy, as rotas e a home montam por baixo. Quem decide quando ela sai é o
 * AppGate, que só existe depois — este estado liga os dois.
 *
 * Não persistido: vale só para esta execução do app.
 */
export const useOpeningStore = create<OpeningState>(() => ({
  introDone: false,
  status: undefined,
  exiting: false,
  exited: false,
}));
