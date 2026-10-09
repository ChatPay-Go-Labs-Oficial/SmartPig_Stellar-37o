import { Asset } from '@stellar/stellar-sdk';
import { getUsdcConfig, isMainnetNetwork } from './config';

/**
 * Registro dos ativos que a Carteira conhece.
 *
 * O que não está aqui não aparece na Carteira, mesmo que a conta tenha saldo:
 * a lista é curada de propósito (um token qualquer enviado para a conta não
 * vira "moeda" do PigFi). No testnet isso inclui o USDB que a BlindPay usa no
 * lugar do USDC.
 */
export type WalletAssetId = 'USDC' | 'XLM' | 'EURC';

export interface WalletAssetDef {
  id: WalletAssetId;
  code: string;
  /** `null` para o nativo (XLM). */
  issuer: string | null;
}

// Circle EURC na mainnet. Conferido na referência ao vivo (Stellar Scout,
// 09/10/2026). O issuer de testnet não foi confirmado, então só entra por env.
const EURC_MAINNET_ISSUER = 'GDHU6WRG4IEQXM5NZ4BMPKOXHW76MZM4Y2IEMFDVXBSDP6SJY4ITNPP2';

function eurcIssuer(): string | null {
  const fromEnv = process.env.EXPO_PUBLIC_EURC_ISSUER?.trim();
  if (fromEnv) return fromEnv;
  return isMainnetNetwork() ? EURC_MAINNET_ISSUER : null;
}

export function getWalletAssetDefs(): WalletAssetDef[] {
  const usdc = getUsdcConfig();
  const defs: WalletAssetDef[] = [
    { id: 'USDC', code: usdc.code, issuer: usdc.issuer },
  ];
  const eurc = eurcIssuer();
  // EURC ainda não tem fluxo de trustline no app: só aparece para quem já tem.
  if (eurc) defs.push({ id: 'EURC', code: 'EURC', issuer: eurc });
  defs.push({ id: 'XLM', code: 'XLM', issuer: null });
  return defs;
}

export function toSdkAsset(def: WalletAssetDef): Asset {
  return def.issuer ? new Asset(def.code, def.issuer) : Asset.native();
}
