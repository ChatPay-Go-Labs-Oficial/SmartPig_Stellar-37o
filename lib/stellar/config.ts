import { Networks } from '@stellar/stellar-sdk';

export const STELLAR_CONFIG = {
  horizonUrl:
    process.env.EXPO_PUBLIC_STELLAR_HORIZON_URL ??
    'https://horizon-testnet.stellar.org',
  networkPassphrase:
    process.env.EXPO_PUBLIC_STELLAR_NETWORK_PASSPHRASE ?? Networks.TESTNET,
  usdcCode: 'USDC',
  usdcIssuer:
    process.env.EXPO_PUBLIC_USDC_ISSUER ??
    'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
} as const;

/**
 * A rede real vem da passphrase, nunca de string fixa na tela. Builds de
 * produção apontam para a mainnet e builds locais para a testnet — rotular
 * errado numa tela de confirmação faz o usuário achar que está movendo
 * dinheiro de mentira.
 */
export function isMainnetNetwork(): boolean {
  return STELLAR_CONFIG.networkPassphrase === Networks.PUBLIC;
}

/** Rótulo técnico da rede. Só deve aparecer no modo Pro. */
export function getNetworkLabel(): string {
  return isMainnetNetwork() ? 'Stellar Public' : 'Stellar Testnet';
}

export function getUsdcConfig() {
  const code = STELLAR_CONFIG.usdcCode.trim().toUpperCase();
  const issuer = STELLAR_CONFIG.usdcIssuer.trim();
  if (!/^[a-zA-Z0-9]{1,12}$/.test(code)) {
    throw new Error('Configuração USDC inválida: o código do ativo deve ser alfanumérico.');
  }
  if (!issuer.startsWith('G') || issuer.length !== 56) {
    throw new Error('Configuração USDC inválida: issuer Stellar incorreto.');
  }
  return { code, issuer };
}
