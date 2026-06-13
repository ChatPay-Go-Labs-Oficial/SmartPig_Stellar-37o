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
