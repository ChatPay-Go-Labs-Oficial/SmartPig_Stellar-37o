import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { V2Colors, V2Font } from '@/constants/theme-v2';
import { useLessonLockCopy } from '@/hooks/use-lesson-lock-copy';
import { useTerms } from '@/hooks/use-terms';
import { AssetIcon, V2Icon } from '@/components/v2';
import type { WalletAssetBalance } from '@/lib/stellar/balances';
import type { TermKey } from '@/lib/copy/terms';
import { formatWalletDecimal, formatWalletUsd, truncateDecimalString } from '@/lib/utils/format';
import type { LessonLock } from '@/lib/utils/vault-access';

interface WalletAssetRowProps {
  asset: WalletAssetBalance;
  /** Preço em USDC; `null`/`undefined` quando não há cotação. */
  usdPrice: number | null | undefined;
  /** O porquinho desta moeda pede lições da trilha (Lite, Figma 17a). */
  lock?: LessonLock | null;
}

/**
 * Linha de ativo da Carteira (Figma "moeda USDC/EURC/XLM").
 *
 * Com o porquinho da moeda bloqueado pela trilha (17a), o ícone apaga com o
 * cadeado e a legenda diz o que falta. Sem saldo, "Lição N" vai à direita;
 * com saldo, o valor continua à mostra (a moeda é da pessoa).
 */
function WalletAssetRowView({ asset, usdPrice, lock }: WalletAssetRowProps) {
  const { t, isPro } = useTerms();
  const lockCopy = useLessonLockCopy();
  const amount = parseFloat(asset.balance);
  const usdValue = usdPrice != null && Number.isFinite(amount) ? amount * usdPrice : null;
  const isDollar = asset.id === 'USDC';
  const amountPro = asset.id === 'XLM'
    ? truncateDecimalString(asset.balance, 7)
    : formatWalletDecimal(asset.balance);

  const name = t(`carteira.asset.${asset.id}.name` as TermKey);
  const caption = lock
    ? lockCopy.caption(lock)
    : !isPro && isDollar && amount === 0
      ? 'Sem saldo'
      : t(`carteira.asset.${asset.id}.caption` as TermKey);
  const lockPill = lock && !(amount > 0) ? lockCopy.pill(lock) : null;

  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`${name}, ${caption}${lockPill ? `, ${lockPill}` : ''}`}
    >
      <View>
        <View style={lock && styles.iconLocked}>
          <AssetIcon asset={asset.id} />
        </View>
        {lock && (
          <View style={styles.lock}>
            <V2Icon name="lock" size={10} color={V2Colors.onPrimary} />
          </View>
        )}
      </View>

      <View style={styles.texts}>
        <Text
          style={[styles.name, lock && styles.nameLocked]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {name}
        </Text>
        <Text style={styles.caption} numberOfLines={1}>{caption}</Text>
      </View>

      {lockPill ? (
        <View style={styles.lockPill}>
          <Text style={styles.lockPillText}>{lockPill}</Text>
        </View>
      ) : isPro ? (
        <View style={styles.values}>
          <Text style={styles.amountPro} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            {amountPro}
          </Text>
          {!isDollar && usdValue != null && <Text style={styles.estimate} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>≈ {formatWalletUsd(usdValue)}</Text>}
        </View>
      ) : (
        // Lite fala em dólar: o USDC é o próprio valor; os outros só aparecem
        // quando há cotação (sem ela, um número solto não diz nada).
        <View style={styles.values}>
          {isDollar ? (
            <Text style={styles.amountLite} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{formatWalletUsd(asset.balance)}</Text>
          ) : usdValue != null ? (
            <Text style={styles.amountLite} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>≈ {formatWalletUsd(usdValue)}</Text>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  texts: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontFamily: V2Font.extraBold,
    fontSize: 15,
    color: V2Colors.text,
  },
  caption: {
    fontFamily: V2Font.medium,
    fontSize: 12.5,
    color: V2Colors.textTertiary,
  },
  // Figma 17a: ícone a 40% com o cadeado de 18 no canto; nome a 60%.
  iconLocked: {
    opacity: 0.4,
  },
  lock: {
    position: 'absolute',
    left: 24,
    top: 24,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: V2Colors.sheetTop,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameLocked: {
    color: 'rgba(255,255,255,0.6)',
  },
  // Figma 17a "selo": "Lição 3".
  lockPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: V2Colors.chip,
  },
  lockPillText: {
    fontFamily: V2Font.extraBold,
    fontSize: 12,
    color: V2Colors.textSecondary,
  },
  // O valor não espreme o nome: no máximo pouco mais da metade da linha.
  values: {
    flexShrink: 1,
    maxWidth: '55%',
    alignItems: 'flex-end',
    gap: 2,
  },
  amountPro: {
    fontFamily: V2Font.black,
    fontSize: 14,
    color: V2Colors.text,
  },
  amountLite: {
    fontFamily: V2Font.black,
    fontSize: 15.5,
    color: V2Colors.text,
  },
  estimate: {
    fontFamily: V2Font.medium,
    fontSize: 12,
    color: V2Colors.textTertiary,
  },
});

/** Memoizado: a tela re-renderiza ao abrir modais; a linha só muda com os dados. */
export const WalletAssetRow = memo(WalletAssetRowView);
