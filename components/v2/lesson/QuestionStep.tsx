import { memo, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { V2Colors, V2Font, V2Radius, blendOver } from '@/constants/theme-v2';
import { useAccent } from '@/hooks/use-accent';
import { hasApiErrorCode } from '@/lib/api/errors';
import type { LearningAnswerResult, LearningQuestionStep } from '@/lib/api/learning';
import { Button3D } from '../Button3D';
import { V2Icon } from '../V2Icon';
import { QuestionSituation } from './QuestionSituation';
import {
  LessonEyebrow,
  LessonLink,
  LessonStepBody,
  LessonTitle,
  ValuesExampleChip,
} from './LessonText';

/** Retorno sobre o fundo do sheet: verde no acerto, vidro no erro (35e e 35h). */
const SUCCESS_PANEL = blendOver(V2Colors.success, 0.1, V2Colors.sheetBase);
const RETRY_PANEL = blendOver('#ffffff', 0.05, V2Colors.sheetBase);

type OptionState = 'idle' | 'selected' | 'correct' | 'wrong' | 'dimmed';

interface Verdict {
  optionKey: string;
  correct: boolean;
  feedback: string;
}

/** Acerto já feito nesta abertura da lição: a pergunta volta respondida. */
export interface AnsweredQuestion {
  optionKey: string;
  feedback: string;
}

interface QuestionStepProps {
  /** Título da lição, acima do título da pergunta. */
  lessonTitle: string;
  step: LearningQuestionStep;
  pro: boolean;
  /** Envia a alternativa escolhida; gabarito e retorno vêm do backend. */
  onAnswer: (optionKey: string) => Promise<LearningAnswerResult>;
  /** "Continuar" depois do acerto. */
  onContinue: () => void;
  /** "Rever explicação": abre a tela que a pergunta checa. */
  onReview: (() => void) | null;
  /** O texto mudou com a pergunta aberta (409) e ela voltou na versão nova. */
  updated: boolean;
  /** Voltando ("Voltar") a uma pergunta já acertada: mostra o acerto. */
  answered?: AnsweredQuestion;
}

/**
 * Pergunta da lição (Figma 35c a 35e e 35h): situação, pergunta e
 * alternativas, uma por linha. "Verificar" só habilita com uma escolhida. O
 * retorno sobe por cima das alternativas: "Isso!" no acerto, "Vamos ver um
 * exemplo?" no erro, que não tira XP e libera nova tentativa.
 */
function QuestionStepView({
  lessonTitle,
  step,
  pro,
  onAnswer,
  onContinue,
  onReview,
  updated,
  answered,
}: QuestionStepProps) {
  const question = step.content;
  const [selected, setSelected] = useState<string | null>(answered?.optionKey ?? null);
  const [verdict, setVerdict] = useState<Verdict | null>(() =>
    answered ? { ...answered, correct: true } : null,
  );
  const [checking, setChecking] = useState(false);
  const [failed, setFailed] = useState(false);

  async function verify() {
    if (!selected || checking) return;
    setChecking(true);
    setFailed(false);
    try {
      const result = await onAnswer(selected);
      setVerdict({ optionKey: selected, correct: result.correct, feedback: result.feedback });
      AccessibilityInfo.announceForAccessibility(
        `${result.correct ? 'Isso!' : 'Vamos ver um exemplo?'} ${result.feedback}`,
      );
    } catch (error) {
      // 409: quem abriu a lição recarrega a pergunta na versão nova e avisa.
      if (!hasApiErrorCode(error, 'LEARNING_CONTENT_VERSION_STALE')) setFailed(true);
    } finally {
      setChecking(false);
    }
  }

  function retry() {
    setVerdict(null);
    setSelected(null);
  }

  function optionState(optionKey: string): OptionState {
    if (verdict) {
      if (verdict.optionKey !== optionKey) return 'dimmed';
      return verdict.correct ? 'correct' : 'wrong';
    }
    return selected === optionKey ? 'selected' : 'idle';
  }

  const extra = pro ? question.situation?.proSuccessAddition : undefined;

  return (
    <LessonStepBody
      actions={
        verdict ? null : (
          <>
            {failed ? (
              <View style={styles.failure} accessibilityLiveRegion="polite">
                <V2Icon name="alert" size={14} color={V2Colors.error} />
                <Text style={styles.failureText}>
                  Não foi possível verificar. Confira sua conexão e tente de novo.
                </Text>
              </View>
            ) : null}
            <Button3D
              label="Verificar"
              onPress={verify}
              disabled={!selected}
              loading={checking}
            />
          </>
        )
      }
      overlay={
        verdict ? (
          verdict.correct ? (
            <SuccessPanel feedback={verdict.feedback} extra={extra} onContinue={onContinue} />
          ) : (
            <RetryPanel feedback={verdict.feedback} onRetry={retry} onReview={onReview} />
          )
        ) : null
      }
    >
      <LessonEyebrow>{lessonTitle}</LessonEyebrow>
      {question.title ? <LessonTitle compact>{question.title}</LessonTitle> : null}
      {updated ? <UpdatedNotice /> : null}
      {question.situation?.valuesExample ? <ValuesExampleChip /> : null}
      {question.situation ? (
        <QuestionSituation questionKey={question.key} situation={question.situation} />
      ) : null}
      <Text style={styles.prompt}>{question.prompt}</Text>
      <View style={styles.options} accessibilityRole="radiogroup">
        {question.options.map((option, index) => (
          <OptionRow
            key={option.key}
            letter={String.fromCharCode(65 + index)}
            text={option.text}
            state={optionState(option.key)}
            disabled={!!verdict || checking}
            onPress={() => {
              setSelected(option.key);
              setFailed(false);
            }}
          />
        ))}
      </View>
    </LessonStepBody>
  );
}

export const QuestionStep = memo(QuestionStepView);

/** Uma alternativa (Figma "alternativa A"): letra no círculo e texto. */
function OptionRow({
  letter,
  text,
  state,
  disabled,
  onPress,
}: {
  letter: string;
  text: string;
  state: OptionState;
  disabled: boolean;
  onPress: () => void;
}) {
  const accent = useAccent();
  const marked = state === 'selected' || state === 'correct' || state === 'wrong';
  const tone =
    state === 'correct'
      ? { fill: V2Colors.success, tint: 'rgba(61,224,138,0.12)' }
      : state === 'wrong'
        ? { fill: V2Colors.error, tint: 'rgba(255,90,127,0.1)' }
        : { fill: accent.base, tint: accent.alpha(0.14) };
  const verdictLabel = state === 'correct' ? ', resposta certa' : state === 'wrong' ? ', resposta errada' : '';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.option,
        marked ? { borderWidth: 2, borderColor: tone.fill, backgroundColor: tone.tint } : styles.optionIdle,
        state === 'dimmed' && styles.dimmed,
      ]}
      accessibilityRole="radio"
      accessibilityLabel={`Alternativa ${letter}: ${text}${verdictLabel}`}
      accessibilityState={{ checked: marked, disabled }}
    >
      <View style={[styles.letter, { backgroundColor: marked ? tone.fill : V2Colors.chip }]}>
        {state === 'correct' ? (
          <V2Icon name="check" size={15} color={V2Colors.background} />
        ) : state === 'wrong' ? (
          <V2Icon name="x" size={15} color={V2Colors.onPrimary} />
        ) : (
          <Text style={[styles.letterText, { color: marked ? V2Colors.onPrimary : V2Colors.textSecondary }]}>
            {letter}
          </Text>
        )}
      </View>
      <Text style={[styles.optionText, marked && styles.optionTextMarked]}>{text}</Text>
    </Pressable>
  );
}

