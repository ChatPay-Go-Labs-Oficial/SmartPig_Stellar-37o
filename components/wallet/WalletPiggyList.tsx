import { memo, useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { V2Colors, V2Font, V2PiggyTint, withAlpha } from '@/constants/theme-v2';
import { useAccent } from '@/hooks/use-accent';
import { useTerms } from '@/hooks/use-terms';
import { useVaultAccess } from '@/hooks/use-vault-access';
import { AssetIcon, ListCard, V2Icon, type AssetLogoId } from '@/components/v2';
import type { Vault } from '@/lib/api/vaults';
import type { PortfolioPosition, PortfolioSummary } from '@/lib/api/portfolio';
import type { TermKey } from '@/lib/copy/terms';
import { formatPositiveApy, formatUsdV2, formatVaultNameForMode, truncateDecimalString } from '@/lib/utils/format';
import { portfolioPositionUsdValue, positionUsesMarketPrice } from '@/lib/utils/portfolio';

const MASCOT = require('@/assets/images/v2/mascote-baby-pig.png');
const KNOWN_ASSETS: readonly AssetLogoId[] = ['USDC', 'EURC', 'XLM'];

function assetId(symbol: string): AssetLogoId | null {
  const upper = symbol.toUpperCase();
  return KNOWN_ASSETS.includes(upper as AssetLogoId) ? (upper as AssetLogoId) : null;
}

interface WalletPiggyListProps {
  vaults: Vault[] | undefined;
  summary: PortfolioSummary | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

/**
 * Aba "Porquinhos" / "Vaults" da Carteira (Figma: seletor da Carteira).
 *
 * Mostra os porquinhos com o que a pessoa tem em cada um, e uma nota de que
 * esse dinheiro fica fora do saldo da carteira: o card do topo continua sendo
 * só a carteira. O toque leva para a aba Guardar, já no porquinho tocado: é
 * lá que os porquinhos são operados.
 */
function WalletPiggyListView({ vaults, summary, isLoading, isError, onRetry }: WalletPiggyListProps) {
  const accent = useAccent();
  const { t, isPro, mode } = useTerms();
  const { canAccessVaultAsset } = useVaultAccess();

  const visible = useMemo(
    () => (vaults ?? []).filter((vault) => canAccessVaultAsset(vault.assetSymbol)),
    [vaults, canAccessVaultAsset],
  );
  const positionByVault = useMemo(() => {
    const map = new Map<string, PortfolioPosition>();
    for (const position of summary?.positions ?? []) map.set(position.vaultId, position);
    return map;
  }, [summary]);

  if ((!vaults || !summary) && isLoading) {
    return (
      <ListCard style={styles.state}>
        <ActivityIndicator color={accent.base} />
      </ListCard>
    );
  }

  if (!vaults && isError) {
    return (
      <ListCard style={styles.state}>
        <Text style={styles.stateText}>Não foi possível carregar os porquinhos.</Text>
        <Pressable onPress={onRetry} accessibilityRole="button" hitSlop={8}>
          <Text style={[styles.retry, { color: accent.base }]}>Tentar novamente</Text>
        </Pressable>
      </ListCard>
    );
  }

  return (
    <View>
      <ListCard>
        {visible.map((vault) => {
          const id = assetId(vault.assetSymbol);
          return (
            <PiggyRow
              key={vault.id}
              vault={vault}
              asset={id}
              tint={id && id !== 'USDC' ? V2PiggyTint[id] : accent.base}
              assetName={id ? t(`carteira.asset.${id}.name` as TermKey) : vault.assetSymbol}
              position={positionByVault.get(vault.id)}
              isPro={isPro}
              name={
                id ? t(`guardar.piggy.${id}.name` as TermKey) : formatVaultNameForMode(vault.name, mode)
              }
            />
          );
        })}
      </ListCard>
      {/* Sem total aqui de propósito: o card do topo é o saldo da carteira, e
          o total guardado mora na aba Guardar. A nota só evita a confusão. */}
      <View style={styles.note}>
        <V2Icon name="info" size={13} color={V2Colors.textTertiary} />
        <Text style={styles.noteText}>{t('carteira.piggies.note')}</Text>
      </View>
    </View>
  );
}

interface PiggyRowProps {
  vault: Vault;
  asset: AssetLogoId | null;
  /** Cor do porquinho (aura e borda). */
  tint: string;
  /** Nome da moeda no vocabulário do modo (Dólar / USDC). */
  assetName: string;
  position: PortfolioPosition | undefined;
  isPro: boolean;
  name: string;
}

const PiggyRow = memo(function PiggyRow({ vault, asset, tint, assetName, position, isPro, name }: PiggyRowProps) {
  const amount = position?.amountAsset ?? '0';
  const hasBalance = parseFloat(amount) > 0 && !!position;
  // Valor à direita: Pro mostra a quantidade exata do ativo; Lite, em dólar.
  let value = isPro ? '0.0000000' : '$0.00';
  if (hasBalance && position) {
    if (isPro) {
      value = truncateDecimalString(amount, 7);
    } else {
      const usd = portfolioPositionUsdValue(position);
      value = usd === null ? '—' : `${positionUsesMarketPrice(position) ? '≈ ' : ''}${formatUsdV2(usd)}`;
    }
  }

  // Rendimento como informação de apoio, não como destaque: só fica verde
  // quando há dinheiro rendendo.
  // Só taxa positiva (ver formatPositiveApy).
  const positiveApy = formatPositiveApy(vault.apy);
  const yieldText = positiveApy ? `${positiveApy} ao ano` : null;

  return (
    <Pressable
      // navigate, não push: troca de aba sem criar outra cópia (ver Home).
      onPress={() => router.navigate({ pathname: '/(tabs)/vaults', params: { vault: vault.id } })}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${assetName}, ${value}${yieldText ? `, rende ${yieldText}` : ''}`}
    >
      <View style={[styles.aura, { borderColor: withAlpha(tint, 0.4) }]}>
        <LinearGradient
          colors={[withAlpha(tint, 0.33), withAlpha(tint, 0.14), 'rgba(255,255,255,0.03)']}
          locations={[0, 0.5, 1]}
          style={[StyleSheet.absoluteFill, styles.auraFill]}
        />
        <Image source={MASCOT} style={[styles.mascot, !hasBalance && styles.mascotIdle]} contentFit="contain" />
        {asset && (
          <View style={styles.coin}>
            <AssetIcon asset={asset} size={18} />
          </View>
        )}
      </View>

      <View style={styles.texts}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        <View style={styles.detailRow}>
          <Text style={styles.caption} numberOfLines={2}>
            {assetName}
            {yieldText ? (
              <Text style={hasBalance ? styles.yieldActive : undefined}>{`  ·  ${yieldText}`}</Text>
            ) : null}
          </Text>
          <Text
            style={[styles.value, !hasBalance && styles.valueEmpty]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            {value}
          </Text>
        </View>
      </View>
    </Pressable>
  );
});

export const WalletPiggyList = memo(WalletPiggyListView);

const styles = StyleSheet.create({
  state: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 16,
  },
  stateText: {
    fontFamily: V2Font.medium,
    fontSize: 13,
    color: V2Colors.textSecondary,
  },
  retry: {
    fontFamily: V2Font.extraBold,
    fontSize: 13.5,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
    paddingTop: 12,
  },
  noteText: {
    flex: 1,
    fontFamily: V2Font.medium,
    fontSize: 12,
    color: V2Colors.textTertiary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  rowPressed: {
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  aura: {
    width: 48,
    height: 48,
    borderRadius: 15,
    borderWidth: 1,
    overflow: 'visible',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // A aura não recorta (o selo da moeda sai pela borda); o degradê segue o raio.
  auraFill: {
    borderRadius: 14,
  },
  mascot: {
    width: 40,
    height: 40,
  },
  mascotIdle: {
    opacity: 0.55,
  },
  coin: {
    position: 'absolute',
    right: -5,
    bottom: -5,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: V2Colors.sheetBase,
  },
  texts: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontFamily: V2Font.extraBold,
    fontSize: 14,
    color: V2Colors.text,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  caption: {
    flex: 1,
    fontFamily: V2Font.medium,
    fontSize: 12.5,
    color: V2Colors.textTertiary,
  },
  yieldActive: {
    color: V2Colors.success,
  },
  value: {
    flexShrink: 1,
    maxWidth: '55%',
    textAlign: 'right',
    fontFamily: V2Font.black,
    fontSize: 14,
    color: V2Colors.text,
  },
  valueEmpty: {
    color: V2Colors.textTertiary,
    fontFamily: V2Font.bold,
  },
});
