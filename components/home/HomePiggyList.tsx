import { memo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { V2Colors, V2Font, V2PiggyTint, withAlpha } from '@/constants/theme-v2';
import { useAccent } from '@/hooks/use-accent';
import { useTerms } from '@/hooks/use-terms';
import { ListCard, NavChip, RADIAL_MASK, V2Icon } from '@/components/v2';
import type { TermKey } from '@/lib/copy/terms';
import { formatPositiveApy, formatVaultNameForMode } from '@/lib/utils/format';
import { formatPiggyAmount, splitAmount, type Piggy } from '@/lib/utils/piggy';

const MASCOT = require('@/assets/images/v2/mascote-baby-pig.png');

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

  // Lite mostra a quantidade com o símbolo da moeda ("$250.0482137",
  // "€40.0000000"); Pro, a quantidade e o código do ativo.
  let detail: string;
  if (!piggy.balanceKnown) detail = '—';
  else if (!piggy.hasBalance) detail = t('home.piggy.empty');
  else if (isPro) {
    const { integer, fraction } = splitAmount(piggy.amount);
    detail = `${integer}${fraction} ${piggy.vault.assetSymbol}`;
  } else detail = formatPiggyAmount(piggy);

  const apy = formatPositiveApy(piggy.vault.apy);

  return (
    <Pressable
      onPress={() => onPress(piggy.vault.id)}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${detail}${apy ? `, rende ${apy} ao ano` : ''}`}
    >
      <View style={[styles.aura, { borderColor: withAlpha(tint, 0.4) }]}>
        <Image source={RADIAL_MASK} tintColor={tint} contentFit="fill" style={styles.auraGlow} />
        <Image source={MASCOT} contentFit="contain" style={styles.mascot} />
      </View>

      <View style={styles.texts}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.detail} numberOfLines={1}>
          {detail}
        </Text>
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
  detail: {
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