/**
 * Acerto (35e): "Isso!", a conta em destaque quando o retorno começa por ela
 * ("10 × R$6 = R$60.") e "Continuar". No Pro, o complemento do acerto.
 */
function SuccessPanel({
  feedback,
  extra,
  onContinue,
}: {
  feedback: string;
  extra: string | undefined;
  onContinue: () => void;
}) {
  const { formula, text } = splitFormula(feedback);
  return (
    <Animated.View
      entering={FadeInDown.duration(240)}
      style={[styles.panel, styles.successPanel]}
      accessibilityLiveRegion="polite"
    >
      <View style={styles.panelTitle}>
        <View style={[styles.seal, styles.successSeal]}>
          <V2Icon name="check" size={18} color={V2Colors.success} />
        </View>
        <Text style={[styles.panelHeading, { color: V2Colors.success }]}>Isso!</Text>
      </View>
      {formula ? (
        <View style={styles.formula}>
          <Text style={styles.formulaText}>{formula}</Text>
        </View>
      ) : null}
      <Text style={styles.panelText}>{extra ? `${text} ${extra}` : text}</Text>
      <Button3D label="Continuar" onPress={onContinue} />
    </Animated.View>
  );
}

/** Erro (35h): um exemplo curto, "Tentar de novo" e "Rever explicação". */
function RetryPanel({
  feedback,
  onRetry,
  onReview,
}: {
  feedback: string;
  onRetry: () => void;
  onReview: (() => void) | null;
}) {
  const accent = useAccent();
  return (
    <Animated.View
      entering={FadeInDown.duration(240)}
      style={[styles.panel, styles.retryPanel]}
      accessibilityLiveRegion="polite"
    >
      <View style={styles.panelTitle}>
        <View
          style={[styles.seal, { backgroundColor: accent.alpha(0.14), borderColor: accent.alpha(0.32) }]}
        >
          <V2Icon name="book" size={18} color={accent.light} />
        </View>
        <Text style={styles.panelHeading}>Vamos ver um exemplo?</Text>
      </View>
      <Text style={styles.panelText}>{feedback}</Text>
      <View style={styles.retryActions}>
        <Button3D label="Tentar de novo" onPress={onRetry} />
        {onReview ? <LessonLink label="Rever explicação" onPress={onReview} /> : null}
      </View>
    </Animated.View>
  );
}

