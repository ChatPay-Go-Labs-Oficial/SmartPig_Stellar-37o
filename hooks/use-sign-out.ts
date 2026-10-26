import { useCallback } from 'react';
import { usePrivy } from '@privy-io/expo';
import { useAppModeStore } from '@/lib/stores/app-mode.store';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useBlindPayStore } from '@/lib/stores/blindpay.store';
import { usePixStore } from '@/lib/stores/pix.store';
import { useLevelUpStore } from '@/lib/stores/level-up.store';
import { usePiggyUnlockStore } from '@/lib/stores/piggy-unlock.store';
import { LEGACY_LEARNING_STORAGE_KEY } from '@/lib/security/wipe-local-state';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { blockSessionRestore } from '@/lib/security/session-restore-guard';

/** Quanto a saída espera o Privy antes de seguir sem ele. */
const PRIVY_LOGOUT_TIMEOUT_MS = 3_000;

/**
 * Sai da conta: a mesma sequência no Perfil e no cadeado.
 *
 * A ordem importa. Limpando a sessão local antes de o Privy terminar de sair,
 * o gate levava ao login com o usuário do Privy ainda em memória, e o login o
 * lia como sessão a restaurar: entrava de novo na Home, e voltava ao login
 * quando o Privy enfim saía. Agora:
 *
 * 1. bloqueia a restauração automática (cobre o Privy que não saiu a tempo);
 * 2. sai do Privy, com tempo-limite;
 * 3. só então limpa a sessão local e os dados sensíveis do aparelho.
 *
 * Não navega: sem sessão, o AppGate leva ao login, uma vez só, e limpa o
 * cache das consultas.
 */
export function useSignOut(): () => Promise<void> {
  const { logout } = usePrivy();

  return useCallback(async () => {
    blockSessionRestore();

    await Promise.race([
      logout().catch(() => {}),
      new Promise((resolve) => setTimeout(resolve, PRIVY_LOGOUT_TIMEOUT_MS)),
    ]);

    // Também desconecta o kit da smart account (ver clearAuth).
    useAuthStore.getState().clearAuth();
    // Chave Pix, rascunho de KYC e URLs de documentos não podem sobreviver ao
    // logout num aparelho que outra pessoa pode voltar a usar (docs/security.md).
    // hasBankAccount/hasWallet/receiverId são só cache local: o backend segue
    // sendo a fonte de verdade no próximo login.
    useBlindPayStore.getState().resetOnboarding();
    usePixStore.getState().clearPixKey();
    // O modo Lite/Pro é da conta e volta do backend no próximo login.
    useAppModeStore.getState().reset();
    // Cenas do PigFi Experience pedidas e ainda não vistas são da conta que saiu.
    useLevelUpStore.getState().dismiss();
    usePiggyUnlockStore.getState().dismiss();
    // Progresso da trilha v1, de antes da trilha vir do backend.
    AsyncStorage.removeItem(LEGACY_LEARNING_STORAGE_KEY).catch(() => {});
  }, [logout]);
}
