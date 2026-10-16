import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';
import { V2Colors, V2Font } from '@/constants/theme-v2';
import { amountTier, splitAmount } from '@/lib/utils/piggy';

// Figma 10a/10k/10l: o inteiro em destaque e as 7 casas menores e em cinza,
// na mesma linha de base. O inteiro reduz conforme cresce, para o valor nunca
// quebrar linha (anotação do 10l: total 48/42/36/30, cartão 28/24/20).
const SIZES = {
  total: [
    { integer: 48, fraction: 22 },
    { integer: 42, fraction: 20 },
    { integer: 36, fraction: 18 },
    { integer: 30, fraction: 16 },
  ],
  card: [
    { integer: 28, fraction: 16 },
    { integer: 28, fraction: 16 },
    { integer: 24, fraction: 14 },
    { integer: 20, fraction: 12 },
  ],
  // Resumo da tela Detalhes (Figma 12a / 12d).
  details: [
    { integer: 30, fraction: 17 },
    { integer: 30, fraction: 17 },
    { integer: 26, fraction: 15 },
    { integer: 22, fraction: 13 },
  ],
} as const;

// Tracking do inteiro: −3% no total, −2% no cartão e nos detalhes (Figma).
const TRACKING = { total: -0.03, card: -0.02, details: -0.02 } as const;

export type AmountSize = keyof typeof SIZES;

interface PiggyAmountProps {
  /** Quantidade em unidades inteiras do ativo ("250.0482137"). */
  amount: string;
  prefix?: string;
  /** Unidade depois das casas (" XLM"), no estilo das casas. */
  suffix?: string;
  /** Código do ativo em letra menor no fim ("  USDC", Pro nos Detalhes). */
  unit?: string;
  size: AmountSize;
  style?: StyleProp<TextStyle>;
}

/** Quantidade com 7 casas: "$250" + ".0482137". */
export function PiggyAmount({ amount, prefix = '', suffix = '', unit, size, style }: PiggyAmountProps) {
  const { integer, fraction } = splitAmount(amount, prefix);
  const tier = SIZES[size][amountTier(integer)];

  return (
    <Text
      style={[styles.line, style]}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.6}
      accessibilityLabel={`${integer}${fraction}${suffix}${unit ? ` ${unit}` : ''}`}
    >
      <Text
        style={[
          styles.integer,
          { fontSize: tier.integer, letterSpacing: tier.integer * TRACKING[size] },
        ]}
      >
        {integer}
      </Text>
      <Text style={[styles.fraction, { fontSize: tier.fraction }]}>
        {fraction}
        {suffix}
      </Text>
      {unit ? <Text style={styles.unit}>{`  ${unit}`}</Text> : null}
    </Text>
  );
}

/** Tamanho do inteiro para um valor de uma linha só ("≈ $296.55", "—"). */
export function amountFontSize(integer: string, size: AmountSize): number {
  return SIZES[size][amountTier(integer)].integer;
}

const styles = StyleSheet.create({
  line: {
    color: V2Colors.onPrimary,
  },
  integer: {
    fontFamily: V2Font.black,
    color: V2Colors.onPrimary,
  },
  fraction: {
    fontFamily: V2Font.bold,
    color: V2Colors.textSecondary,
  },
  unit: {
    fontFamily: V2Font.bold,
    fontSize: 13,
    color: V2Colors.textSecondary,
  },
});
