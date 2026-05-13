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

const PROJECT_ID = process.env.EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID ?? '';
const STELLAR_NAMESPACE = 'stellar';
const STELLAR_METHODS = ['stellar_signXDR'];

function getStellarChain(): string {
  const passphrase = process.env.EXPO_PUBLIC_STELLAR_NETWORK_PASSPHRASE ?? '';
  return passphrase.includes('Test') ? 'stellar:testnet' : 'stellar:pubnet';
}

let _client: Awaited<ReturnType<typeof SignClient.init>> | null = null;
let _initPromise: Promise<void> | null = null;

export async function initWalletConnect(): Promise<void> {
  if (_client) return;
  // Reuse in-flight promise so concurrent calls don't create multiple clients
  if (_initPromise) return _initPromise;
  if (!PROJECT_ID) {
    console.warn('[WalletConnect] EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID not set — WalletConnect will not work.');
    return;
  }
  _initPromise = SignClient.init({
    projectId: PROJECT_ID,
    metadata: {
      name: 'StellarPig',
      description: 'Seu portfólio DeFi na rede Stellar',
      url: 'https://stellarpig.com',
      icons: ['https://stellarpig.com/icon.png'],
      redirect: {
        native: 'stellarpigapp://',
        universal: 'https://stellarpig.com',
      },
    },
  }).then((client) => {
    _client = client;
    _initPromise = null;
  }).catch((e) => {
    _initPromise = null;
    throw e;
  });
  return _initPromise;
}

export function getWalletConnectClient() {
  return _client;
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
  // Auto-initialize if not done yet (handles race condition on startup)
  await initWalletConnect();
  if (!_client) throw new Error('WalletConnect não pôde ser inicializado. Verifique EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID.');

  const chain = getStellarChain();
  const { uri, approval: rawApproval } = await _client.connect({
    requiredNamespaces: {
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
  if (!_client) throw new Error('WalletConnect não inicializado.');

  const sessions = _client.session.values;
  if (sessions.length === 0) throw new Error('Nenhuma sessão WalletConnect ativa.');

  const session = sessions[sessions.length - 1];
  const chain = getStellarChain();

  const { signedXDR } = await _client.request<{ signedXDR: string }>({
    topic: session.topic,
    chainId: chain,
    request: {
      method: 'stellar_signXDR',
      params: { xdr },
    },
  });

  return signedXDR;
}

export async function disconnectWallet(): Promise<void> {
  if (!_client) return;
  const sessions = _client.session.values;
  for (const session of sessions) {
    await _client.disconnect({
      topic: session.topic,
      reason: { code: 6000, message: 'User disconnected' },
    });
  }
}

export function getActiveSessions() {
  return _client?.session.values ?? [];
}

export function hasActiveSession(): boolean {
  return (_client?.session.values.length ?? 0) > 0;
}
