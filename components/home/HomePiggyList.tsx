import { memo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { V2Colors, V2Font, V2PiggyTint, V2Radius, withAlpha } from '@/constants/theme-v2';
import { useAccent } from '@/hooks/use-accent';
import { useTerms } from '@/hooks/use-terms';
import { AssetIcon, ListCard, NavChip, RADIAL_MASK, V2Icon } from '@/components/v2';
import type { TermKey } from '@/lib/copy/terms';
import { formatPositiveApy, formatVaultNameForMode } from '@/lib/utils/format';
import { formatPiggyAmount, splitAmount, type Piggy } from '@/lib/utils/piggy';

const MASCOT = require('@/assets/images/v2/mascote-baby-pig.png');
/** Selo da moeda no canto do quadro do mascote: logo de 16 com anel de 2. */
const COIN_SIZE = 16;
const COIN_RING = 2;

interface HomePiggyListProps {
  /** null enquanto vaults e portfólio não chegaram. */
  piggies: Piggy[] | null;
  isError: boolean;
  onRetry: () => void;
  onSeeAll: () => void;
  onOpenPiggy: (vaultId: string) => void;
}

/**
 * "Meus porquinhos" da Home (Figma "meus porquinhos"): um porquinho por
 * linha, com o que a pessoa tem nele e o rendimento. Os mesmos porquinhos da
 * aba Guardar (buildPiggies); o toque leva para lá, já no porquinho tocado.
 */
function HomePiggyListView({ piggies, isError, onRetry, onSeeAll, onOpenPiggy }: HomePiggyListProps) {
  const accent = useAccent();
  const { t } = useTerms();

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('home.piggies.title')}</Text>
        <NavChip label={t('home.piggies.seeAll')} chevron onPress={onSeeAll} />
      </View>

      {piggies ? (
        <ListCard style={styles.list}>
          {piggies.map((piggy) => (
            <PiggyRow
              key={piggy.vault.id}
              piggy={piggy}
              tint={piggy.asset && piggy.asset !== 'USDC' ? V2PiggyTint[piggy.asset] : accent.base}
              onPress={onOpenPiggy}
            />
          ))}
        </ListCard>
      ) : (
        <ListCard style={[styles.list, styles.state]}>
          {isError ? (
            <>
              <Text style={styles.stateText}>Não foi possível carregar os porquinhos.</Text>
              <Pressable onPress={onRetry} hitSlop={8} accessibilityRole="button">
                <Text style={[styles.retry, { color: accent.base }]}>Tentar novamente</Text>
              </Pressable>
            </>
          ) : (
            <ActivityIndicator color={accent.base} />
          )}
        </ListCard>
      )}
    </View>
  );
}

interface PiggyRowProps {
  piggy: Piggy;
  /** Cor do porquinho: dólar na cor do app, euro azul, cripto dourado. */
  tint: string;
  onPress: (vaultId: string) => void;
}