/** Aviso do 409 (35c): a pergunta voltou na versão nova do texto. */
function UpdatedNotice() {
  return (
    <View style={styles.updated} accessibilityLiveRegion="polite">
      <V2Icon name="info" size={13} color={V2Colors.textSecondary} />
      <Text style={styles.updatedText}>Este conteúdo foi atualizado</Text>
    </View>
  );
}

/** "10 × R$6 = R$60. A quantidade..." → a conta e o resto do retorno. */
function splitFormula(feedback: string): { formula: string | null; text: string } {
  const end = feedback.indexOf('. ');
  if (end < 0) return { formula: null, text: feedback };
  const first = feedback.slice(0, end);
  return first.includes('=')
    ? { formula: first, text: feedback.slice(end + 2) }
    : { formula: null, text: feedback };
}

const styles = StyleSheet.create({
  prompt: {
    fontFamily: V2Font.extraBold,
    fontSize: 17,
    lineHeight: 17 * 1.35,
    color: V2Colors.text,
  },
  options: {
    gap: 10,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 14,
    paddingRight: 16,
    paddingVertical: 13,
    borderRadius: 18,
  },
  optionIdle: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  dimmed: {
    opacity: 0.45,
  },
  letter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterText: {
    fontFamily: V2Font.extraBold,
    fontSize: 12.5,
  },
  optionText: {
    flex: 1,
    fontFamily: V2Font.semiBold,
    fontSize: 15,
    lineHeight: 15 * 1.35,
    color: 'rgba(255,255,255,0.9)',
  },
  optionTextMarked: {
    color: V2Colors.text,
  },
  failure: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  failureText: {
    flex: 1,
    fontFamily: V2Font.medium,
    fontSize: 13,
    color: V2Colors.textSecondary,
  },
  updated: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 10,
    paddingRight: 12,
    paddingVertical: 6,
    borderRadius: V2Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  updatedText: {
    fontFamily: V2Font.bold,
    fontSize: 12,
    color: V2Colors.textSecondary,
  },
  // Painel fixo embaixo do corpo, por cima das alternativas (35e e 35h).
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 22,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 16,
  },
  successPanel: {
    backgroundColor: SUCCESS_PANEL,
    borderColor: 'rgba(61,224,138,0.28)',
  },
  retryPanel: {
    backgroundColor: RETRY_PANEL,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  panelTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  seal: {
    width: 36,
    height: 36,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successSeal: {
    backgroundColor: 'rgba(61,224,138,0.14)',
    borderColor: 'rgba(61,224,138,0.32)',
  },
  panelHeading: {
    flexShrink: 1,
    fontFamily: V2Font.black,
    fontSize: 20,
    color: V2Colors.text,
  },
  formula: {
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  formulaText: {
    fontFamily: V2Font.black,
    fontSize: 20,
    color: V2Colors.text,
  },
  panelText: {
    fontFamily: V2Font.medium,
    fontSize: 14.5,
    lineHeight: 14.5 * 1.4,
    color: 'rgba(255,255,255,0.9)',
  },
  retryActions: {
    alignItems: 'center',
    gap: 8,
  },
});
