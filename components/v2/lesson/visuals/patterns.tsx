import { Fragment, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { V2Colors, V2Font } from '@/constants/theme-v2';
import { useAccent } from '@/hooks/use-accent';
import { AssetIcon, type AssetLogoId } from '../../AssetIcon';
import { CardGlow } from '../../CardGlow';
import { V2Icon, type V2IconName } from '../../V2Icon';
import {
  ConditionLine,
  Divider,
  GOLD,
  Seal,
  Tag,
  ValuePlaceholder,
  VisualCard,
  toneColors,
  visualText,
  type Mark,
  type TagSpec,
  type Tone,
} from './parts';

// Padrões de visual da D1 (plano, seção D1), cada um com o quadro de
// referência no Figma. O registro (index.tsx) monta cada tela com eles.

/** Cartão de aviso (L1-T01): selo, título, legenda e o valor em destaque. */
export function NoticeCard({
  mark,
  title,
  caption,
  value,
}: {
  mark: Mark;
  title: string;
  caption: string;
  value: string;
}) {
  const accent = useAccent();
  return (
    <VisualCard>
      <View style={styles.row12}>
        <Seal mark={mark} tone="accent" />
        <View style={styles.texts}>
          <Text style={visualText.title}>{title}</Text>
          <Text style={visualText.caption}>{caption}</Text>
        </View>
        <Text style={[styles.noticeValue, { color: accent.light }]}>{value}</Text>
      </View>
    </VisualCard>
  );
}

export interface CaseSpec {
  tone: 'neutral' | 'accent';
  /** Selo de 44; ou `copies`, as três cópias ligadas (L1-T02). */
  mark?: Mark;
  copies?: V2IconName;
  title: string;
  caption?: string;
  tag?: TagSpec;
}

/** Ligação entre os cartões: seta (L1-T04), seta com rótulo (L2-T02) ou ida e volta (L2-T03). */
export type CaseLink =
  | { kind: 'arrow' }
  | { kind: 'label'; label: string }
  | { kind: 'roundtrip'; out: string; back: string };

/**
 * Dois cartões lado a lado, um em destaque (L1-T02, L1-T04, L1-T07, L2-T02,
 * L2-T03, L2-T06, L3-T01, L3-T07), com ou sem ligação entre eles.
 */
export function CaseCards({
  cases,
  link,
  sameHeight = true,
}: {
  cases: readonly [CaseSpec, CaseSpec];
  link?: CaseLink;
  /** false: cada cartão na altura do conteúdo (L3-T01); senão, os dois iguais. */
  sameHeight?: boolean;
}) {
  return (
    <View style={[styles.cases, { gap: link ? 6 : 10 }, !sameHeight && styles.casesTop]}>
      <CaseCard spec={cases[0]} />
      {link ? <CaseConnector link={link} /> : null}
      <CaseCard spec={cases[1]} />
    </View>
  );
}

function CaseCard({ spec }: { spec: CaseSpec }) {
  return (
    <VisualCard tone={spec.tone} style={styles.case}>
      {spec.copies ? (
        <Copies icon={spec.copies} />
      ) : spec.mark ? (
        <Seal mark={spec.mark} tone={spec.tone} />
      ) : null}
      <Text style={visualText.title}>{spec.title}</Text>
      {spec.caption ? <Text style={visualText.caption}>{spec.caption}</Text> : null}
      {spec.tag ? <Tag {...spec.tag} /> : null}
    </VisualCard>
  );
}

/** "cópias ligadas" (L1-T02): três selos de 32 unidos por traços. */
function Copies({ icon }: { icon: V2IconName }) {
  const accent = useAccent();
  return (
    <View style={styles.copies}>
      {[0, 1, 2].map((index) => (
        <Fragment key={index}>
          {index > 0 ? <View style={[styles.copyLink, { backgroundColor: accent.alpha(0.32) }]} /> : null}
          <Seal mark={{ icon }} tone="accent" size={32} />
        </Fragment>
      ))}
    </View>
  );
}

function CaseConnector({ link }: { link: CaseLink }) {
  const accent = useAccent();
  if (link.kind === 'arrow') {
    return (
      <View style={styles.connector}>
        <V2Icon name="chevron-right" size={16} color={V2Colors.textSecondary} />
      </View>
    );
  }
  if (link.kind === 'label') {
    return (
      <View style={[styles.connector, styles.connectorLabeled]}>
        <V2Icon name="chevron-right" size={16} color={accent.light} />
        <Text style={[styles.connectorText, { color: accent.light }]}>{link.label}</Text>
      </View>
    );
  }
  return (
    <View style={[styles.connector, styles.roundtrip]}>
      <View style={styles.connectorLabeled}>
        <V2Icon name="chevron-right" size={16} color={V2Colors.textSecondary} />
        <Text style={[styles.connectorText, { color: V2Colors.textSecondary }]}>{link.out}</Text>
      </View>
      <View style={styles.connectorLabeled}>
        <V2Icon name="chevron-left" size={16} color={accent.light} />
        <Text style={[styles.connectorText, { color: accent.light }]}>{link.back}</Text>
      </View>
    </View>
  );
}

/** Pílulas de equivalência (L1-T03, L3-T02): "1 dólar digital ≈ 1 dólar". */
export function Equivalences({
  rows,
  footer,
}: {
  rows: readonly { asset: AssetLogoId; digital: string; plain: string }[];
  /** Linha de condição embaixo, depois do divisor (L3-T02). */
  footer?: string;
}) {
  const accent = useAccent();
  const highlight = toneColors('accent', accent);
  return (
    <VisualCard style={{ gap: footer ? 14 : 10 }}>
      {rows.map((row) => (
        <View key={row.digital} style={styles.equivalence}>
          <View
            style={[
              styles.pill,
              styles.pillDigital,
              { backgroundColor: highlight.fill, borderColor: highlight.border },
            ]}
          >
            <AssetIcon asset={row.asset} size={22} round />
            <Text style={visualText.title}>{row.digital}</Text>
          </View>
          <Text style={styles.approx}>≈</Text>
          <View style={[styles.pill, styles.pillPlain]}>
            <Text style={visualText.title}>{row.plain}</Text>
          </View>
        </View>
      ))}
      {footer ? (
        <>
          <Divider />
          <ConditionLine text={footer} />
        </>
      ) : null}
    </VisualCard>
  );
}

/**
 * Cartão com linha de condição (L1-T05, L4-T02): selo, título e legenda, e
 * embaixo o "sobe e desce", com o divisor ou com o gráfico.
 */
export function ConditionCard({
  mark,
  tone,
  title,
  caption,
  footer,
  chart = false,
}: {
  mark: Mark;
  tone: Tone;
  title: string;
  caption: string;
  footer: string;
  chart?: boolean;
}) {
  return (
    <VisualCard style={{ gap: chart ? 12 : 14 }}>
      <View style={[styles.row12, chart && styles.row10]}>
        <Seal mark={mark} tone={tone} />
        <View style={styles.texts}>
          <Text style={visualText.title}>{title}</Text>
          <Text style={visualText.caption}>{caption}</Text>
        </View>
      </View>
      {chart ? <PriceChart /> : <Divider />}
      <ConditionLine text={footer} />
    </VisualCard>
  );
}

/** Pontos do gráfico (Figma "área do gráfico", 305 × 42), traço de 2,5 em ouro. */
const CHART_POINTS = [
  [0, 34],
  [30, 22],
  [60, 28],
  [95, 6],
  [130, 24],
  [165, 12],
  [200, 38],
  [235, 20],
  [270, 30],
  [305, 4],
] as const;
const CHART_WIDTH = 305;
const CHART_HEIGHT = 42;
const CHART_STROKE = 2.5;

/**
 * Gráfico que sobe e desce (L4-T02), sem SVG: cada trecho é uma barra girada,
 * de pontas redondas, na largura do cartão.
 */
function PriceChart() {
  const [width, setWidth] = useState(0);
  const scale = width / CHART_WIDTH;
  return (
    <View
      style={styles.chart}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      accessible={false}
    >
      {width > 0
        ? CHART_POINTS.slice(1).map(([x2, y2], index) => {
            const [x1, y1] = CHART_POINTS[index];
            const dx = (x2 - x1) * scale;
            const dy = y2 - y1;
            const length = Math.hypot(dx, dy) + CHART_STROKE;
            return (
              <View
                key={x2}
                style={[
                  styles.chartSegment,
                  {
                    width: length,
                    left: x1 * scale + dx / 2 - length / 2,
                    top: y1 + dy / 2 - CHART_STROKE / 2,
                    transform: [{ rotate: `${Math.atan2(dy, dx)}rad` }],
                  },
                ]}
              />
            );
          })
        : null}
    </View>
  );
}

/**
 * Cartão de valor (35b · L3-T03, L2-T04): "Você dá" e "Você recebe" com o
 * círculo da troca no meio, o brilho do destaque e a condição embaixo.
 */
export function ValueCard({
  tag,
  left,
  right,
  center,
  size,
  footer,
}: {
  tag?: TagSpec;
  left: { label: string; value: string };
  right: { label: string; value: string; asset?: AssetLogoId };
  center: V2IconName;
  /** 32 na troca (L3-T03), 19 na taxa (L2-T04). */
  size: number;
  footer: { text: string; icon: 'arrows' | 'info' };
}) {
  const accent = useAccent();
  const big = size > 24;
  return (
    <View style={[styles.valueCard, { borderColor: accent.alpha(0.32) }]}>
      <CardGlow />
      {tag ? <Tag {...tag} tone="accent" /> : null}
      <View style={styles.valueRow}>
        <View style={styles.valueSide}>
          <Text style={visualText.label}>{left.label}</Text>
          <Text style={[styles.value, { fontSize: size }]} numberOfLines={1} adjustsFontSizeToFit>
            {left.value}
          </Text>
        </View>
        <View
          style={[styles.valueCenter, { backgroundColor: accent.alpha(0.14), borderColor: accent.alpha(0.32) }]}
        >
          <V2Icon name={center} size={big ? 20 : 18} color={accent.light} />
        </View>
        <View style={[styles.valueSide, styles.valueSideEnd]}>
          <Text style={visualText.label}>{right.label}</Text>
          <View style={styles.valueWithAsset}>
            {right.asset ? <AssetIcon asset={right.asset} size={24} round /> : null}
            <Text style={[styles.value, { fontSize: size }]} numberOfLines={1} adjustsFontSizeToFit>
              {right.value}
            </Text>
          </View>
        </View>
      </View>
      <Divider />
      <ConditionLine text={footer.text} icon={footer.icon} />
    </View>
  );
}

/** Passos em sequência (L2-T01, L3-T06, L5-T01): selos ligados por um traço vertical. */
export function StepList({
  steps,
  link,
}: {
  steps: readonly { mark: Mark; tone: Tone; label: string }[];
  /** Altura da ligação: 14, ou 12 com quatro passos (L5-T01). */
  link: number;
}) {
  const accent = useAccent();
  return (
    <VisualCard>
      {steps.map((step, index) => (
        <Fragment key={step.label}>
          {index > 0 ? (
            <View style={[styles.stepLink, { height: link }]}>
              <View style={[styles.stepLinkLine, { height: link, backgroundColor: accent.alpha(0.32) }]} />
            </View>
          ) : null}
          <View style={styles.row12}>
            <Seal mark={step.mark} tone={step.tone} />
            <Text style={[visualText.title, styles.shrink]}>{step.label}</Text>
          </View>
        </Fragment>
      ))}
    </VisualCard>
  );
}

/** Etapas numeradas em linha (L1-T06): "1 Escolher > 2 Pagar > 3 Entregar". */
export function StepChips({ steps }: { steps: readonly string[] }) {
  const accent = useAccent();
  return (
    <VisualCard style={styles.stepChips}>
      {steps.map((step, index) => (
        <Fragment key={step}>
          {index > 0 ? <V2Icon name="chevron-right" size={14} color={V2Colors.textSecondary} /> : null}
          <View style={styles.stepChip}>
            <Text style={[styles.stepNumber, { color: accent.light }]}>{index + 1}</Text>
            <Text style={styles.stepChipText} numberOfLines={1} adjustsFontSizeToFit>
              {step}
            </Text>
          </View>
        </Fragment>
      ))}
    </VisualCard>
  );
}

/** Lista de conferência (L2-T05): o que conferir e o "Confirmar" ilustrado. */
export function Checklist({ title, items, action }: { title: string; items: readonly string[]; action: string }) {
  const accent = useAccent();
  const highlight = toneColors('accent', accent);
  return (
    <VisualCard style={styles.gap10}>
      <Text style={styles.checkTitle}>{title}</Text>
      {items.map((item) => (
        <View key={item} style={styles.checkItem}>
          <V2Icon name="check" size={16} color={accent.light} />
          <Text style={styles.checkText}>{item}</Text>
        </View>
      ))}
      <View style={[styles.checkAction, { backgroundColor: highlight.fill, borderColor: highlight.border }]}>
        <Text style={[styles.checkText, { color: accent.light }]}>{action}</Text>
      </View>
    </VisualCard>
  );
}

/** Cartão dividido (L3-T04): as duas moedas lado a lado e a legenda. */
export function SplitCard({
  parts,
  caption,
}: {
  parts: readonly { asset: AssetLogoId; label: string; tone: 'neutral' | 'accent' }[];
  caption: string;
}) {
  const accent = useAccent();
  return (
    <VisualCard style={styles.gap12}>
      <View style={styles.splitParts}>
        {parts.map((part) => {
          const colors =
            part.tone === 'accent'
              ? toneColors('accent', accent)
              : { fill: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.12)' };
          return (
            <View
              key={part.label}
              style={[styles.splitPart, { backgroundColor: colors.fill, borderColor: colors.border }]}
            >
              <AssetIcon asset={part.asset} size={22} round />
              <Text style={styles.splitText}>{part.label}</Text>
            </View>
          );
        })}
      </View>
      <Text style={visualText.caption}>{caption}</Text>
    </VisualCard>
  );
}

/** Grade de moedas com legenda (L3-T05): dez moedas, nove emprestadas e uma disponível. */
export function CoinGrid({ lent, available }: { lent: string; available: string }) {
  const accent = useAccent();
  const free = toneColors('accent', accent);
  return (
    <VisualCard style={styles.gap14}>
      {[0, 1].map((row) => (
        <View key={row} style={styles.coinRow}>
          {[0, 1, 2, 3, 4].map((column) => {
            const isFree = row === 1 && column === 4;
            return (
              <View
                key={column}
                style={[
                  styles.coin,
                  isFree && { backgroundColor: free.fill, borderColor: free.border },
                ]}
              />
            );
          })}
        </View>
      ))}
      <View style={styles.tags}>
        <Tag label={lent} />
        <Tag label={available} icon="check" tone="accent" />
      </View>
    </VisualCard>
  );
}

/** Lista de moedas com etiqueta (L4-T01): a criptomoeda em ouro, sem o "≈". */
export function CoinList({
  rows,
}: {
  rows: readonly { asset: AssetLogoId; label: string; tag: string; gold?: boolean }[];
}) {
  return (
    <View style={styles.gap8}>
      {rows.map((row) => (
        <View key={row.asset} style={[styles.listRow, row.gold && styles.listRowGold]}>
          <Seal mark={{ asset: row.asset }} size={40} />
          <Text style={[visualText.title, styles.flex]}>{row.label}</Text>
          <Tag label={row.tag} tone={row.gold ? 'gold' : 'neutral'} compact />
        </View>
      ))}
    </View>
  );
}

/** Equação (L4-T03): quantidade × preço = total, com o total em destaque. */
export function Equation({
  blocks,
}: {
  blocks: readonly [
    { value: string; caption: string },
    { value: string; caption: string },
    { value: string; caption: string },
  ];
}) {
  const accent = useAccent();
  return (
    <VisualCard style={styles.equation}>
      {blocks.map((block, index) => (
        <Fragment key={block.caption}>
          {index > 0 ? <Text style={styles.operator}>{index === 1 ? '×' : '='}</Text> : null}
          <View style={styles.block}>
            <Text style={[styles.blockValue, index === 2 && { color: accent.light }]}>{block.value}</Text>
            <Text style={styles.blockCaption}>{block.caption}</Text>
          </View>
        </Fragment>
      ))}
    </VisualCard>
  );
}

/** Lista de perguntas (L4-T04): selo de 36 e a pergunta. */
export function QuestionList({ items }: { items: readonly { icon: V2IconName; label: string }[] }) {
  return (
    <View style={styles.gap8}>
      {items.map((item) => (
        <View key={item.label} style={styles.listRow}>
          <Seal mark={{ icon: item.icon }} size={36} />
          <Text style={styles.questionText}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

/** Cotação com valores reservados (L5-T02): os números reais vêm do porquinho, na hora. */
export function QuoteCard({
  title,
  tag,
  rows,
}: {
  title: string;
  tag: TagSpec;
  rows: readonly { label: string; width: number }[];
}) {
  return (
    <VisualCard style={styles.gap12}>
      <View style={styles.spread}>
        <Text style={visualText.title}>{title}</Text>
        <Tag {...tag} />
      </View>
      <Divider />
      {rows.map((row) => (
        <View key={row.label} style={styles.spread}>
          <Text style={styles.quoteLabel}>{row.label}</Text>
          <ValuePlaceholder width={row.width} />
        </View>
      ))}
    </VisualCard>
  );
}

/** Duas opções com valores (L5-T03). */
export function OptionCards({
  options,
}: {
  options: readonly [OptionSpec, OptionSpec];
}) {
  return (
    <View style={[styles.cases, styles.gap10]}>
      {options.map((option) => (
        <VisualCard key={option.label} style={styles.option}>
          <Text style={styles.optionLabel}>{option.label}</Text>
          <Text style={styles.optionValue}>{option.value}</Text>
          <Text style={visualText.caption}>{option.caption}</Text>
        </VisualCard>
      ))}
    </View>
  );
}

interface OptionSpec {
  label: string;
  value: string;
  caption: string;
}

/** Porquinho com saldo e ação (L5-T04): o "Tirar" disponível, sem cadeado. */
export function BalanceCard({
  asset,
  title,
  balanceLabel,
  action,
  tag,
}: {
  asset: AssetLogoId;
  title: string;
  balanceLabel: string;
  action: string;
  tag: TagSpec;
}) {
  const accent = useAccent();
  const highlight = toneColors('accent', accent);
  return (
    <VisualCard style={styles.gap12}>
      <View style={styles.row12}>
        <Seal mark={{ asset }} />
        <View style={styles.balanceTexts}>
          <Text style={visualText.title}>{title}</Text>
          <View style={styles.row8}>
            <Text style={visualText.caption}>{balanceLabel}</Text>
            <ValuePlaceholder width={64} />
          </View>
        </View>
      </View>
      <View style={[styles.balanceAction, { backgroundColor: highlight.fill, borderColor: highlight.border }]}>
        <V2Icon name="arrow-up" size={16} color={accent.light} />
        <Text style={[styles.checkText, { color: accent.light }]}>{action}</Text>
      </View>
      <Tag {...tag} />
    </VisualCard>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  shrink: {
    flexShrink: 1,
  },
  gap8: {
    gap: 8,
  },
  gap10: {
    gap: 10,
  },
  gap12: {
    gap: 12,
  },
  gap14: {
    gap: 14,
  },
  row12: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  row10: {
    gap: 10,
  },
  row8: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  texts: {
    flex: 1,
    gap: 2,
  },
  spread: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  noticeValue: {
    fontFamily: V2Font.black,
    fontSize: 22,
  },
  cases: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  casesTop: {
    alignItems: 'flex-start',
  },
  case: {
    flex: 1,
    gap: 10,
  },
  copies: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  copyLink: {
    width: 10,
    height: 2,
  },
  connector: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectorLabeled: {
    alignItems: 'center',
    gap: 2,
  },
  roundtrip: {
    gap: 10,
  },
  connectorText: {
    fontFamily: V2Font.bold,
    fontSize: 11.5,
  },
  equivalence: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pill: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
  },
  pillDigital: {
    gap: 8,
    paddingLeft: 12,
    paddingRight: 16,
  },
  pillPlain: {
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.12)',
  },
  approx: {
    width: 14,
    fontFamily: V2Font.black,
    fontSize: 20,
    color: V2Colors.textSecondary,
  },
  chart: {
    alignSelf: 'stretch',
    height: CHART_HEIGHT,
  },
  chartSegment: {
    position: 'absolute',
    height: CHART_STROKE,
    borderRadius: CHART_STROKE / 2,
    backgroundColor: GOLD,
  },
  valueCard: {
    gap: 14,
    paddingTop: 18,
    paddingBottom: 16,
    paddingHorizontal: 18,
    borderRadius: 22,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    overflow: 'hidden',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  valueSide: {
    flex: 1,
    gap: 2,
  },
  valueSideEnd: {
    alignItems: 'flex-end',
  },
  valueWithAsset: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  value: {
    flexShrink: 1,
    fontFamily: V2Font.black,
    color: V2Colors.text,
  },
  valueCenter: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLink: {
    width: 44,
  },
  stepLinkLine: {
    position: 'absolute',
    left: 21,
    top: 0,
    width: 2,
  },
  // Figma "etapas": 118 de altura, com as etapas centradas.
  stepChips: {
    minHeight: 118,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  stepChip: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingLeft: 8,
    paddingRight: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  stepNumber: {
    fontFamily: V2Font.black,
    fontSize: 13,
  },
  stepChipText: {
    flexShrink: 1,
    fontFamily: V2Font.extraBold,
    fontSize: 13.5,
    lineHeight: 13.5 * 1.25,
    color: V2Colors.text,
  },
  checkTitle: {
    fontFamily: V2Font.bold,
    fontSize: 13.5,
    color: V2Colors.textSecondary,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  checkText: {
    fontFamily: V2Font.extraBold,
    fontSize: 14,
    lineHeight: 14 * 1.25,
    color: V2Colors.text,
  },
  checkAction: {
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  splitParts: {
    flexDirection: 'row',
    gap: 8,
  },
  splitPart: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  splitText: {
    fontFamily: V2Font.extraBold,
    fontSize: 15,
    color: V2Colors.text,
  },
  coinRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  coin: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  listRowGold: {
    borderColor: 'rgba(255,194,75,0.32)',
    backgroundColor: 'rgba(255,194,75,0.08)',
  },
  equation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  operator: {
    width: 13,
    fontFamily: V2Font.black,
    fontSize: 18,
    color: V2Colors.textSecondary,
  },
  block: {
    alignItems: 'center',
    gap: 4,
  },
  blockValue: {
    fontFamily: V2Font.black,
    fontSize: 22,
    lineHeight: 22 * 1.25,
    color: V2Colors.text,
  },
  blockCaption: {
    fontFamily: V2Font.medium,
    fontSize: 12,
    color: V2Colors.textSecondary,
  },
  questionText: {
    flex: 1,
    fontFamily: V2Font.extraBold,
    fontSize: 14.5,
    lineHeight: 14.5 * 1.25,
    color: V2Colors.text,
  },
  quoteLabel: {
    fontFamily: V2Font.semiBold,
    fontSize: 14,
    color: V2Colors.textSecondary,
  },
  option: {
    flex: 1,
    gap: 6,
  },
  optionLabel: {
    fontFamily: V2Font.bold,
    fontSize: 12,
    color: V2Colors.textSecondary,
  },
  optionValue: {
    fontFamily: V2Font.black,
    fontSize: 24,
    lineHeight: 24 * 1.25,
    color: V2Colors.text,
  },
  balanceTexts: {
    gap: 4,
  },
  balanceAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
});
