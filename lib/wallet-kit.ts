/**
 * WalletConnect service for Stellar — React Native compatible.
 *
 * Uses @walletconnect/sign-client directly instead of the kit's WalletConnectModule
 * because @reown/appkit (used internally by the kit) relies on DOM APIs unavailable in RN.
 *
 * Usage:
 *   1. Call initWalletConnect() once at app startup (root _layout.tsx)
 *   2. Use connectWithLobstr() to pair with Lobstr mobile
 *   3. Use signTransaction() to sign Stellar XDR
 *   4. Use disconnectWallet() on logout
 */

import SignClient from '@walletconnect/sign-client';
import { Linking } from 'react-native';

const PROJECT_ID = process.env.EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID ?? '';
const STELLAR_NAMESPACE = 'stellar';
const STELLAR_METHODS = ['stellar_signXDR'];

function getStellarChain(): string {
  const passphrase = process.env.EXPO_PUBLIC_STELLAR_NETWORK_PASSPHRASE ?? '';
  return passphrase.includes('Test') ? 'stellar:testnet' : 'stellar:pubnet';
}

// Store on `global` so the singleton survives hot-module-reloading in dev.
const _g = global as any;

function _client(): Awaited<ReturnType<typeof SignClient.init>> | null {
  return _g.__wc_client ?? null;
}

export async function initWalletConnect(): Promise<void> {
  if (_g.__wc_client) return;
  if (_g.__wc_initPromise) return _g.__wc_initPromise;
  if (!PROJECT_ID) {
    console.warn('[WalletConnect] EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID not set — WalletConnect will not work.');
    return;
  }
  _g.__wc_initPromise = SignClient.init({
    projectId: PROJECT_ID,
    metadata: {
      name: 'PigFi',
      description: 'Seu portfólio DeFi na rede Stellar',
      url: 'https://pigfi.app',
      icons: ['https://pigfi.app/icon.png'],
      redirect: {
        native: 'stellarpigapp://',
        universal: 'https://pigfi.app',
      },
    },
  }).then((c) => {
    _g.__wc_client = c;
    _g.__wc_initPromise = null;
  }).catch((e) => {
    _g.__wc_initPromise = null;
    throw e;
  });
  return _g.__wc_initPromise;
}

export function getWalletConnectClient() {
  return _client();
}

/**
 * Initiates a WalletConnect pairing session and returns the WC URI.
 * The caller is responsible for opening the URI in the wallet app (e.g., Lobstr).
 * Call `awaitWalletApproval(approval)` with the returned `approval` to get the address.
 */
export async function createWalletConnectPairing(): Promise<{
  uri: string;
  approval: () => Promise<string>;
}> {
  await initWalletConnect();
  const c = _client();
  if (!c) throw new Error('WalletConnect não pôde ser inicializado. Verifique EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID.');

  const chain = getStellarChain();
  const { uri, approval: rawApproval } = await c.connect({
    optionalNamespaces: {
      [STELLAR_NAMESPACE]: {
        methods: STELLAR_METHODS,
        chains: [chain],
        events: [],
      },
    },
  });

  if (!uri) throw new Error('Falha ao gerar URI do WalletConnect.');

  const approval = async (): Promise<string> => {
    const session = await rawApproval();
    const accounts = session.namespaces[STELLAR_NAMESPACE]?.accounts ?? [];
    if (accounts.length === 0) throw new Error('Nenhuma conta Stellar encontrada na sessão.');
    // Format: "stellar:testnet:GABC..."
    const address = accounts[0].split(':')[2];
    if (!address) throw new Error('Formato de conta inválido retornado pela carteira.');
    return address;
  };

  return { uri, approval };
}

export async function signTransaction(xdr: string): Promise<string> {
  const c = _client();
  if (!c) throw new Error('WalletConnect não inicializado.');

  const sessions = c.session.values;
  if (sessions.length === 0) throw new Error('Nenhuma sessão WalletConnect ativa.');

  const session = sessions[sessions.length - 1];
  const chain = getStellarChain();

  // Fire the WC request first (don't await yet), then open Lobstr so the user
  // sees the signing prompt immediately — push notifications are unreliable in
  // dev builds and Lobstr needs to be in the foreground to respond.
  const requestPromise = c.request<{ signedXDR: string }>({
    topic: session.topic,
    chainId: chain,
    request: {
      method: 'stellar_signXDR',
      params: { xdr },
    },
  });

  // Open Lobstr with a redirectUrl so it brings the user back after signing.
  // lobstr://wc?redirectUrl=<app_url> — without uri=, shows the pending signing request.
  const lobstrSignUri = `lobstr://wc?redirectUrl=${encodeURIComponent('stellarpigapp://')}`;
  Linking.openURL(lobstrSignUri).catch(() =>
    Linking.openURL('lobstr://').catch(() => {}),
  );

  const { signedXDR } = await requestPromise;
  return signedXDR;
}

export async function disconnectWallet(): Promise<void> {
  const c = _client();
  if (!c) return;
  const sessions = c.session.values;
  for (const session of sessions) {
    await c.disconnect({
      topic: session.topic,
      reason: { code: 6000, message: 'User disconnected' },
    });
  }
}

export function getActiveSessions() {
  return _client()?.session.values ?? [];
}

export function hasActiveSession(): boolean {
  return (_client()?.session.values.length ?? 0) > 0;
}
