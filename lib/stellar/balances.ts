import { Horizon } from '@stellar/stellar-sdk';
import { STELLAR_CONFIG } from './config';
import { getWalletAssetDefs, toSdkAsset, type WalletAssetDef, type WalletAssetId } from './assets';

const server = new Horizon.Server(STELLAR_CONFIG.horizonUrl);

export interface WalletAssetBalance {
  id: WalletAssetId;
  code: string;
  /** Saldo com 7 casas, como o Horizon devolve. */
  balance: string;
}

export interface WalletAssets {
  /** `false` quando a conta ainda não existe na rede (não ativada). */
  funded: boolean;
  /** Ativos do registro que a conta pode segurar, na ordem de exibição. */
  assets: WalletAssetBalance[];
}

function isNotFound(error: unknown): boolean {
  return (error as { response?: { status?: number } })?.response?.status === 404;
}

/**
 * Saldos da carteira lidos direto do Horizon.
 *
 * Diferente de GET /wallets/:addr/balance do backend, aqui saldo zero aparece,
 * erro de rede vira erro (e não lista vazia) e dá para saber se existe
 * trustline — que é o que decide se o EURC aparece.
 *
 * USDC e XLM sempre aparecem; um ativo não nativo sem trustline (EURC) fica de
 * fora. O XLM mostrado é o saldo total da conta, reservas incluídas.
 */
export async function loadWalletAssets(address: string): Promise<WalletAssets> {
  const defs = getWalletAssetDefs();

  let account: Awaited<ReturnType<typeof server.loadAccount>>;
  try {
    account = await server.loadAccount(address);
  } catch (error) {
    if (isNotFound(error)) {
      return {
        funded: false,
        assets: defs
          .filter((def) => def.id !== 'EURC')
          .map((def) => ({ id: def.id, code: def.code, balance: '0.0000000' })),
      };
    }
    throw error;
  }

  const assets: WalletAssetBalance[] = [];
  for (const def of defs) {
    const line = findBalanceLine(account.balances, def);
    if (!line && def.id === 'EURC') continue;
    assets.push({ id: def.id, code: def.code, balance: line?.balance ?? '0.0000000' });
  }
  return { funded: true, assets };
}

function findBalanceLine(
  balances: Horizon.HorizonApi.BalanceLine[],
  def: WalletAssetDef,
): Horizon.HorizonApi.BalanceLine | undefined {
  if (!def.issuer) return balances.find((b) => b.asset_type === 'native');
  return balances.find(
    (b) =>
      (b.asset_type === 'credit_alphanum4' || b.asset_type === 'credit_alphanum12') &&
      b.asset_code === def.code &&
      b.asset_issuer === def.issuer,
  );
}

// Volume de referência da cotação. Cotar 1 unidade distorce em livros rasos;
// 10 dilui o arredondamento de 7 casas sem pedir liquidez demais.
const QUOTE_AMOUNT = '10';

/**
 * Preço estimado de 1 unidade do ativo em USDC, pela melhor rota da rede
 * (strict-send no Horizon). `null` quando não há rota — comum no testnet.
 *
 * É estimativa: a tela marca o valor como tal.
 */
export async function getUsdcPrice(assetId: WalletAssetId): Promise<number | null> {
  const defs = getWalletAssetDefs();
  const usdc = defs.find((def) => def.id === 'USDC');
  const source = defs.find((def) => def.id === assetId);
  if (!usdc || !source) return null;
  if (assetId === 'USDC') return 1;

  const page = await server
    .strictSendPaths(toSdkAsset(source), QUOTE_AMOUNT, [toSdkAsset(usdc)])
    .call();

  const best = page.records
    .map((record) => Number(record.destination_amount))
    .filter((amount) => Number.isFinite(amount) && amount > 0)
    .sort((a, b) => b - a)[0];

  return best ? best / Number(QUOTE_AMOUNT) : null;
}
