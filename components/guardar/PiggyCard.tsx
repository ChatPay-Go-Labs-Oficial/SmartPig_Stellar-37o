import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import { V2Colors, V2Font, V2PiggyTint, V2Radius, withAlpha } from '@/constants/theme-v2';
import { useAccent } from '@/hooks/use-accent';
import { useTerms } from '@/hooks/use-terms';
import { AssetIcon, Button3D, RADIAL_MASK, V2Icon, type V2IconName } from '@/components/v2';
import type { TermKey } from '@/lib/copy/terms';
import { formatApy, formatUsdV2, formatVaultNameForMode } from '@/lib/utils/format';
import { piggyUnit, type Piggy } from '@/lib/utils/piggy';
import { PiggyAmount } from './PiggyAmount';

const MASCOT = require('@/assets/images/v2/mascote-baby-pig.png');

// Vizinho do carrossel: cartão inteiro a 60%, borda neutra e ações ocultas
// (Figma 10b–10d). O cartão do centro ganha a borda na cor do porquinho.
const INACTIVE_OPACITY = 0.6;
const INACTIVE_BORDER = 'rgba(255,255,255,0.1)';

interface PiggyCardProps {
  piggy: Piggy;
  index: number;
  width: number;
  /** Passo do carrossel (largura + espaço), para a animação por posição. */
  step: number;
  scrollX: SharedValue<number>;
  active: boolean;
  onFocus: (index: number) => void;
  onSave: (piggy: Piggy) => void;
  onWithdraw: (piggy: Piggy) => void;
}

/** Cartão do porquinho no carrossel da Guardar (Figma 10a, 10d, 10f–10h). */
export const PiggyCard = memo(function PiggyCard({
  piggy,
  index,
  width,
  step,
  scrollX,
  active,
  onFocus,
  onSave,
  onWithdraw,
}: PiggyCardProps) {
  const accent = useAccent();
  const { t, p, mode } = useTerms();
  const { asset, vault } = piggy;

  const tint = asset === 'EURC' || asset === 'XLM' ? V2PiggyTint[asset] : accent.base;
  // Borda do cartão ativo: "Primária 48%" no dólar; 53% nas outras tintas.
  const activeBorder = withAlpha(tint, asset === 'USDC' || !asset ? 0.48 : 0.53);
  const auraOpacity = asset === 'USDC' || !asset ? 0.32 : 0.33;

  const name = asset
    ? t(`guardar.piggy.${asset}.name` as TermKey)
    : formatVaultNameForMode(vault.name, mode);
  const coin = asset ? t(`carteira.asset.${asset}.name` as TermKey) : vault.assetSymbol;
  const coinCaption = asset ? t(`guardar.pill.${asset}.caption` as TermKey) : '';
  const { prefix, suffix } = piggyUnit(piggy);
  const apy = vault.apy != null ? formatApy(vault.apy) : null;

  // 0 = vizinho, 1 = no centro; acompanha o dedo durante o arraste.
  const cardStyle = useAnimatedStyle(() => {
    const focus = interpolate(Math.abs(scrollX.value - index * step), [0, step], [1, 0], 'clamp');
    return { opacity: interpolate(focus, [0, 1], [INACTIVE_OPACITY, 1]) };
  });
  const borderStyle = useAnimatedStyle(() => {
    const focus = interpolate(Math.abs(scrollX.value - index * step), [0, step], [1, 0], 'clamp');
    return { borderColor: interpolateColor(focus, [0, 1], [INACTIVE_BORDER, activeBorder]) };
  });
  const actionsStyle = useAnimatedStyle(() => {
    const focus = interpolate(Math.abs(scrollX.value - index * step), [0, step], [1, 0], 'clamp');
    return { opacity: focus };
  });

  let badge: { icon: V2IconName; label: string; warning: boolean } | null = null;
  if (piggy.depositsPaused) badge = { icon: 'alert', label: t('guardar.state.paused'), warning: true };
  else if (piggy.risksPending) badge = { icon: 'shield', label: t('guardar.state.risks'), warning: true };
  else if (apy) badge = { icon: 'trending', label: p('guardar.rate', { apy }), warning: false };

  const usdLine =
    piggy.hasBalance && asset !== 'USDC' && piggy.usd !== null ? `≈ ${formatUsdV2(piggy.usd)}` : null;

  return (
    // No cartão do centro o envoltório some da acessibilidade, para o leitor
    // de tela chegar a cada texto e aos botões Guardar e Tirar.
    <Pressable
      onPress={active ? undefined : () => onFocus(index)}
      disabled={active}
      accessible={!active}
      focusable={!active}
      accessibilityRole={active ? undefined : 'button'}
      accessibilityLabel={active ? undefined : `${name}, ${coin}`}
      accessibilityHint={active ? undefined : 'Mostrar este porquinho'}
    >
      <Animated.View style={[styles.card, { width }, cardStyle]}>
        {/* Aura: radial na cor do porquinho, centro em 50% × 34% (Figma). */}
        <Image
          source={RADIAL_MASK}
          tintColor={tint}
          contentFit="fill"
          style={[styles.aura, { opacity: auraOpacity }]}
        />

        <View style={styles.pill}>
          {asset && <AssetIcon asset={asset} size={16} round />}
          <Text style={styles.pillName} numberOfLines={1}>{coin}</Text>
          {coinCaption ? (
            <Text style={styles.pillCaption} numberOfLines={1}>{coinCaption}</Text>
          ) : null}
        </View>

        <Image source={MASCOT} style={styles.mascot} contentFit="contain" />

        <Text style={styles.name} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
          {name}
        </Text>

        <View style={styles.balance}>
          {piggy.balanceKnown ? (
            <PiggyAmount amount={piggy.amount} prefix={prefix} suffix={suffix} size="card" />
          ) : (
            <Text style={styles.balanceUnknown}>—</Text>
          )}
          {usdLine && <Text style={styles.usd}>{usdLine}</Text>}
        </View>

        {badge && (
          <View style={[styles.badge, badge.warning ? styles.badgeWarning : styles.badgeRate]}>
            <V2Icon
              name={badge.icon}
              size={13}
              color={badge.warning ? V2Colors.warning : V2Colors.success}
            />
            <Text
              style={[styles.badgeText, { color: badge.warning ? V2Colors.warning : V2Colors.success }]}
              numberOfLines={1}
            >
              {badge.label}
            </Text>
          </View>
        )}

        <Animated.View
          style={[styles.actions, actionsStyle]}
          pointerEvents={active ? 'auto' : 'none'}
          accessibilityElementsHidden={!active}
          importantForAccessibility={active ? 'auto' : 'no-hide-descendants'}
        >
          <Button3D
            label="Guardar"
            icon="arrow-down"
            onPress={() => onSave(piggy)}
            disabled={piggy.depositsPaused}
            accessibilityHint={piggy.depositsPaused ? t('guardar.notice.paused') : `Guardar no ${name}`}
            style={styles.save}
          />
          <Button3D
            label="Tirar"
            icon="arrow-up"
            variant="glass"
            // Sempre abre: com o saldo não lido nesta atualização, o modal
            // explica e oferece tentar de novo (um botão desligado parecia travado).
            onPress={() => onWithdraw(piggy)}
            accessibilityHint={`Tirar do ${name}`}
            style={styles.withdraw}
          />
        </Animated.View>

        {/* Borda numa camada própria, por cima da aura */}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.border, borderStyle]} />
      </Animated.View>
    </Pressable>
  );
});

