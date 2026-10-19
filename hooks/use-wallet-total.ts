import { useUsdcPrice, useWalletAssets } from '@/lib/queries/wallets.queries';

/**
 * Saldo da carteira em dólar: a soma das moedas (USDC, XLM, EURC) pelas
 * cotações. É o número do card da Carteira e da linha "Saldo na carteira" da
 * Home, que precisam bater.
 *
 * - `totalUsd` é null enquanto alguma moeda com saldo ainda não tem cotação:
 *   melhor não mostrar um total que depois muda.
 * - `estimated` diz se há moeda além do dólar no total (mostrado com "≈").
 */
export function useWalletTotal(walletAddress: string | null) {
  const assetsQuery = useWalletAssets(walletAddress);
  const assets = assetsQuery.data?.assets ?? [];
  const hasEurc = assets.some((a) => a.id === 'EURC');
  const xlmPrice = useUsdcPrice('XLM');
  const eurcPrice = useUsdcPrice('EURC', hasEurc);
  const prices = { USDC: 1, XLM: xlmPrice.data, EURC: eurcPrice.data };

  const hasUnpricedBalance = assets.some((asset) => {
    const amount = parseFloat(asset.balance);
    return Number.isFinite(amount) && amount > 0 && prices[asset.id] == null;
  });
  const totalUsd = hasUnpricedBalance
    ? null
    : assets.reduce((sum, asset) => {
        const price = prices[asset.id];
        const amount = parseFloat(asset.balance);
        return price != null && Number.isFinite(amount) ? sum + amount * price : sum;
      }, 0);
  const estimated = assets.some((a) => a.id !== 'USDC' && parseFloat(a.balance) > 0);

  async function refetch() {
    await Promise.allSettled([assetsQuery.refetch(), xlmPrice.refetch(), eurcPrice.refetch()]);
  }

  return { assetsQuery, assets, prices, totalUsd, estimated, refetch };
}
