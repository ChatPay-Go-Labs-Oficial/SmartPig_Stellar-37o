import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { V2Colors, V2Font, V2Layout, V2Radius } from '@/constants/theme-v2';
import { useAccent } from '@/hooks/use-accent';
import { useTerms } from '@/hooks/use-terms';
import { V2Icon } from '@/components/v2';
import { formatUsdV2 } from '@/lib/utils/format';
import type { GuardarTotal } from '@/lib/utils/piggy';
import { PiggyAmount, amountFontSize } from './PiggyAmount';

/** Margem lateral do painel (Figma: 22, um pouco maior que o gutter). */
export const HEADER_GUTTER = 22;

interface GuardarHeaderProps {
  /** Respiro até o título, igual ao das outras abas V2 (useScreenInsets). */
  topGap: number;
  /** null enquanto carrega ou quando a tela está em erro: mostra "—". */
  total: GuardarTotal | null;
  /** Rendimento do porquinho de dólar ("7,1%"), na legenda do total exato. */
  apy: string | null;
  /** "Dólar e euro · cotação das 14:32", na legenda do total estimado. */
  quote: string | null;
  onPressBreakdown: () => void;
}

/**
 * Painel do topo da aba Guardar (Figma 10a / 10d / 10i): título e total
 * guardado. Rola junto com a tela.
 */
function GuardarHeaderView({ topGap, total, apy, quote, onPressBreakdown }: GuardarHeaderProps) {
  const accent = useAccent();
  const { t, p } = useTerms();
  const estimated = total?.kind === 'estimated';

  return (
    <View style={[styles.panel, { paddingTop: topGap }]}>
      <View style={styles.titleRow}>
        <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
          {t('guardar.title')}
        </Text>
      </View>

      <View style={styles.total}>
        <View style={styles.labelRow}>
          <Text style={styles.label} numberOfLines={1}>
            {t(estimated ? 'guardar.total.estimated' : 'guardar.total.label')}
          </Text>
          {estimated && (
            <View style={styles.estimateChip}>
              <V2Icon name="info" size={11} color={V2Colors.text} />
              <Text style={styles.estimateText}>estimativa</Text>
            </View>
          )}
        </View>

        <TotalValue total={total} />

        {total?.kind === 'exact' && apy && (
          <View style={styles.caption}>
            <View style={styles.dot} />
            <Text style={styles.rate}>{p('guardar.rate', { apy })}</Text>
          </View>
        )}

        {estimated && (
          <Pressable
            onPress={onPressBreakdown}
            style={({ pressed }) => [styles.caption, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`${quote ?? ''}. ${t('guardar.total.byPiggy')}`}
            hitSlop={8}
          >
            {quote && (
              <Text style={styles.quote} numberOfLines={1}>
                {quote}
              </Text>
            )}
            <Text style={[styles.breakdown, { color: accent.base }]} numberOfLines={1}>
              {t('guardar.total.byPiggy')}
            </Text>
            <V2Icon name="chevron-right" size={14} color={accent.base} />
          </Pressable>
        )}

        {total?.kind === 'unknown' && (
          <Text style={styles.quote}>{t('guardar.total.partial')}</Text>
        )}
      </View>
    </View>
  );
}

// O total não anda com o rendimento: o efeito fica só dentro de cada porquinho.
function TotalValue({ total }: { total: GuardarTotal | null }) {
  if (total?.kind === 'exact') {
    return <PiggyAmount amount={total.amount} prefix="$" size="total" />;
  }

  // Estimado: um trecho só, 2 casas, com "≈" (Figma 10d). Sem número: "—".
  const text = total?.kind === 'estimated' ? `≈ ${formatUsdV2(total.usd)}` : '—';
  const fontSize = amountFontSize(text.replace(/^≈ /, '').split('.')[0], 'total');
  return (
    <Text
      style={[
        styles.single,
        { fontSize, letterSpacing: fontSize * -0.03 },
        total?.kind !== 'estimated' && styles.singleEmpty,
      ]}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.6}
    >
      {text}
    </Text>
  );
}

export const GuardarHeader = memo(GuardarHeaderView);

const styles = StyleSheet.create({
  panel: {
    paddingHorizontal: HEADER_GUTTER,
    paddingBottom: 22,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderBottomWidth: 1,
    borderColor: V2Colors.surfaceBorder,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  titleRow: {
    minHeight: V2Layout.headerHeight,
    justifyContent: 'center',
  },
  title: {
    fontFamily: V2Font.black,
    fontSize: 28,
    letterSpacing: -0.84,
    color: V2Colors.onPrimary,
  },
  total: {
    paddingTop: 18,
    gap: 6,
    alignItems: 'flex-start',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    flexShrink: 1,
    fontFamily: V2Font.semiBold,
    fontSize: 13.5,
    color: V2Colors.textSecondary,
  },
  estimateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: V2Radius.full,
    borderWidth: 1,
    borderColor: V2Colors.chipBorder,
    backgroundColor: V2Colors.chip,
  },
  estimateText: {
    fontFamily: V2Font.bold,
    fontSize: 10.5,
    color: V2Colors.textSecondary,
  },
  single: {
    fontFamily: V2Font.black,
    color: V2Colors.onPrimary,
  },
  singleEmpty: {
    color: V2Colors.textTertiary,
  },
  caption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 4,
    maxWidth: '100%',
  },
  pressed: {
    opacity: 0.7,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: V2Colors.success,
  },
  rate: {
    fontFamily: V2Font.semiBold,
    fontSize: 13,
    color: V2Colors.success,
  },
  quote: {
    flexShrink: 1,
    fontFamily: V2Font.medium,
    fontSize: 12.5,
    color: V2Colors.textSecondary,
  },
  breakdown: {
    flexShrink: 0,
    fontFamily: V2Font.extraBold,
    fontSize: 12.5,
  },
});
