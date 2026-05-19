import { useState, useCallback } from 'react';
import { Linking } from 'react-native';
import { createWalletConnectPairing, disconnectWallet } from '@/lib/wallet-kit';
import { useAuthStore } from '@/lib/stores/auth.store';
import { walletLogin } from '@/lib/api/auth';

export function useWalletConnect() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setAuth = useAuthStore((s) => s.setAuth);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const connect = useCallback(async (): Promise<string> => {
    try {
      setIsConnecting(true);
      setError(null);

      const { uri, approval } = await createWalletConnectPairing();

      const redirectUrl = encodeURIComponent('stellarpigapp://');
      const lobstrUri = `lobstr://wc?uri=${encodeURIComponent(uri)}&redirectUrl=${redirectUrl}`;
      const canOpenLobstr = await Linking.canOpenURL(lobstrUri);

      if (canOpenLobstr) {
        await Linking.openURL(lobstrUri);
      } else {
        await Linking.openURL(uri);
      }

      const stellarAddress = await approval();

      const { user, wallet } = await walletLogin(stellarAddress);

      setAuth({
        userId: user.id,
        walletAccountId: wallet.id,
        stellarAddress,
      });

      return stellarAddress;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Erro ao conectar carteira';
      setError(message);
      throw e;
    } finally {
      setIsConnecting(false);
    }
  }, [setAuth]);

  const disconnect = useCallback(async (): Promise<void> => {
    try {
      await disconnectWallet();
    } catch (e) {
      console.warn('[useWalletConnect] Error during disconnect:', e);
    } finally {
      clearAuth();
    }
  }, [clearAuth]);

  return { connect, disconnect, isConnecting, error };
}
