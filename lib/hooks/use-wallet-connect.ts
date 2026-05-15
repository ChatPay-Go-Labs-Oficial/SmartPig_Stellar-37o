import { useState, useCallback } from 'react';
import { Linking } from 'react-native';
import * as ExpoLinking from 'expo-linking';
import { createWalletConnectPairing, disconnectWallet } from '@/lib/wallet-kit';
import { useWalletStore } from '@/lib/stores/wallet.store';
import { useAuthStore } from '@/lib/stores/auth.store';
import { AuthApi } from '@/lib/api/auth.api';

/**
 * Hook for WalletConnect-based wallet connection (Lobstr mobile and other WC v2 wallets).
 *
 * Flow:
 *   1. connect() → generates WC URI → opens Lobstr via deep link
 *   2. User approves in Lobstr → address returned
 *   3. Address is persisted in walletStore and authStore
 */
export function useWalletConnect() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setWalletAddress = useWalletStore((s) => s.setWalletAddress);
  const clearWallet = useWalletStore((s) => s.clearWallet);
  const setAuth = useAuthStore((s) => s.setAuth);
  const setUserId = useAuthStore((s) => s.setUserId);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const connect = useCallback(async (): Promise<string> => {
    try {
      setIsConnecting(true);
      setError(null);

      const { uri, approval } = await createWalletConnectPairing();

      // Try Lobstr-specific deep link first, then fall back to raw WC URI.
      // redirectUrl brings the user back to this app after approving in Lobstr.
      // ExpoLinking.createURL resolves to the correct scheme for the current environment
      // (stellarpigapp:// in dev builds, exp://... in Expo Go).
      const redirectUrl = encodeURIComponent(ExpoLinking.createURL(''));
      const lobstrUri = `lobstr://wc?uri=${encodeURIComponent(uri)}&redirectUrl=${redirectUrl}`;
      const canOpenLobstr = await Linking.canOpenURL(lobstrUri);

      if (canOpenLobstr) {
        await Linking.openURL(lobstrUri);
      } else {
        // Fallback: open raw WC URI — system may prompt to open a compatible wallet
        await Linking.openURL(uri);
      }

      // Await wallet approval (user confirms in the Lobstr app)
      const address = await approval();

      setWalletAddress(address);
      setAuth(address);

      const { user } = await AuthApi.walletLogin(address);
      setUserId(user.id);

      return address;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Erro ao conectar carteira';
      setError(message);
      throw e;
    } finally {
      setIsConnecting(false);
    }
  }, [setWalletAddress, setAuth, setUserId]);

  const disconnect = useCallback(async (): Promise<void> => {
    try {
      await disconnectWallet();
    } catch (e) {
      console.warn('[useWalletConnect] Error during disconnect:', e);
    } finally {
      clearAuth();
      clearWallet();
    }
  }, [clearAuth, clearWallet]);

  return { connect, disconnect, isConnecting, error };
}
