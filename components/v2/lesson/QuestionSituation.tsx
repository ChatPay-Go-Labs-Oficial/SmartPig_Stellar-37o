import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { V2Colors, V2Font } from '@/constants/theme-v2';
import { useAccent } from '@/hooks/use-accent';
import type { LearningQuestionSituation } from '@/lib/api/learning';
import { AssetIcon } from '../AssetIcon';
import { V2Icon } from '../V2Icon';
import { SITUATIONS, parseCardLine, type SituationMark, type SituationSpec } from './situations';

interface QuestionSituationProps {
  questionKey: string;
  situation: LearningQuestionSituation;
}

/**
 * Situação da pergunta (Figma "situação"): em linha, com o ícone ou as moedas
 * antes do texto (L1-Q01), ou em cartão de linhas (35c, L1-Q06, L5-Q03).
 */
function QuestionSituationView({ questionKey, situation }: QuestionSituationProps) {
  const spec = SITUATIONS[questionKey];
  if (__DEV__ && !spec) console.warn(`[lição] Pergunta ${questionKey} sem situação no registro`);

  if (situation.card?.length) {
    return <SituationCard spec={spec?.kind === 'card' ? spec : { kind: 'card', layout: 'triple' }} lines={situation.card} />;
  }
  if (situation.text) {
    return <SituationInline marks={spec?.kind === 'inline' ? spec.marks : []} text={situation.text} />;
  }
  return null;
}

export const QuestionSituation = memo(QuestionSituationView);

function SituationInline({ marks, text }: { marks: readonly SituationMark[]; text: string }) {
  const accent = useAccent();
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        {marks.map((mark) =>
          'icon' in mark ? (
            <V2Icon key={mark.icon} name={mark.icon} size={20} color={accent.light} />
          ) : (
            <AssetIcon key={mark.asset} asset={mark.asset} size={22} round />
          ),
        )}
        <Text style={styles.topText}>{text}</Text>
      </View>
    </View>
  );
}

function SituationCard({
  spec,
  lines,
}: {
  spec: Extract<SituationSpec, { kind: 'card' }>;
  lines: readonly string[];
}) {
  const accent = useAccent();
  return (
    <View style={styles.card}>
      {lines.map((line) => {
        const parsed = parseCardLine(line);
        if (parsed.kind === 'header') {
          return (
            <View key={line} style={styles.topRow}>
              {spec.header ? <AssetIcon asset={spec.header} size={22} round /> : null}
              <Text style={styles.topText}>{parsed.text}</Text>
            </View>
          );
        }
        const highlighted = parsed.label === spec.highlight;
        const strong = highlighted || parsed.label === spec.emphasize;
        return (
          <View key={line} style={[styles.row, highlighted && { backgroundColor: accent.alpha(0.14) }]}>
            <Text
              style={[
                styles.label,
                spec.layout === 'triple' && styles.labelColumn,
                { color: highlighted ? accent.light : V2Colors.textTertiary },
              ]}
            >
              {parsed.label}
            </Text>
            {spec.layout === 'pair' ? (
              <Text style={[styles.total, { color: strong ? V2Colors.text : V2Colors.textSecondary }]}>
                {parsed.value}
              </Text>
            ) : (
              <>
                <Text style={styles.value}>{parsed.value}</Text>
                {parsed.total ? (
                  <Text style={[styles.total, { color: strong ? V2Colors.text : V2Colors.textSecondary }]}>
                    {parsed.total}
                  </Text>
                ) : null}
              </>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    overflow: 'hidden',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 14,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  topText: {
    flex: 1,
    fontFamily: V2Font.extraBold,
    fontSize: 15,
    color: V2Colors.text,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  label: {
    fontFamily: V2Font.bold,
    fontSize: 13,
  },
  // Figma: coluna de 54. Mínimo, não fixo: com a fonte do aparelho maior, o
  // rótulo cresce em vez de quebrar.
  labelColumn: {
    minWidth: 54,
  },
  value: {
    flex: 1,
    fontFamily: V2Font.semiBold,
    fontSize: 14,
    color: V2Colors.textSecondary,
  },
  total: {
    fontFamily: V2Font.extraBold,
    fontSize: 15,
  },
});
