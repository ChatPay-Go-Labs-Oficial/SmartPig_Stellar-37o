/**
 * WalletConnect service for Stellar — React Native compatible.
 *
 * Handles:
 *   1. Init:      initWalletConnect() — called once at app startup
 *   2. Connect:   createWalletConnectPairing() — opens Lobstr for pairing → returns address
 *   3. Sign:      signTransaction(xdr) — sends XDR to Lobstr for signing via WC relay
 *   4. Disconnect:disconnectWallet() — tears down all WC sessions
 */

import SignClient from '@walletconnect/sign-client';
import { Linking } from 'react-native';
import type { SessionTypes } from '@walletconnect/types';

const PROJECT_ID = process.env.EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID ?? '';
const STELLAR_NAMESPACE = 'stellar';
const STELLAR_METHODS = ['stellar_signXDR'];
const SIGN_TIMEOUT_MS = 120_000;

function getStellarChain(): string {
  const passphrase = process.env.EXPO_PUBLIC_STELLAR_NETWORK_PASSPHRASE ?? '';
  return passphrase.includes('Test') ? 'stellar:testnet' : 'stellar:pubnet';
}

// ── Singleton SignClient ────────────────────────────────────────
let _client: Awaited<ReturnType<typeof SignClient.init>> | null = null;
let _initPromise: Promise<void> | null = null;

export async function initWalletConnect(): Promise<void> {
  if (_client) return;
  if (_initPromise) return _initPromise;
  if (!PROJECT_ID) {
    console.warn('[WC] PROJECT_ID not set — WC disabled');
    return;
  }
  _initPromise = SignClient.init({
    projectId: PROJECT_ID,
    metadata: {
      name: 'PigFi',
      description: 'Seu portfólio DeFi na rede Stellar',
      url: 'https://pigfi.com',
      icons: ['https://pigfi.com/icon.png'],
      redirect: {
        native: 'pigfiapp://',
        universal: 'https://pigfi.com',
      },
    },
  }).then((client) => {
    _client = client;
    _initPromise = null;
    console.log('[WC] Client ready');
  }).catch((e) => {
    _initPromise = null;
    console.error('[WC] Init failed:', e);
    throw e;
  });
  return _initPromise;
}

// ── Helpers ──────────────────────────────────────────────────────
function getSessions(): SessionTypes.Struct[] {
  return _client ? Array.from(_client.session.values) : [];
}

function getLastSession(): SessionTypes.Struct | null {
  const s = getSessions();
  return s.length ? s[s.length - 1] : null;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label}: tempo esgotado (${ms / 1000}s)`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

/** Tenta abrir Lobstr via deep-link para trazê-la ao primeiro plano */
async function openLobstr() {
  try {
    const can = await Linking.canOpenURL('lobstr://');
    if (can) await Linking.openURL('lobstr://');
  } catch {
    // silently ignore — user can open manually
  }
}

// ── Public API ───────────────────────────────────────────────────

export async function createWalletConnectPairing(): Promise<{
  uri: string;
  approval: () => Promise<string>;
}> {
  await initWalletConnect();
  if (!_client) throw new Error('WalletConnect indisponível.');

  const chain = getStellarChain();
  const { uri, approval: raw } = await _client.connect({
    requiredNamespaces: {
      [STELLAR_NAMESPACE]: {
        methods: STELLAR_METHODS,
        chains: [chain],
        events: [],
      },
    },
  });
  if (!uri) throw new Error('Falha ao gerar URI.');

  const approval = async (): Promise<string> => {
    const session = await raw();
    const ns = session.namespaces[STELLAR_NAMESPACE];
    if (!ns?.accounts?.length) throw new Error('Nenhuma conta Stellar na sessão.');
    const address = ns.accounts[0].split(':')[2];
    if (!address) throw new Error('Formato de conta inválido.');
    return address;
  };
  return { uri, approval };
}

export async function signTransaction(xdr: string): Promise<string> {
  // Re-initialize if lost (hot-reload safety)
  if (!_client || getSessions().length === 0) {
    await initWalletConnect();
  }
  if (!_client) throw new Error('Carteira não conectada. Reconecte.');

  const session = getLastSession();
  if (!session) throw new Error('Sessão expirada. Reconecte sua carteira.');

  // Verify connection is alive
  try {
    await withTimeout(_client.ping({ topic: session.topic }), 5_000, 'Ping');
  } catch {
    throw new Error('Carteira offline. Abra o Lobstr e tente novamente.');
  }

  const chain = getStellarChain();
  console.log('[WC] Sending sign to', session.topic);

  // Abre Lobstr pra garantir que está em primeiro plano
  openLobstr();

  const { signedXDR } = await withTimeout(
    _client.request<{ signedXDR: string }>({
      topic: session.topic,
      chainId: `stellar:testnet`,
      request: {
        method: 'stellar_signXDR',
        params: { xdr },
      },
    }),
    SIGN_TIMEOUT_MS,
    'Assinatura',
  );

  console.log('[WC] Signed OK');
  return signedXDR;
}

export async function disconnectWallet(): Promise<void> {
  if (!_client) return;
  for (const s of getSessions()) {
    try {
      await _client.disconnect({ topic: s.topic, reason: { code: 6000, message: 'User disconnected' } });
    } catch (e) {
      console.warn('[WC] Disconnect error:', e);
    }
  }
}

export function hasActiveSession(): boolean {
  return getSessions().length > 0;
}