const CARD_RADIUS = 28;

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    gap: 6,
    paddingTop: 16,
    paddingBottom: 18,
    paddingHorizontal: 18,
    borderRadius: CARD_RADIUS,
    backgroundColor: V2Colors.surface,
    overflow: 'hidden',
  },
  border: {
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
  },
  aura: {
    position: 'absolute',
    width: '140%',
    height: '100%',
    left: '-20%',
    top: '-16%',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '100%',
    paddingHorizontal: 11,
    paddingVertical: 4,
    borderRadius: V2Radius.full,
    borderWidth: 1,
    borderColor: V2Colors.chipBorder,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  pillName: {
    fontFamily: V2Font.black,
    fontSize: 11.5,
    color: V2Colors.onPrimary,
  },
  pillCaption: {
    flexShrink: 1,
    fontFamily: V2Font.semiBold,
    fontSize: 11.5,
    color: V2Colors.textSecondary,
  },
  mascot: {
    width: 132,
    height: 132,
  },
  name: {
    maxWidth: '100%',
    fontFamily: V2Font.black,
    fontSize: 20,
    letterSpacing: -0.4,
    textAlign: 'center',
    color: V2Colors.onPrimary,
  },
  balance: {
    alignItems: 'center',
    gap: 2,
    paddingTop: 2,
    maxWidth: '100%',
  },
  balanceUnknown: {
    fontFamily: V2Font.black,
    fontSize: 28,
    color: V2Colors.textTertiary,
  },
  usd: {
    fontFamily: V2Font.medium,
    fontSize: 12.5,
    color: V2Colors.textSecondary,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    maxWidth: '100%',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: V2Radius.full,
    borderWidth: 1,
  },
  badgeRate: {
    backgroundColor: withAlpha(V2Colors.success, 0.14),
    borderColor: withAlpha(V2Colors.success, 0.3),
  },
  badgeWarning: {
    backgroundColor: withAlpha(V2Colors.warning, 0.14),
    borderColor: withAlpha(V2Colors.warning, 0.3),
  },
  badgeText: {
    flexShrink: 1,
    fontFamily: V2Font.extraBold,
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 8,
    alignSelf: 'stretch',
  },
  // Proporção do Figma: Guardar 144, Tirar 100.
  save: {
    flex: 144,
  },
  withdraw: {
    flex: 100,
  },
});
