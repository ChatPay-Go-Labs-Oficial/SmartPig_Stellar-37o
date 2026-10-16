import { StyleSheet, Text, View } from 'react-native';
import { V2Colors, V2Font } from '@/constants/theme-v2';
import { useTerms } from '@/hooks/use-terms';
import { AssetIcon, Button3D, ListCard, V2Icon, V2Sheet } from '@/components/v2';
import type { TermKey } from '@/lib/copy/terms';
import { formatUsdV2, formatVaultNameForMode } from '@/lib/utils/format';
import { formatPiggyAmount, type GuardarTotal, type Piggy } from '@/lib/utils/piggy';

const LIST_RADIUS = 20;
const LIST_DIVIDER = 'rgba(255,255,255,0.06)';

interface TotalEstimateSheetProps {
  visible: boolean;
  onClose: () => void;
  piggies: readonly Piggy[];
  total: Extract<GuardarTotal, { kind: 'estimated' }> | null;
  /** Hora da cotação ("14:32"); null quando o preço é de referência. */
  quoteTime: string | null;
}

/** Detalhamento do total estimado, por porquinho (Figma 10e). */
export function TotalEstimateSheet({ visible, onClose, piggies, total, quoteTime }: TotalEstimateSheetProps) {
  const { t, p, mode } = useTerms();

  // "cotação do euro" / "da criptomoeda" / "do euro e da criptomoeda"
  const quoted = (total?.assets ?? []).filter((asset) => asset !== 'USDC');
  const quoteOf = quoted.map((asset) => t(`guardar.quoteOf.${asset}` as TermKey)).join(' e ');

  return (
    <V2Sheet
      visible={visible}
      onClose={onClose}
      title={t('guardar.total.estimated')}
      subtitle={t('guardar.totalSheet.subtitle')}
      icon="info"
    >
      <View style={styles.body}>
        <ListCard style={styles.list} dividerColor={LIST_DIVIDER}>
          {piggies.map((piggy) => {
            const { asset, vault } = piggy;
            const name = asset
              ? t(`guardar.piggy.${asset}.name` as TermKey)
              : formatVaultNameForMode(vault.name, mode);

            // Dólar: a quantidade exata é o próprio valor. Demais: quantidade
            // no ativo embaixo e o equivalente em dólar à direita.
            let caption = t('guardar.totalSheet.empty');
            let value = '—';
            if (piggy.hasBalance) {
              if (asset === 'USDC') {
                caption = t('carteira.asset.USDC.name');
                value = formatPiggyAmount(piggy);
              } else {
                caption = formatPiggyAmount(piggy);
                value = piggy.usd === null ? '—' : `≈ ${formatUsdV2(piggy.usd)}`;
              }
            }

            return (
              <View
                key={vault.id}
                style={styles.row}
                accessible
                accessibilityLabel={`${name}, ${caption}, ${value === '—' ? 'sem valor' : value}`}
              >
                {asset && <AssetIcon asset={asset} size={22} round />}
                <View style={styles.texts}>
                  <Text style={styles.name} numberOfLines={1}>{name}</Text>
                  <Text style={styles.caption} numberOfLines={1}>{caption}</Text>
                </View>
                <Text style={styles.value} numberOfLines={1}>{value}</Text>
              </View>
            );
          })}

          {total && (
            <View
              style={styles.row}
              accessible
              accessibilityLabel={`${t('guardar.total.estimated')}, ≈ ${formatUsdV2(total.usd)}`}
            >
              <View style={styles.texts}>
                <Text style={styles.name}>{t('guardar.total.estimated')}</Text>
                <Text style={styles.caption}>{t('guardar.totalSheet.totalCaption')}</Text>
              </View>
              <Text style={[styles.value, styles.totalValue]} numberOfLines={1}>
                ≈ {formatUsdV2(total.usd)}
              </Text>
            </View>
          )}
        </ListCard>

        {quoteOf ? (
          <View style={styles.note}>
            <V2Icon name="info" size={14} color={V2Colors.text} style={styles.noteIcon} />
            <Text style={styles.noteText}>
              {quoteTime
                ? p('guardar.totalSheet.note', { quoteOf, time: quoteTime })
                : p('guardar.totalSheet.noteReference', { quoteOf })}
            </Text>
          </View>
        ) : null}

        <Button3D label="Fechar" variant="glass" onPress={onClose} />
      </View>
    </V2Sheet>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: 14,
  },
  list: {
    borderRadius: LIST_RADIUS,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  texts: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontFamily: V2Font.extraBold,
    fontSize: 14,
    color: V2Colors.onPrimary,
  },
  caption: {
    fontFamily: V2Font.medium,
    fontSize: 12,
    color: V2Colors.textTertiary,
  },
  value: {
    flexShrink: 0,
    maxWidth: '55%',
    fontFamily: V2Font.extraBold,
    fontSize: 15,
    color: V2Colors.onPrimary,
  },
  totalValue: {
    fontFamily: V2Font.black,
    fontSize: 17,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: V2Colors.surfaceBorder,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  // Alinha o ícone à primeira linha do texto (altura de linha 18).
  noteIcon: {
    marginTop: 2,
  },
  noteText: {
    flex: 1,
    fontFamily: V2Font.medium,
    fontSize: 12.5,
    lineHeight: 12.5 * 1.45,
    color: V2Colors.textSecondary,
  },
});
