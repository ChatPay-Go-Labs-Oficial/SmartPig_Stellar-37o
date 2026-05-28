import { useCallback, useEffect, useState } from 'react';
import { getKit } from '@/lib/stellar/kit';
import { useAuthStore } from '@/lib/stores/auth.store';

const NATIVE_TOKEN_CONTRACT = process.env.EXPO_PUBLIC_NATIVE_TOKEN_CONTRACT;

export function useSmartAccount() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { contractId, setAuth, clearAuth } = useAuthStore();

  useEffect(() => {
    (async () => {
      if (contractId) return;
      try {
        const kit = getKit();
        const result = await kit.connectWallet();
        if (result?.contractId) {
          setAuth(result.contractId);
        }
      } catch {
        // Silent — no stored session
      }
    })();
  }, []);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const kit = getKit();
      const result = await kit.connectWallet({ prompt: true });
      if (result?.contractId) {
        setAuth(result.contractId);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err));
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, [setAuth]);

  const createWallet = useCallback(
    async (userName: string) => {
      setIsConnecting(true);
      setError(null);
      try {
        const kit = getKit();
        const result = await kit.createWallet('SmartPig', userName, {
          autoSubmit: true,
          autoFund: true,
          nativeTokenContract: NATIVE_TOKEN_CONTRACT,
        });
        setAuth(result.contractId);
      } catch (err: unknown) {
        setError(getErrorMessage(err));
        throw err;
      } finally {
        setIsConnecting(false);
      }
    },
    [setAuth],
  );

  const disconnect = useCallback(async () => {
    try {
      await getKit().disconnect();
    } catch {
      // ignore disconnect errors
    } finally {
      clearAuth();
    }
  }, [clearAuth]);

  return { isConnecting, contractId, error, connect, createWallet, disconnect };
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes('cancel') || msg.includes('abort') || msg.includes('user'))
      return 'Operação cancelada pelo usuário.';
    if (msg.includes('not supported') || msg.includes('not available'))
      return 'Passkeys não disponível neste dispositivo.';
    if (msg.includes('network') || msg.includes('fetch'))
      return 'Erro de conexão. Verifique sua internet.';
    return err.message;
  }
  return 'Ocorreu um erro inesperado.';
}