const PiggyRow = memo(function PiggyRow({ piggy, tint, onPress }: PiggyRowProps) {
  const { t, isPro, mode } = useTerms();
  const name = piggy.asset
    ? t(`guardar.piggy.${piggy.asset}.name` as TermKey)
    : formatVaultNameForMode(piggy.vault.name, mode);
  // A moeda, como na pílula da Guardar: código no Pro (USDC, EURC, XLM),
  // nome no Lite (Dólar, Euro, Criptomoeda).
  const coin = piggy.asset ? t(`carteira.asset.${piggy.asset}.name` as TermKey) : piggy.vault.assetSymbol;

  // Lite mostra a quantidade com o símbolo da moeda ("$250.0482137",
  // "€40.0000000"); Pro, só a quantidade — o código já está na etiqueta.
  let detail: string;
  if (!piggy.balanceKnown) detail = '—';
  else if (!piggy.hasBalance) detail = t('home.piggy.empty');
  else if (isPro) {
    const { integer, fraction } = splitAmount(piggy.amount);
    detail = `${integer}${fraction}`;
  } else detail = formatPiggyAmount(piggy);

  const apy = formatPositiveApy(piggy.vault.apy);

  return (
    <Pressable
      onPress={() => onPress(piggy.vault.id)}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${coin}, ${detail}${apy ? `, rende ${apy} ao ano` : ''}`}
    >
      <View>
        <View style={[styles.aura, { borderColor: withAlpha(tint, 0.4) }]}>
          <Image source={RADIAL_MASK} tintColor={tint} contentFit="fill" style={styles.auraGlow} />
          <Image source={MASCOT} contentFit="contain" style={styles.mascot} />
        </View>
        {/* Selo da moeda do porquinho, como na pílula da Guardar. Fora do
            quadro, que corta o que vaza. O anel repete o fundo do cartão
            (fundo da tela + superfície) para destacar o selo do quadro. */}
        {piggy.asset && (
          <View style={styles.coinBadge}>
            <View style={styles.coinRing}>
              <AssetIcon asset={piggy.asset} size={COIN_SIZE} round />
            </View>
          </View>
        )}
      </View>

      <View style={styles.texts}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        {/* A moeda abre a linha de baixo: ao lado do nome, dividia a linha
            com o selo de rendimento e cortava os nomes. */}
        <View style={styles.detailRow}>
          {coin ? (
            <View style={styles.coinTag}>
              <Text style={styles.coinTagText} numberOfLines={1}>
                {coin}
              </Text>
            </View>
          ) : null}
          <Text style={styles.detail} numberOfLines={1}>
            {detail}
          </Text>
        </View>
      </View>

      {apy && (
        <View style={styles.yield}>
          <V2Icon name="trending" size={12} color={V2Colors.success} />
          <Text style={styles.yieldText}>{apy}</Text>
        </View>
      )}
    </Pressable>
  );
});

export const HomePiggyList = memo(HomePiggyListView);

const styles = StyleSheet.create({
  section: {
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: V2Font.black,
    fontSize: 18,
    letterSpacing: -0.36,
    color: V2Colors.text,
  },
  list: {
    borderColor: V2Colors.surfaceBorderStrong,
  },
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  rowPressed: {
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  aura: {
    width: 58,
    height: 58,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  // Figma: radial da cor do porquinho (33% no centro), centro um pouco acima
  // do meio, raio ~42 px.
  auraGlow: {
    position: 'absolute',
    left: 29 - 42,
    top: 23 - 42,
    width: 84,
    height: 84,
    opacity: 0.33,
  },
  mascot: {
    width: 50,
    height: 50,
  },
  coinBadge: {
    position: 'absolute',
    right: -5,
    bottom: -5,
    borderRadius: COIN_SIZE / 2 + COIN_RING,
    backgroundColor: V2Colors.background,
  },
  coinRing: {
    padding: COIN_RING,
    borderRadius: COIN_SIZE / 2 + COIN_RING,
    backgroundColor: V2Colors.surface,
  },
  texts: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  name: {
    fontFamily: V2Font.extraBold,
    fontSize: 15.5,
    color: V2Colors.text,
  },
  // Etiqueta da moeda: a pílula da Guardar em tamanho de linha de lista.
  coinTag: {
    flexShrink: 0,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: V2Radius.full,
    borderWidth: 1,
    borderColor: V2Colors.chipBorder,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  coinTagText: {
    fontFamily: V2Font.extraBold,
    fontSize: 10.5,
    color: V2Colors.textSecondary,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detail: {
    flexShrink: 1,
    fontFamily: V2Font.medium,
    fontSize: 13,
    color: V2Colors.textTertiary,
  },
  yield: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(61,224,138,0.3)',
    backgroundColor: 'rgba(61,224,138,0.14)',
  },
  yieldText: {
    fontFamily: V2Font.extraBold,
    fontSize: 12,
    color: V2Colors.success,
  },
});
