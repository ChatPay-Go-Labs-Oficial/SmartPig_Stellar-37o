import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { V2Colors, V2Font } from '@/constants/theme-v2';
import { useTerms } from '@/hooks/use-terms';
import { AssetIcon } from '@/components/v2';
import type { WalletAssetBalance } from '@/lib/stellar/balances';
import type { TermKey } from '@/lib/copy/terms';
import { formatWalletDecimal, formatWalletUsd, truncateDecimalString } from '@/lib/utils/format';

interface WalletAssetRowProps {
  asset: WalletAssetBalance;
  /** Preço em USDC; `null`/`undefined` quando não há cotação. */
  usdPrice: number | null | undefined;
}

/** Linha de ativo da Carteira (Figma "moeda USDC/EURC/XLM"). */
function WalletAssetRowView({ asset, usdPrice }: WalletAssetRowProps) {
  const { t, isPro } = useTerms();
  const amount = parseFloat(asset.balance);
  const usdValue = usdPrice != null && Number.isFinite(amount) ? amount * usdPrice : null;
  const isDollar = asset.id === 'USDC';
  const amountPro = asset.id === 'XLM'
    ? truncateDecimalString(asset.balance, 7)
    : formatWalletDecimal(asset.balance);

  const name = t(`carteira.asset.${asset.id}.name` as TermKey);
  const caption =
    !isPro && isDollar && amount === 0
      ? 'Sem saldo'
      : t(`carteira.asset.${asset.id}.caption` as TermKey);

  return (
    <View style={styles.row} accessible accessibilityLabel={`${name}, ${caption}`}>
      <AssetIcon asset={asset.id} />

      <View style={styles.texts}>
        <Text style={styles.name} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
          {name}
        </Text>
        <Text style={styles.caption} numberOfLines={1}>{caption}</Text>
      </View>

      {isPro ? (
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
