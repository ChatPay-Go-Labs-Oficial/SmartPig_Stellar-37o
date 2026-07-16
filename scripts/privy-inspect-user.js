#!/usr/bin/env node
/**
 * Inspeciona um usuário Privy e lista as embedded wallets (com wallet_index),
 * já que o dashboard não mostra o índice de cada wallet.
 *
 * Uso:
 *   PRIVY_APP_ID=<app-id> PRIVY_APP_SECRET=<app-secret> \
 *     node scripts/privy-inspect-user.js --address GAGQ5TZ...
 *
 *   node scripts/privy-inspect-user.js --email usuario@exemplo.com
 *   node scripts/privy-inspect-user.js --did did:privy:cm...
 *
 * PRIVY_APP_SECRET: Privy Dashboard -> Settings -> API keys (nunca commitar).
 * PRIVY_APP_ID: se ausente, tenta ler EXPO_PUBLIC_PRIVY_APP_ID de .env.production/.env.
 */
const fs = require('fs');
const path = require('path');

const PRIVY_API_BASE = 'https://auth.privy.io/api/v1';

function readAppIdFromEnvFiles() {
  for (const file of ['.env.production', '.env']) {
    const fullPath = path.join(__dirname, '..', file);
    if (!fs.existsSync(fullPath)) continue;
    const match = fs
      .readFileSync(fullPath, 'utf8')
      .match(/^EXPO_PUBLIC_PRIVY_APP_ID=(.+)$/m);
    if (match) return match[1].trim();
  }
  return null;
}

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 2) {
    const key = argv[i]?.replace(/^--/, '');
    const value = argv[i + 1];
    if (key && value) args[key] = value;
  }
  return args;
}

function formatDate(epoch) {
  if (!epoch) return '—';
  const ms = epoch > 1e12 ? epoch : epoch * 1000;
  return new Date(ms).toISOString();
}

async function privyRequest(appId, appSecret, endpoint, body) {
  const auth = Buffer.from(`${appId}:${appSecret}`).toString('base64');
  const response = await fetch(`${PRIVY_API_BASE}${endpoint}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: `Basic ${auth}`,
      'privy-app-id': appId,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Privy API ${response.status}: ${text}`);
  }
  return response.json();
}

async function fetchUser(appId, appSecret, args) {
  if (args.did) return privyRequest(appId, appSecret, `/users/${args.did}`);
  if (args.email)
    return privyRequest(appId, appSecret, '/users/email/address', { address: args.email });
  if (args.address)
    return privyRequest(appId, appSecret, '/users/wallet/address', { address: args.address });
  throw new Error('Informe --address <G...>, --email <email> ou --did <did:privy:...>');
}

async function main() {
  const args = parseArgs(process.argv);
  const appId = process.env.PRIVY_APP_ID ?? readAppIdFromEnvFiles();
  const appSecret = process.env.PRIVY_APP_SECRET;

  if (!appId) throw new Error('PRIVY_APP_ID não encontrado (env ou .env.production).');
  if (!appSecret)
    throw new Error('Defina PRIVY_APP_SECRET (Privy Dashboard -> Settings -> API keys).');

  const user = await fetchUser(appId, appSecret, args);

  console.log(`\nUsuário: ${user.id}`);
  console.log(`Criado em: ${formatDate(user.created_at)}`);

  const wallets = (user.linked_accounts ?? []).filter((a) => a.type === 'wallet');
  const stellar = wallets.filter((w) => w.chain_type === 'stellar');
  const others = wallets.filter((w) => w.chain_type !== 'stellar');
  const nonWallets = (user.linked_accounts ?? []).filter((a) => a.type !== 'wallet');

  console.log(`\nContas de login: ${nonWallets.map((a) => `${a.type}(${a.email ?? a.subject ?? ''})`).join(', ') || '—'}`);

  console.log(`\nWallets Stellar (${stellar.length}):`);
  const sorted = [...stellar].sort(
    (a, b) =>
      (a.wallet_index ?? 0) - (b.wallet_index ?? 0) ||
      (a.first_verified_at ?? a.verified_at ?? 0) - (b.first_verified_at ?? b.verified_at ?? 0),
  );
  sorted.forEach((w, position) => {
    const marker = position === 0 ? '  << será selecionada pelo app' : '';
    console.log(
      `  index=${w.wallet_index ?? '?'}  ${w.address}  criada=${formatDate(w.first_verified_at ?? w.verified_at)}${marker}`,
    );
  });

  if (others.length) {
    console.log(`\nWallets em outras chains (${others.length}):`);
    others.forEach((w) => {
      console.log(`  chain=${w.chain_type ?? w.chain_id ?? '?'}  index=${w.wallet_index ?? '?'}  ${w.address}`);
    });
  }
  console.log();
}

main().catch((err) => {
  console.error(`Erro: ${err.message}`);
  process.exit(1);
});
