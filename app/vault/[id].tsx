import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { V2Colors, V2Font, V2Layout, V2PiggyTint, V2Radius, withAlpha } from '@/constants/theme-v2';
import { useAccent } from '@/hooks/use-accent';
import { useTerms } from '@/hooks/use-terms';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useVault, useVaults } from '@/lib/queries/vaults.queries';
import { usePortfolioSummary } from '@/lib/queries/portfolio.queries';
import type { PortfolioSummary } from '@/lib/api/portfolio';
import type { TermKey } from '@/lib/copy/terms';
import { formatFeeBps, piggyDetailsCopy, type DetailsIcon } from '@/lib/copy/piggy-details';
import { isMainnetNetwork } from '@/lib/stellar/config';
import { formatPositiveApy, formatUsdV2, formatVaultNameForMode } from '@/lib/utils/format';
import { buildPiggies, piggyUnit, type Piggy } from '@/lib/utils/piggy';
import { AssetIcon, RADIAL_MASK, ScreenGlow, V2Icon, type V2IconName } from '@/components/v2';
import { PiggyAmount } from '@/components/guardar/PiggyAmount';

const MASCOT = require('@/assets/images/v2/mascote-baby-pig.png');

// Sem portfólio (carregando ou falhou), o saldo fica desconhecido ("—").
const NO_SUMMARY: PortfolioSummary = {
  totalUsd: null,
  asOf: '',
  priceSource: null,
  stale: true,
  positions: [],
};

/**
 * Detalhes do porquinho (Figma "Guardar · Detalhes", 12a–12f): ativo,
 * estratégia, origem da taxa, saída, taxas, dependências e riscos. Só
 * leitura, e nunca bloqueada: vale para qualquer porquinho, guardado ou não.
 */
