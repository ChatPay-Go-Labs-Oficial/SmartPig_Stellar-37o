import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { V2Colors, V2Font, V2Radius } from '@/constants/theme-v2';
import { useAccent } from '@/hooks/use-accent';
import { useTerms } from '@/hooks/use-terms';
import { NavChip, V2Icon } from '@/components/v2';
import { formatWalletUsd } from '@/lib/utils/format';

interface WalletSummaryCardProps {
  /** Saldo da carteira em dólar; null enquanto não há número confiável. */
  amountUsd: number | null;
  /** Há moeda além do dólar no saldo: mostra com "≈", como a Carteira. */
  estimated: boolean;
  onPress: () => void;
}

/**
 * Atalho da carteira na Home (Figma "card da carteira"): só o saldo e o
 * caminho para a aba Carteira, onde ficam Depositar, Sacar e Presentear.
 * O cartão inteiro é o toque; a pílula é só a indicação.
 */
function WalletSummaryCardView({ amountUsd, estimated, onPress }: WalletSummaryCardProps) {
  const accent = useAccent();
  const { t } = useTerms();
  const value =
    amountUsd === null ? '—' : `${estimated ? '≈ ' : ''}${formatWalletUsd(amountUsd)}`;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${t('home.wallet.label')}: ${value}`}
      accessibilityHint={t('home.wallet.go')}
    >
      <View style={[styles.seal, { backgroundColor: accent.alpha(0.14) }]}>
        <V2Icon name="wallet" size={20} color={accent.base} />
      </View>

      <View style={styles.texts}>
        <Text style={styles.label} numberOfLines={1}>
          {t('home.wallet.label')}
        </Text>
        <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
          {value}
        </Text>
      </View>

      <NavChip label={t('home.wallet.go')} chevron />
    </Pressable>
  );
}

export const WalletSummaryCard = memo(WalletSummaryCardView);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: V2Radius.list,
    borderWidth: 1,
    borderColor: V2Colors.surfaceBorderStrong,
    backgroundColor: V2Colors.surface,
  },
  pressed: {
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  seal: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  label: {
    fontFamily: V2Font.semiBold,
    fontSize: 12.5,
    color: V2Colors.textSecondary,
  },
  value: {
    fontFamily: V2Font.black,
    fontSize: 20,
    color: V2Colors.text,
  },
});
