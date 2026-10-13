import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { AssetIcon, type AssetLogoId } from '@/components/v2';
import { V2Colors, V2Font, V2Radius } from '@/constants/theme-v2';
import { useAccent } from '@/hooks/use-accent';
import { useTerms } from '@/hooks/use-terms';
import { useVaultAccess } from '@/hooks/use-vault-access';
import type { PortfolioSummary } from '@/lib/api/portfolio';
import { formatUsdV2, truncateDecimalString } from '@/lib/utils/format';
import {
  portfolioPositionUsdValue,
  positionUsesMarketPrice,
} from '@/lib/utils/portfolio';

interface WalletPortfolioCardProps {
  summary: PortfolioSummary | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

const ASSET_LOGOS: readonly AssetLogoId[] = ['USDC', 'EURC', 'XLM'];

function hasAssetLogo(symbol: string): symbol is AssetLogoId {
  return ASSET_LOGOS.includes(symbol as AssetLogoId);
}

function formatCompactAssetAmount(raw: string): string {
  const compact = truncateDecimalString(raw, 2);
  const hiddenDecimals = raw.split('.')[1]?.slice(2) ?? '';
  return hiddenDecimals.replace(/0+$/, '').length > 0 ? `${compact}…` : compact;
}

export function WalletPortfolioCard({
  summary,
  isLoading,
  isError,
  onRetry,
}: WalletPortfolioCardProps) {
  const accent = useAccent();
  const { isPro } = useTerms();
  const { canAccessVaultAsset } = useVaultAccess();
  const positions = summary?.positions.filter((position) =>
    canAccessVaultAsset(position.assetSymbol),
  );
  const visibleTotalUsd = positions?.some(
    (position) => portfolioPositionUsdValue(position) === null,
  )
    ? null
    : positions
        ?.reduce(
          (total, position) => total + (portfolioPositionUsdValue(position) ?? 0),
          0,
        )
        .toString();
  const usesMarketPricing = positions?.some(positionUsesMarketPrice) ?? false;

  if (!summary && isLoading) {
    return (
      <View style={[styles.card, styles.state]}>
        <ActivityIndicator color={accent.base} />
      </View>
    );
  }

  if (!summary && isError) {
    return (
      <View style={[styles.card, styles.state]}>
        <Text style={styles.stateText}>Não foi possível carregar seus porquinhos.</Text>
        <Pressable onPress={onRetry} accessibilityRole="button" hitSlop={8}>
          <Text style={[styles.retry, { color: accent.base }]}>Tentar novamente</Text>
        </Pressable>
      </View>
    );
  }

  if (!summary || !positions || positions.length === 0) {
    return (
      <View style={[styles.card, styles.empty]}>
        <Text style={styles.emptyTitle}>Nenhum valor investido</Text>
        <Text style={styles.emptyText}>Seus investimentos aparecerão aqui.</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      {positions.length > 1 && (
        <View style={styles.totalBlock}>
          <View style={styles.totalLabelRow}>
            <Text style={styles.totalLabel}>
              {isPro
                ? usesMarketPricing
                  ? 'Valor estimado nos vaults'
                  : 'Total nos vaults'
                : 'Total guardado'}
            </Text>
            {summary.stale && (
              <View style={styles.staleChip}>
                <Text style={styles.staleText}>pode estar desatualizado</Text>
              </View>
            )}
          </View>

          {visibleTotalUsd === null ? (
            <>
              <Text style={styles.unavailable}>Total indisponível</Text>
              <Text style={styles.totalHint}>Confira os valores por moeda abaixo.</Text>
            </>
          ) : (
            <Text style={styles.total}>{formatUsdV2(visibleTotalUsd ?? '0')}</Text>
          )}

          {isPro && usesMarketPricing && summary.priceSource && (
            <Text style={styles.source}>Estimativa em USD · {formatPriceSource(summary.priceSource)}</Text>
          )}
        </View>
      )}

      {positions.map((position) => {
        const symbol = position.assetSymbol.toUpperCase();
        return (
          <View key={position.vaultId} style={styles.position}>
            {hasAssetLogo(symbol) ? (
              <AssetIcon asset={symbol} size={38} />
            ) : (
              <View style={styles.fallbackIcon}>
                <Text style={styles.fallbackIconText}>{symbol.slice(0, 1)}</Text>
              </View>
            )}

            <View style={styles.positionText}>
              <Text style={styles.vaultName} numberOfLines={1}>{position.vaultName}</Text>
              {positions.length === 1 && summary.stale && (
                <Text style={styles.staleInline}>pode estar desatualizado</Text>
              )}
              {isPro && (
                <Text style={styles.shares} numberOfLines={1}>
                  {truncateDecimalString(position.shares, 7)} cotas
                </Text>
              )}
            </View>

            <View style={styles.usdValue}>
              <Text style={styles.usdText}>
                {isPro
                  ? `${formatCompactAssetAmount(position.amountAsset)} ${symbol}`
                  : formatUsdV2(position.amountAsset)}
              </Text>
              {isPro && positionUsesMarketPrice(position)
                ? position.amountUsd !== null
                  ? (
                    <>
                      <Text style={styles.estimate}>≈ {formatUsdV2(position.amountUsd)}</Text>
                      <Text style={styles.positionSource}>
                        {formatPositionPrice(
                          position.amountAsset,
                          position.amountUsd,
                          symbol,
                          summary.priceSource,
                        )}
                      </Text>
                    </>
                  )
                  : <Text style={styles.unpriced}>sem cotação</Text>
                : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function formatPriceSource(source: PortfolioSummary['priceSource']): string {
  if (source === 'REFLECTOR') return 'Reflector';
  if (source === 'STATIC') return 'cotação fixa';
  if (source === 'MIXED') return 'fontes combinadas';
  return 'fonte indisponível';
}

function formatPositionPrice(
  amountAsset: string,
  amountUsd: string,
  symbol: string,
  source: PortfolioSummary['priceSource'],
): string {
  const asset = Number(amountAsset);
  const usd = Number(amountUsd);
  if (!Number.isFinite(asset) || asset <= 0 || !Number.isFinite(usd)) {
    return formatPriceSource(source);
  }

  const unitPrice = truncateDecimalString((usd / asset).toFixed(7), 4);
  return `${formatPriceSource(source)} · 1 ${symbol} ≈ US$ ${unitPrice}`;
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: V2Colors.surfaceBorder,
    borderRadius: V2Radius.list,
    backgroundColor: V2Colors.surface,
  },
  state: {
    minHeight: 112,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 18,
  },
  stateText: {
    fontFamily: V2Font.medium,
    fontSize: 13,
    color: V2Colors.textSecondary,
    textAlign: 'center',
  },
  retry: {
    fontFamily: V2Font.extraBold,
    fontSize: 13,
  },
  empty: {
    gap: 4,
    padding: 18,
  },
  emptyTitle: {
    fontFamily: V2Font.extraBold,
    fontSize: 14,
    color: V2Colors.text,
  },
  emptyText: {
    fontFamily: V2Font.medium,
    fontSize: 12.5,
    color: V2Colors.textTertiary,
  },
  totalBlock: {
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: V2Colors.divider,
  },
  totalLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  totalLabel: {
    fontFamily: V2Font.semiBold,
    fontSize: 12.5,
    color: V2Colors.textSecondary,
  },
  total: {
    fontFamily: V2Font.black,
    fontSize: 24,
    color: V2Colors.text,
    letterSpacing: -0.5,
  },
  unavailable: {
    fontFamily: V2Font.black,
    fontSize: 18,
    color: V2Colors.text,
  },
  totalHint: {
    fontFamily: V2Font.medium,
    fontSize: 11.5,
    color: V2Colors.textTertiary,
  },
  source: {
    fontFamily: V2Font.medium,
    fontSize: 10.5,
    color: V2Colors.textTertiary,
  },
  estimate: {
    fontFamily: V2Font.medium,
    fontSize: 11.5,
    color: V2Colors.textTertiary,
  },
  positionSource: {
    fontFamily: V2Font.medium,
    fontSize: 9.5,
    color: V2Colors.textTertiary,
  },
  staleChip: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: V2Radius.full,
    backgroundColor: 'rgba(255,194,75,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,194,75,0.22)',
  },
  staleText: {
    fontFamily: V2Font.bold,
    fontSize: 9.5,
    color: V2Colors.warning,
  },
  staleInline: {
    fontFamily: V2Font.bold,
    fontSize: 9.5,
    color: V2Colors.warning,
  },
  position: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: V2Colors.divider,
  },
  fallbackIcon: {
    width: 38,
    height: 38,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: V2Colors.chip,
  },
  fallbackIconText: {
    fontFamily: V2Font.black,
    fontSize: 16,
    color: V2Colors.textSecondary,
  },
  positionText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  vaultName: {
    fontFamily: V2Font.extraBold,
    fontSize: 14,
    color: V2Colors.text,
  },
  assetAmount: {
    fontFamily: V2Font.medium,
    fontSize: 12,
    color: V2Colors.textTertiary,
  },
  usdValue: {
    alignItems: 'flex-end',
    gap: 2,
  },
  usdText: {
    fontFamily: V2Font.black,
    fontSize: 14,
    color: V2Colors.text,
  },
  unpriced: {
    fontFamily: V2Font.semiBold,
    fontSize: 11.5,
    color: V2Colors.warning,
  },
  shares: {
    fontFamily: V2Font.medium,
    fontSize: 10.5,
    color: V2Colors.textTertiary,
  },
});
