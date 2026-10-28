import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { V2Colors, V2Font, V2PiggyTint } from '@/constants/theme-v2';
import { useAccent, type Accent } from '@/hooks/use-accent';
import { AssetIcon, type AssetLogoId } from '../../AssetIcon';
import { V2Icon, type V2IconName } from '../../V2Icon';

// Peças dos visuais das lições (Figma, D1): selo, etiqueta, cartão, divisor,
// linha de condição e o valor reservado. Os padrões (patterns.tsx) são feitos
// só com elas.

const BABY_PIG = require('@/assets/images/v2/mascote-baby-pig.png');

/** Neutro (vidro), destaque (cor do app) e ouro (criptomoeda, ouro). */
export type Tone = 'neutral' | 'accent' | 'gold';

/** O que vai no selo: ícone, moeda ou o mascote (L2-T06). */
export type Mark = { icon: V2IconName } | { asset: AssetLogoId } | { mascot: true };

export const GOLD = V2PiggyTint.XLM;

export function toneColors(tone: Tone, accent: Accent) {
  switch (tone) {
    case 'accent':
      return { fill: accent.alpha(0.14), border: accent.alpha(0.32), ink: accent.light };
    case 'gold':
      return { fill: 'rgba(255,194,75,0.14)', border: 'rgba(255,194,75,0.32)', ink: GOLD };
    default:
      return { fill: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.1)', ink: V2Colors.onPrimary };
  }
}

/** Medidas de cada selo do Figma: raio, ícone e moeda. */
const SEALS = {
  44: { radius: 14, icon: 22, asset: 26 },
  40: { radius: 12, icon: 20, asset: 24 },
  36: { radius: 10, icon: 18, asset: 22 },
  32: { radius: 10, icon: 16, asset: 20 },
} as const;

/**
 * Selo (Figma "selo"): quadrado arredondado com o ícone na cor do tom. O Pix
 * é a marca preenchida e fica sempre branca.
 */
export function Seal({ mark, tone = 'neutral', size = 44 }: { mark: Mark; tone?: Tone; size?: keyof typeof SEALS }) {
  const accent = useAccent();
  const colors = toneColors(tone, accent);
  const metrics = SEALS[size];
  return (
    <View
      style={[
        styles.seal,
        {
          width: size,
          height: size,
          borderRadius: metrics.radius,
          backgroundColor: colors.fill,
          borderColor: colors.border,
        },
      ]}
    >
      {'icon' in mark ? (
        <V2Icon
          name={mark.icon}
          size={metrics.icon}
          color={mark.icon === 'pix' ? V2Colors.onPrimary : colors.ink}
        />
      ) : 'asset' in mark ? (
        <AssetIcon asset={mark.asset} size={metrics.asset} round />
      ) : (
        <Image source={BABY_PIG} style={{ width: size - 4, height: size - 4 }} contentFit="contain" />
      )}
    </View>
  );
}

export interface TagSpec {
  label: string;
  icon?: V2IconName;
  tone?: Tone;
}

/** Etiqueta (Figma "etiqueta · ___"): pílula com ícone de 13 e texto de 12. */
export function Tag({ label, icon, tone = 'neutral', compact = false }: TagSpec & { compact?: boolean }) {
  const accent = useAccent();
  const colors =
    tone === 'neutral'
      ? { fill: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)', ink: V2Colors.textSecondary }
      : tone === 'gold'
        ? { fill: 'rgba(255,194,75,0.12)', border: 'rgba(255,194,75,0.32)', ink: GOLD }
        : toneColors('accent', accent);
  return (
    <View
      style={[
        styles.tag,
        compact && styles.tagCompact,
        { backgroundColor: colors.fill, borderColor: colors.border },
      ]}
    >
      {icon ? <V2Icon name={icon} size={13} color={colors.ink} /> : null}
      {/* Num cartão estreito (fonte grande no aparelho), encolhe em vez de cortar. */}
      <Text
        style={[styles.tagText, { color: colors.ink }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
      >
        {label}
      </Text>
    </View>
  );
}

/** Cartão dos visuais: vidro de 4% com borda de 10%, raio 20 e 16 por dentro. */
export function VisualCard({
  children,
  tone = 'neutral',
  style,
}: {
  children: ReactNode;
  tone?: 'neutral' | 'accent';
  style?: StyleProp<ViewStyle>;
}) {
  const accent = useAccent();
  return (
    <View
      style={[
        styles.card,
        tone === 'accent' && { backgroundColor: accent.alpha(0.14), borderColor: accent.alpha(0.32) },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

/**
 * Linha de condição (Figma "amanhã", "condição", "em reais"): as setas de sobe
 * e desce, ou o "i", e o texto.
 */
export function ConditionLine({ text, icon = 'arrows' }: { text: string; icon?: 'arrows' | 'info' }) {
  return (
    <View style={styles.condition}>
      {icon === 'arrows' ? (
        <>
          <V2Icon name="arrow-up" size={14} color={V2Colors.textSecondary} />
          <V2Icon name="arrow-down" size={14} color={V2Colors.textSecondary} />
        </>
      ) : (
        <V2Icon name="info" size={14} color={V2Colors.textSecondary} />
      )}
      <Text style={styles.conditionText}>{text}</Text>
    </View>
  );
}

/** Valor reservado (Figma "valor (na hora)"): o número real só aparece no app. */
export function ValuePlaceholder({ width }: { width: number }) {
  return <View style={[styles.placeholder, { width }]} accessible={false} />;
}

export const visualText = StyleSheet.create({
  /** Título de cartão: ExtraBold 15, entrelinha 1,25. */
  title: {
    fontFamily: V2Font.extraBold,
    fontSize: 15,
    lineHeight: 15 * 1.25,
    color: V2Colors.text,
  },
  /** Legenda: Medium 13,5, secundária. */
  caption: {
    fontFamily: V2Font.medium,
    fontSize: 13.5,
    color: V2Colors.textSecondary,
  },
  /** Rótulo pequeno de valor ("Você dá", "Hoje"). */
  label: {
    fontFamily: V2Font.bold,
    fontSize: 12,
    color: V2Colors.textTertiary,
  },
});

const styles = StyleSheet.create({
  seal: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  tag: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 10,
    paddingRight: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  // L4-T01: etiqueta só com texto, 10 dos lados e 5 em cima e embaixo.
  tagCompact: {
    alignSelf: 'auto',
    paddingRight: 10,
    paddingVertical: 5,
  },
  tagText: {
    flexShrink: 1,
    fontFamily: V2Font.bold,
    fontSize: 12,
  },
  card: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    overflow: 'hidden',
  },
  divider: {
    alignSelf: 'stretch',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  condition: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  conditionText: {
    flexShrink: 1,
    fontFamily: V2Font.medium,
    fontSize: 13.5,
    color: V2Colors.textSecondary,
  },
  placeholder: {
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
});