export default function PiggyDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const screenInsets = useScreenInsets();
  const insets = useSafeAreaInsets();
  const accent = useAccent();
  const { t, mode, isPro } = useTerms();
  const walletAddress = useAuthStore((s) => s.walletAddress);

  const vaultsQuery = useVaults();
  const detailQuery = useVault(id ?? '');
  const portfolioQuery = usePortfolioSummary(!!walletAddress);

  const vault = vaultsQuery.data?.find((v) => v.id === id) ?? detailQuery.data;
  const piggy = vault ? buildPiggies([vault], portfolioQuery.data ?? NO_SUMMARY, () => true)[0] : null;
  const detail = detailQuery.data;
  const fee = formatFeeBps(
    detail?.liveInfo?.fees?.vaultFeeBps ?? detail?.configRecord?.fees?.vaultFeeBps,
  );

  const failed = !vault && (vaultsQuery.isError || detailQuery.isError);

  return (
    <View style={styles.screen}>
      <ScreenGlow />
      <ScrollView
        style={{ marginTop: screenInsets.top }}
        contentContainerStyle={[
          styles.content,
          { paddingTop: screenInsets.topGap, paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.back}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            hitSlop={8}
          >
            <V2Icon name="chevron-left" size={22} color={V2Colors.text} />
          </Pressable>
          <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
            {t('guardar.details.title')}
          </Text>
        </View>

        {piggy ? (
          <>
            <Summary piggy={piggy} />
            {(() => {
              const copy = piggyDetailsCopy(piggy.asset, mode, fee);
              return (
                <>
                  {copy.sections.map((section) => (
                    <InfoCard key={section.title} icon={section.icon} title={section.title}>
                      <Text style={styles.body}>{section.body}</Text>
                    </InfoCard>
                  ))}
                  <InfoCard icon="alert" title={copy.risksTitle} warning>
                    {copy.risks.map((risk) => (
                      <View key={risk} style={styles.risk}>
                        <View style={styles.bulletSlot}>
                          <View style={styles.bullet} />
                        </View>
                        <Text style={[styles.body, styles.riskText]}>{risk}</Text>
                      </View>
                    ))}
                  </InfoCard>
                  {isPro && <TechnicalData piggy={piggy} detail={detail} />}
                </>
              );
            })()}
          </>
        ) : (
          <View style={styles.state}>
            {failed ? (
              <>
                <Text style={styles.stateText}>{t('guardar.details.error')}</Text>
                <Pressable
                  onPress={() => {
                    vaultsQuery.refetch();
                    detailQuery.refetch();
                  }}
                  accessibilityRole="button"
                  hitSlop={8}
                >
                  <Text style={[styles.stateAction, { color: accent.base }]}>Tentar novamente</Text>
                </Pressable>
              </>
            ) : (
              <ActivityIndicator size="large" color={V2Colors.onPrimary} />
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

/** Resumo: quem é o porquinho, a taxa e o que a pessoa tem guardado nele. */
function Summary({ piggy: item }: { piggy: Piggy }) {
  const accent = useAccent();
  const { t, p, mode, isPro } = useTerms();
  const { asset, vault: v } = item;
  const tint = asset === 'EURC' || asset === 'XLM' ? V2PiggyTint[asset] : accent.base;
  // Borda: "Primária 48%" no dólar; 45% nas tintas fixas (Figma 12b/12c).
  const border = withAlpha(tint, asset === 'USDC' || !asset ? 0.48 : 0.45);
  const name = asset
    ? t(`guardar.piggy.${asset}.name` as TermKey)
    : formatVaultNameForMode(v.name, mode);
  const coin = asset ? t(`carteira.asset.${asset}.name` as TermKey) : v.assetSymbol;
  const coinCaption = asset && isPro ? t(`guardar.pill.${asset}.caption` as TermKey) : '';
  // Só taxa positiva, como na Home e na Guardar: o XLM chega negativo, e
  // mostrá-lo como rendimento seria enganoso (cai no selo de taxa baixa).
  const apy = formatPositiveApy(v.apy);
  const { prefix, suffix } = piggyUnit(item);

  let balance: React.ReactNode;
  if (!item.balanceKnown) {
    balance = <Text style={styles.balanceEmpty}>—</Text>;
  } else if (!item.hasBalance && !isPro) {
    balance = <Text style={styles.notSaved}>{t('guardar.details.empty')}</Text>;
  } else if (!item.hasBalance) {
    // Pro sem saldo: a quantidade zerada com o código (Figma 12e / 12f).
    balance = <Text style={styles.zeroPro}>{`0.0000000 ${v.assetSymbol}`}</Text>;
  } else {
    balance = (
      <PiggyAmount
        amount={item.amount}
        prefix={prefix}
        suffix={isPro ? '' : suffix}
        unit={isPro ? v.assetSymbol : undefined}
        size="details"
      />
    );
  }
  const showLabel = !(item.balanceKnown && !item.hasBalance && !isPro);

  // Sem nenhum chip a linha some: vazia, ela dobraria o espaço do resumo.
  const rateChip = apy ? (
    <Chip icon="trending" label={p('guardar.rate', { apy })} tone="success" />
  ) : asset === 'XLM' ? (
    <Chip icon="trending" label={t('guardar.details.lowRate')} tone="neutral" />
  ) : null;
  const stateChip = item.depositsPaused ? (
    <Chip icon="alert" label={t('guardar.state.paused')} tone="warning" />
  ) : item.risksPending ? (
    <Chip icon="shield" label={t('guardar.state.risks')} tone="warning" />
  ) : null;
  const usdLine =
    item.hasBalance && asset !== 'USDC' && item.usd !== null ? `≈ ${formatUsdV2(item.usd)}` : null;

  return (
    <View style={styles.summary}>
      {/* Aura: radial na cor do porquinho, centro em 50% × 29% (Figma). */}
      <Image source={RADIAL_MASK} tintColor={tint} contentFit="fill" style={styles.summaryAura} />

      <View style={styles.identity}>
        <View
          style={[
            styles.mascotBox,
            { backgroundColor: withAlpha(tint, 0.16), borderColor: withAlpha(tint, 0.4) },
          ]}
        >
          <Image source={MASCOT} style={styles.mascot} contentFit="contain" />
        </View>
        <View style={styles.identityTexts}>
          <Text style={styles.name} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            {name}
          </Text>
          <View style={styles.pill}>
            {asset && <AssetIcon asset={asset} size={16} round />}
            <Text style={styles.pillName}>{coin}</Text>
            {coinCaption ? <Text style={styles.pillCaption}>{coinCaption}</Text> : null}
          </View>
        </View>
      </View>

      {(rateChip || stateChip) && (
        <View style={styles.chips}>
          {rateChip}
          {stateChip}
        </View>
      )}

      <View style={styles.summaryDivider} />

      <View style={styles.balance}>
        {showLabel && <Text style={styles.balanceLabel}>{t('vault.balance.label')}</Text>}
        {balance}
        {usdLine && <Text style={styles.usd}>{usdLine}</Text>}
      </View>

      {/* Borda numa camada própria, por cima da aura */}
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.summaryBorder, { borderColor: border }]}
      />
    </View>
  );
}

function InfoCard({
  icon,
  title,
  warning = false,
  children,
}: {
  icon: DetailsIcon | 'alert';
  title: string;
  warning?: boolean;
  children: React.ReactNode;
}) {
  const accent = useAccent();
  return (
    <View style={styles.card}>
      <View style={styles.cardTitleRow}>
        <View
          style={[
            styles.cardBadge,
            { backgroundColor: warning ? withAlpha(V2Colors.warning, 0.16) : accent.alpha(0.16) },
          ]}
        >
          <V2Icon name={icon} size={18} color={warning ? V2Colors.warning : accent.light} />
        </View>
        <Text style={styles.cardTitle} accessibilityRole="header">
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}

type ChipTone = 'success' | 'warning' | 'neutral';

const CHIP_TONES: Record<ChipTone, { bg: string; border: string; text: string }> = {
  success: {
    bg: withAlpha(V2Colors.success, 0.14),
    border: withAlpha(V2Colors.success, 0.3),
    text: V2Colors.success,
  },
  warning: {
    bg: withAlpha(V2Colors.warning, 0.14),
    border: withAlpha(V2Colors.warning, 0.3),
    text: V2Colors.warning,
  },
  neutral: { bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.14)', text: V2Colors.onPrimary },
};

function Chip({ icon, label, tone }: { icon: V2IconName; label: string; tone: ChipTone }) {
  const colors = CHIP_TONES[tone];
  return (
    <View style={[styles.chip, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      <V2Icon name={icon} size={13} color={colors.text} />
      <Text style={[styles.chipText, { color: colors.text }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

interface TechnicalDataProps {
  piggy: Piggy;
  detail: ReturnType<typeof useVault>['data'];
}

/**
 * Pro: identificadores do vault, resumidos e copiáveis (Figma 12d–12f). Linha
 * sem dado não aparece; nada de endereço "candidato" fixo no app.
 */
function TechnicalData({ piggy, detail }: TechnicalDataProps) {
  const accent = useAccent();
  const strategy =
    detail?.liveInfo?.assets?.[0]?.strategies?.[0]?.address ??
    detail?.configRecord?.strategies?.[0]?.contractId ??
    null;
  const pool =
    detail?.configRecord?.dependencies?.find((d) => d.type === 'POOL')?.identifier ?? null;

  // Os três porquinhos curados usam a estratégia do Figma; um vault fora deles
  // mostra o nome real, se houver.
  const strategyName = piggy.asset
    ? 'DeFindex Blend Autocompound'
    : (detail?.liveInfo?.assets?.[0]?.strategies?.[0]?.name ??
      detail?.configRecord?.strategies?.[0]?.name ??
      null);

  const rows: { label: string; value: string; copy?: string }[] = [
    { label: 'Rede', value: isMainnetNetwork() ? 'Stellar' : 'Stellar Testnet' },
    { label: 'Ativo', value: piggy.vault.assetSymbol },
  ];
  if (strategyName) rows.push({ label: 'Estratégia', value: strategyName });
  if (strategy) rows.push({ label: 'Contrato da estratégia', value: contractShort(strategy), copy: strategy });
  if (pool) rows.push({ label: 'Pool Blend', value: contractShort(pool), copy: pool });
  rows.push({
    label: 'Contrato do vault',
    value: contractShort(piggy.vault.defindexVaultId),
    copy: piggy.vault.defindexVaultId,
  });

  return (
    <View style={styles.card}>
      <View style={styles.cardTitleRow}>
        <View style={[styles.cardBadge, { backgroundColor: accent.alpha(0.16) }]}>
          <V2Icon name="info" size={18} color={accent.light} />
        </View>
        <Text style={styles.cardTitle} accessibilityRole="header">
          Dados técnicos
        </Text>
      </View>
      {rows.map((row, i) => (
        <TechRow key={row.label} {...row} first={i === 0} />
      ))}
    </View>
  );
}

/** Contrato resumido como no Figma: 6 do começo e 4 do fim ("CDB2WM…ZSAP"). */
function contractShort(address: string): string {
  return address.length > 11 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;
}

function TechRow({ label, value, copy, first }: { label: string; value: string; copy?: string; first: boolean }) {
  const accent = useAccent();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function handleCopy() {
    if (!copy) return;
    await Clipboard.setStringAsync(copy);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1500);
  }

  const content = (
    <>
      <Text style={styles.techLabel} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.techValue}>
        <Text style={[styles.techText, copied && { color: accent.base }]} numberOfLines={1}>
          {copied ? 'Copiado' : value}
        </Text>
        {copy && <V2Icon name={copied ? 'check' : 'copy'} size={14} color={accent.base} />}
      </View>
    </>
  );

  return copy ? (
    <Pressable
      onPress={handleCopy}
      style={[styles.techRow, !first && styles.techRowGap]}
      accessibilityRole="button"
      accessibilityLabel={`${label}: copiar`}
      hitSlop={4}
    >
      {content}
    </Pressable>
  ) : (
    <View style={[styles.techRow, !first && styles.techRowGap]}>{content}</View>
  );
}

const GUTTER = 18;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: V2Colors.background,
  },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: V2Layout.maxWidth,
    alignSelf: 'center',
    paddingHorizontal: GUTTER,
    gap: 14,
  },
  header: {
    minHeight: V2Layout.headerHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  back: {
    width: 38,
    height: 38,
    borderRadius: V2Radius.full,
    backgroundColor: V2Colors.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontFamily: V2Font.black,
    fontSize: 22,
    letterSpacing: -0.44,
    color: V2Colors.onPrimary,
  },
  summary: {
    padding: 18,
    gap: 14,
    borderRadius: V2Radius.card,
    backgroundColor: V2Colors.surface,
    overflow: 'hidden',
  },
  summaryBorder: {
    borderRadius: V2Radius.card,
    borderWidth: 1,
  },
  // Figma: radial de 28% com centro em 50% × 28,6% e raios 55,6% × 35,7%.
  summaryAura: {
    position: 'absolute',
    width: '111.1%',
    height: '71.4%',
    left: '-5.6%',
    top: '-7.1%',
    opacity: 0.28,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  mascotBox: {
    width: 60,
    height: 60,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascot: {
    width: 50,
    height: 50,
  },
  identityTexts: {
    flex: 1,
    gap: 5,
    alignItems: 'flex-start',
  },
  name: {
    maxWidth: '100%',
    fontFamily: V2Font.black,
    fontSize: 18,
    letterSpacing: -0.36,
    color: V2Colors.onPrimary,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 9,
    paddingRight: 11,
    paddingVertical: 3,
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
    fontFamily: V2Font.semiBold,
    fontSize: 11.5,
    color: V2Colors.textSecondary,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: V2Radius.full,
    borderWidth: 1,
  },
  chipText: {
    fontFamily: V2Font.extraBold,
    fontSize: 12,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  balance: {
    gap: 4,
    alignItems: 'flex-start',
  },
  balanceLabel: {
    fontFamily: V2Font.semiBold,
    fontSize: 12.5,
    color: V2Colors.textSecondary,
  },
  balanceEmpty: {
    fontFamily: V2Font.black,
    fontSize: 30,
    color: V2Colors.textTertiary,
  },
  notSaved: {
    fontFamily: V2Font.black,
    fontSize: 19,
    letterSpacing: -0.19,
    color: V2Colors.onPrimary,
  },
  zeroPro: {
    fontFamily: V2Font.black,
    fontSize: 22,
    letterSpacing: -0.22,
    color: V2Colors.onPrimary,
  },
  usd: {
    fontFamily: V2Font.medium,
    fontSize: 12.5,
    color: V2Colors.textSecondary,
  },
  card: {
    gap: 10,
    paddingTop: 14,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: V2Colors.surfaceBorder,
    backgroundColor: V2Colors.surface,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardBadge: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    flex: 1,
    fontFamily: V2Font.extraBold,
    fontSize: 15,
    color: V2Colors.onPrimary,
  },
  body: {
    fontFamily: V2Font.medium,
    fontSize: 13,
    lineHeight: 13 * 1.45,
    color: V2Colors.textSecondary,
  },
  risk: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  // Marcador alinhado à primeira linha do texto (Figma: 7 do topo).
  bulletSlot: {
    paddingTop: 7,
  },
  bullet: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: withAlpha(V2Colors.warning, 0.9),
  },
  riskText: {
    flex: 1,
  },
  techRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  techRowGap: {
    paddingTop: 8,
  },
  techLabel: {
    flexShrink: 1,
    fontFamily: V2Font.medium,
    fontSize: 13,
    color: V2Colors.textSecondary,
  },
  techValue: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  techText: {
    flexShrink: 1,
    fontFamily: V2Font.extraBold,
    fontSize: 13,
    color: V2Colors.onPrimary,
  },
  state: {
    minHeight: 420,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  stateText: {
    fontFamily: V2Font.semiBold,
    fontSize: 15,
    textAlign: 'center',
    color: V2Colors.textSecondary,
  },
  stateAction: {
    fontFamily: V2Font.extraBold,
    fontSize: 15,
  },
});
