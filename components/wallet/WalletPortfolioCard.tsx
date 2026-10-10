import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { AssetIcon, type AssetLogoId } from '@/components/v2';
import { V2Colors, V2Font, V2Radius } from '@/constants/theme-v2';
import { useAccent } from '@/hooks/use-accent';
import { useTerms } from '@/hooks/use-terms';
import type { PortfolioSummary } from '@/lib/api/portfolio';
import { formatUsdV2, truncateDecimalString } from '@/lib/utils/format';

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

export function WalletPortfolioCard({
  summary,
  isLoading,
  isError,
  onRetry,
}: WalletPortfolioCardProps) {
  const accent = useAccent();
  const { isPro } = useTerms();

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

  if (!summary || summary.positions.length === 0) {
    return (
      <View style={[styles.card, styles.empty]}>
        <Text style={styles.emptyTitle}>Nenhum valor investido</Text>
        <Text style={styles.emptyText}>Seus investimentos aparecerão aqui.</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.totalBlock}>
        <View style={styles.totalLabelRow}>
          <Text style={styles.totalLabel}>{isPro ? 'Total nos vaults' : 'Total guardado'}</Text>
          {summary.stale && (
            <View style={styles.staleChip}>
              <Text style={styles.staleText}>pode estar desatualizado</Text>
            </View>
          )}
        </View>

        {summary.totalUsd === null ? (
          <>
            <Text style={styles.unavailable}>Total indisponível</Text>
            <Text style={styles.totalHint}>Confira os valores por moeda abaixo.</Text>
          </>
        ) : (
          <Text style={styles.total}>{formatUsdV2(summary.totalUsd)}</Text>
        )}

        {isPro && summary.priceSource && (
          <Text style={styles.source}>Preço: {summary.priceSource}</Text>
        )}
      </View>

      {summary.positions.map((position) => {
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
              <Text style={styles.assetAmount} numberOfLines={1}>
                {truncateDecimalString(position.amountAsset, isPro ? 7 : 2)} {symbol}
              </Text>
            </View>

            <View style={styles.usdValue}>
              {position.amountUsd !== null ? (
                <Text style={styles.usdText}>{formatUsdV2(position.amountUsd)}</Text>
              ) : (
                <Text style={styles.unpriced}>sem cotação</Text>
              )}
              {isPro && <Text style={styles.shares}>{truncateDecimalString(position.shares, 7)} cotas</Text>}
            </View>
          </View>
        );
      })}
    </View>
  );
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
