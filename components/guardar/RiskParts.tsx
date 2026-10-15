import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { V2Colors, V2Font, V2Radius, withAlpha } from '@/constants/theme-v2';
import { AssetIcon, V2Icon } from '@/components/v2';
import type { RiskCard } from '@/lib/copy/disclosures';
import type { PiggyAsset } from '@/lib/utils/piggy';

// Peças da tela de aceite de riscos (Figma "Guardar · Aceite de riscos").

const MASCOT = require('@/assets/images/v2/mascote-baby-pig.png');

interface RisksIdentityProps {
  name: string;
  asset: PiggyAsset | null;
  /** "Euro" (Lite) ou "EURC" (Pro). */
  coin: string;
  /** "Texto de 15/09/2026" ou "v1 · 15/09/2026". */
  caption: string;
  tint: string;
}

/** Mascote na cor do porquinho, nome, moeda e a data do texto (Figma 13a). */
export function RisksIdentity({ name, asset, coin, caption, tint }: RisksIdentityProps) {
  return (
    <View style={styles.identity}>
      <View style={[styles.mascotBox, { backgroundColor: withAlpha(tint, 0.16), borderColor: withAlpha(tint, 0.4) }]}>
        <Image source={MASCOT} style={styles.mascot} contentFit="contain" />
      </View>
      <View style={styles.identityTexts}>
        <Text style={styles.name} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
          {name}
        </Text>
        <View style={styles.identityLine}>
          <View style={styles.coinPill}>
            {asset && <AssetIcon asset={asset} size={16} round />}
            <Text style={styles.coinText}>{coin}</Text>
          </View>
          <Text style={styles.caption} numberOfLines={1}>
            {caption}
          </Text>
        </View>
      </View>
    </View>
  );
}

/** Um risco: selo âmbar, título e explicação. "Atualizado" quando é novo. */
export function RiskCardView({ card, updated }: { card: RiskCard; updated: boolean }) {
  return (
    <View
      style={[styles.card, updated && styles.cardUpdated]}
      accessible
      accessibilityLabel={`${updated ? 'Atualizado. ' : ''}${card.title}. ${card.body}`}
    >
      <View style={styles.cardTitleRow}>
        <View style={styles.badge}>
          <V2Icon name={card.icon} size={18} color={V2Colors.warning} />
        </View>
        <Text style={styles.cardTitle}>{card.title}</Text>
        {updated && (
          <View style={styles.updatedPill}>
            <Text style={styles.updatedText}>Atualizado</Text>
          </View>
        )}
      </View>
      <Text style={styles.cardBody}>{card.body}</Text>
    </View>
  );
}

/** Aviso âmbar do topo (Figma 13e): texto novo, ou mudou durante a leitura. */
export function RisksBanner({ message, changed }: { message: string; changed?: string | null }) {
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <View style={styles.bannerRow}>
        <V2Icon name="alert" size={18} color={V2Colors.warning} />
        <Text style={styles.bannerText}>{message}</Text>
      </View>
      {/* Figma 13e: a linha "Mudou" começa na borda, sob o ícone. */}
      {changed ? <Text style={styles.bannerChanged}>{changed}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mascotBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascot: {
    width: 44,
    height: 44,
  },
  identityTexts: {
    flex: 1,
    gap: 5,
  },
  name: {
    fontFamily: V2Font.black,
    fontSize: 17,
    letterSpacing: -0.34,
    color: V2Colors.onPrimary,
  },
  identityLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  coinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 9,
    paddingRight: 11,
    paddingVertical: 3,
    borderRadius: V2Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  coinText: {
    fontFamily: V2Font.black,
    fontSize: 11.5,
    color: V2Colors.onPrimary,
  },
  caption: {
    flexShrink: 1,
    fontFamily: V2Font.medium,
    fontSize: 11.5,
    color: V2Colors.textTertiary,
  },
  card: {
    gap: 10,
    paddingTop: 14,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: V2Colors.surface,
  },
  cardUpdated: {
    borderColor: withAlpha(V2Colors.warning, 0.5),
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: withAlpha(V2Colors.warning, 0.16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    flex: 1,
    fontFamily: V2Font.extraBold,
    fontSize: 15,
    color: V2Colors.onPrimary,
  },
  updatedPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: V2Radius.full,
    borderWidth: 1,
    borderColor: withAlpha(V2Colors.warning, 0.35),
    backgroundColor: withAlpha(V2Colors.warning, 0.14),
  },
  updatedText: {
    fontFamily: V2Font.extraBold,
    fontSize: 10.5,
    color: V2Colors.warning,
  },
  cardBody: {
    fontFamily: V2Font.medium,
    fontSize: 13,
    lineHeight: 13 * 1.45,
    color: V2Colors.textSecondary,
  },
  banner: {
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: withAlpha(V2Colors.warning, 0.3),
    backgroundColor: withAlpha(V2Colors.warning, 0.1),
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bannerText: {
    flex: 1,
    fontFamily: V2Font.medium,
    fontSize: 13,
    lineHeight: 13 * 1.45,
    color: V2Colors.textSecondary,
  },
  bannerChanged: {
    fontFamily: V2Font.extraBold,
    fontSize: 13,
    color: V2Colors.onPrimary,
  },
});
