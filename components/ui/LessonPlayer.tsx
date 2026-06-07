import { useState, useEffect } from 'react';
import { useSound } from '@/hooks/use-sound';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {
  Accent,
  Colors,
  Font,
  FontSize,
  Gradients,
  Radius,
  Spacing,
} from '@/constants/theme';
import type { TrilhaLesson, TrilhaQuestion } from '@/constants/trilha';

// ─── Match question colors ────────────────────────────────────────────────────
const MATCH_CORRECT = { border: Accent.success, bg: 'hsla(145, 80%, 48%, 0.12)' };
const MATCH_WRONG   = { border: 'hsl(0, 85%, 55%)', bg: 'hsla(0, 85%, 55%, 0.12)' };

// ─── Types ───────────────────────────────────────────────────────────────────
type Phase = 'intro' | 'question' | 'feedback' | 'complete';

interface LessonPlayerProps {
  lesson: TrilhaLesson;
  onComplete: (xp: number) => void;
  onClose: () => void;
}

// ─── Main component ───────────────────────────────────────────────────────────
export function LessonPlayer({ lesson, onComplete, onClose }: LessonPlayerProps) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [isCorrect, setIsCorrect] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const { playEvolucaoPersonagem } = useSound();

  useEffect(() => {
    if (phase === 'complete') playEvolucaoPersonagem();
  }, [phase]);

  const totalQuestions = lesson.questions.length;
  const progressPct =
    phase === 'intro' ? 0
    : phase === 'complete' ? 1
    : (questionIndex + (phase === 'feedback' ? 1 : 0)) / totalQuestions;

  const handleQuestionDone = (correct: boolean, feedback: string) => {
    setIsCorrect(correct);
    setFeedbackText(feedback);
    setPhase('feedback');
  };

  const handleContinue = () => {
    if (questionIndex + 1 < totalQuestions) {
      setQuestionIndex((i) => i + 1);
      setPhase('question');
    } else {
      setPhase('complete');
    }
  };

  return (
    <Modal visible transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.screen}>

        {/* ── Top bar ── */}
        <View style={styles.topBar}>
          <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
            <MaterialIcons name="close" size={20} color={Colors.mutedForeground} />
          </Pressable>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPct * 100}%` }]} />
          </View>
          <View style={styles.xpBadge}>
            <MaterialIcons name="star" size={14} color={Accent.gold} />
            <Text style={styles.xpText}>{lesson.xp} XP</Text>
          </View>
        </View>

        {/* ── Content ── */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {phase === 'intro' && (
            <IntroPhase lesson={lesson} onStart={() => setPhase('question')} />
          )}

          {(phase === 'question') && (
            <QuestionPhase
              key={`q-${questionIndex}`}
              question={lesson.questions[questionIndex]}
              index={questionIndex}
              total={totalQuestions}
              onDone={handleQuestionDone}
            />
          )}

          {phase === 'feedback' && (
            <FeedbackPhase
              isCorrect={isCorrect}
              text={feedbackText}
              onContinue={handleContinue}
              isLast={questionIndex + 1 >= totalQuestions}
            />
          )}

          {phase === 'complete' && (
            <CompletePhase lesson={lesson} onDone={() => onComplete(lesson.xp)} />
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Intro phase ──────────────────────────────────────────────────────────────
function IntroPhase({ lesson, onStart }: { lesson: TrilhaLesson; onStart: () => void }) {
  return (
    <View style={styles.phaseContainer}>
      <LinearGradient colors={Gradients.primary as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.introBigIcon}>
        <MaterialIcons name={lesson.icon as any} size={48} color="#fff" />
      </LinearGradient>

      <View style={styles.introMeta}>
        <Text style={styles.lessonLabel}>Lição {lesson.id} de 5</Text>
        <Text style={styles.lessonTitle}>{lesson.title}</Text>
        <Text style={styles.lessonSubtitle}>{lesson.subtitle}</Text>
      </View>

      <View style={styles.introCard}>
        <Text style={styles.introText}>{lesson.intro}</Text>
      </View>

      <View style={styles.introStats}>
        <View style={styles.statChip}>
          <MaterialIcons name="star" size={14} color={Accent.gold} />
          <Text style={styles.statText}>{lesson.xp} XP</Text>
        </View>
        <View style={styles.statChip}>
          <MaterialIcons name="schedule" size={14} color={Colors.mutedForeground} />
          <Text style={styles.statText}>{lesson.duration}</Text>
        </View>
        <View style={styles.statChip}>
          <MaterialIcons name="quiz" size={14} color={Colors.mutedForeground} />
          <Text style={styles.statText}>{lesson.questions.length} questões</Text>
        </View>
      </View>

      <Pressable onPress={onStart} style={{ alignSelf: 'stretch' }}>
        <LinearGradient colors={Gradients.primary as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.actionBtn}>
          <Text style={styles.actionBtnText}>Começar lição</Text>
          <MaterialIcons name="arrow-forward" size={18} color="#fff" />
        </LinearGradient>
      </Pressable>
    </View>
  );
}

// ─── Question dispatcher ──────────────────────────────────────────────────────
function QuestionPhase({
  question,
  index,
  total,
  onDone,
}: {
  question: TrilhaQuestion;
  index: number;
  total: number;
  onDone: (correct: boolean, feedback: string) => void;
}) {
  return (
    <View style={styles.phaseContainer}>
      <View style={styles.questionHeader}>
        <Text style={styles.questionCounter}>Questão {index + 1} de {total}</Text>
        <View style={styles.questionDots}>
          {Array.from({ length: total }).map((_, i) => (
            <View
              key={i}
              style={[styles.questionDot, i <= index && styles.questionDotActive]}
            />
          ))}
        </View>
      </View>

      {question.type === 'mc' && <MCQuestion question={question} onDone={onDone} />}
      {question.type === 'tf' && <TFQuestion question={question} onDone={onDone} />}
      {question.type === 'match' && <MatchQuestion question={question} onDone={onDone} />}
      {question.type === 'order' && <OrderQuestion question={question} onDone={onDone} />}
    </View>
  );
}

// ─── Multiple choice ──────────────────────────────────────────────────────────
function MCQuestion({
  question,
  onDone,
}: {
  question: Extract<TrilhaQuestion, { type: 'mc' }>;
  onDone: (correct: boolean, feedback: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const { playClick, playInvestirConfirmacao, playQuestaoErrada } = useSound();

  const handleSelect = (id: string) => {
    playClick();
    setSelected(id);
  };

  const handleConfirm = () => {
    if (!selected) return;
    const correct = selected === question.correctId;
    if (correct) playInvestirConfirmacao(); else playQuestaoErrada();
    onDone(correct, correct ? question.feedbackCorrect : question.feedbackWrong);
  };

  return (
    <>
      <View style={styles.questionCard}>
        <MaterialIcons name="help-outline" size={20} color={Accent.primary} />
        <Text style={styles.questionText}>{question.question}</Text>
      </View>

      <View style={styles.optionsList}>
        {question.options.map((opt) => {
          const isSelected = selected === opt.id;
          return (
            <Pressable key={opt.id} onPress={() => handleSelect(opt.id)}>
              <View style={[styles.optionRow, isSelected && styles.optionRowSelected]}>
                <View style={[styles.optionBullet, isSelected && styles.optionBulletSelected]}>
                  <Text style={[styles.optionBulletText, isSelected && styles.optionBulletTextSelected]}>
                    {opt.id.toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                  {opt.text}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <Pressable onPress={handleConfirm} disabled={!selected} style={{ alignSelf: 'stretch' }}>
        <LinearGradient
          colors={Gradients.primary as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.actionBtn, !selected && styles.actionBtnDisabled]}
        >
          <Text style={styles.actionBtnText}>Confirmar</Text>
        </LinearGradient>
      </Pressable>
    </>
  );
}

// ─── True / False ─────────────────────────────────────────────────────────────
function TFQuestion({
  question,
  onDone,
}: {
  question: Extract<TrilhaQuestion, { type: 'tf' }>;
  onDone: (correct: boolean, feedback: string) => void;
}) {
  const { playClick, playInvestirConfirmacao, playQuestaoErrada } = useSound();

  const handleTap = (answer: boolean) => {
    const correct = answer === question.correct;
    playClick();
    if (correct) playInvestirConfirmacao(); else playQuestaoErrada();
    onDone(correct, question.feedback);
  };

  return (
    <>
      <View style={styles.questionCard}>
        <MaterialIcons name="help-outline" size={20} color={Accent.primary} />
        <Text style={styles.questionText}>Verdadeiro ou Falso?</Text>
      </View>

      <View style={styles.tfStatement}>
        <Text style={styles.tfStatementText}>{question.statement}</Text>
      </View>

      <View style={styles.tfButtons}>
        <Pressable onPress={() => handleTap(true)} style={{ flex: 1 }}>
          <LinearGradient
            colors={Gradients.primary as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.tfBtn}
          >
            <MaterialIcons name="check" size={24} color="#fff" />
            <Text style={styles.tfBtnText}>Verdadeiro</Text>
          </LinearGradient>
        </Pressable>
        <Pressable onPress={() => handleTap(false)} style={{ flex: 1 }}>
          <LinearGradient
            colors={['hsl(220, 90%, 58%)', 'hsl(270, 80%, 60%)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.tfBtn}
          >
            <MaterialIcons name="close" size={24} color="#fff" />
            <Text style={styles.tfBtnText}>Falso</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </>
  );
}

// ─── Match ────────────────────────────────────────────────────────────────────
function MatchQuestion({
  question,
  onDone,
}: {
  question: Extract<TrilhaQuestion, { type: 'match' }>;
  onDone: (correct: boolean, feedback: string) => void;
}) {
  const { pairs } = question;
  const [shuffledRight] = useState(() =>
    [...pairs.map((p) => ({ id: p.rightId, text: p.right }))].sort(() => Math.random() - 0.5)
  );
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [connections, setConnections] = useState<Record<string, string>>({});
  const { playClick, playInvestirConfirmacao, playQuestaoErrada } = useSound();

  const isLeftCorrect = (leftId: string) =>
    connections[leftId] === pairs.find((p) => p.leftId === leftId)?.rightId;

  const getLeftStyle = (leftId: string) => {
    if (!connections[leftId]) return null;
    return isLeftCorrect(leftId) ? MATCH_CORRECT : MATCH_WRONG;
  };

  const getRightStyle = (rightId: string) => {
    const leftId = Object.keys(connections).find((l) => connections[l] === rightId);
    if (!leftId) return null;
    return isLeftCorrect(leftId) ? MATCH_CORRECT : MATCH_WRONG;
  };

  const handleLeftTap = (leftId: string) => {
    setSelectedLeft(leftId === selectedLeft ? null : leftId);
  };

  const handleRightTap = (rightId: string) => {
    if (!selectedLeft) return;
    const existingLeft = Object.keys(connections).find((l) => connections[l] === rightId);
    const next = { ...connections };
    if (existingLeft) delete next[existingLeft];
    next[selectedLeft] = rightId;
    setConnections(next);
    setSelectedLeft(null);
    playClick();
  };

  const allConnected = pairs.every((p) => connections[p.leftId]);
  const allCorrect = pairs.every((p) => connections[p.leftId] === p.rightId);

  const handleContinue = () => {
    if (allCorrect) playInvestirConfirmacao(); else playQuestaoErrada();
    onDone(allCorrect, allCorrect ? question.feedbackCorrect : question.feedbackWrong);
  };

  return (
    <>
      <View style={styles.questionCard}>
        <MaterialIcons name="swap-horiz" size={20} color={Accent.primary} />
        <Text style={styles.questionText}>{question.instruction}</Text>
      </View>

      <Text style={styles.matchHint}>
        Toque em um conceito, depois na definição correta.
      </Text>

      <View style={styles.matchColumns}>
        {/* Left column */}
        <View style={styles.matchCol}>
          {pairs.map((p) => {
            const s = getLeftStyle(p.leftId);
            const isSelected = selectedLeft === p.leftId;
            return (
              <Pressable key={p.leftId} onPress={() => handleLeftTap(p.leftId)}>
                <View
                  style={[
                    styles.matchCell,
                    styles.matchCellLeft,
                    isSelected && { borderColor: Accent.primary, borderWidth: 2, backgroundColor: 'rgba(244,52,180,0.12)' },
                    s && !isSelected && { borderColor: s.border, backgroundColor: s.bg },
                  ]}
                >
                  <Text style={[styles.matchCellText, s && !isSelected && { color: s.border }]}>{p.left}</Text>
                  {s && !isSelected && <View style={[styles.matchDot, { backgroundColor: s.border }]} />}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Right column */}
        <View style={styles.matchCol}>
          {shuffledRight.map((r) => {
            const s = getRightStyle(r.id);
            return (
              <Pressable key={r.id} onPress={() => handleRightTap(r.id)}>
                <View
                  style={[
                    styles.matchCell,
                    s && { borderColor: s.border, backgroundColor: s.bg },
                  ]}
                >
                  {s && <View style={[styles.matchDot, { backgroundColor: s.border }]} />}
                  <Text style={[styles.matchCellText, s && { color: s.border }]}>{r.text}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      {allConnected && (
        <Pressable onPress={handleContinue} style={{ alignSelf: 'stretch' }}>
          <LinearGradient
            colors={allCorrect ? [Accent.success, 'hsl(145, 70%, 38%)'] : ['hsl(0, 85%, 55%)', 'hsl(0, 75%, 42%)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.actionBtn}
          >
            <MaterialIcons name={allCorrect ? 'check-circle' : 'close'} size={18} color="#fff" />
            <Text style={styles.actionBtnText}>{allCorrect ? 'Continuar' : 'Ver resultado'}</Text>
          </LinearGradient>
        </Pressable>
      )}
    </>
  );
}

// ─── Order ────────────────────────────────────────────────────────────────────
function OrderQuestion({
  question,
  onDone,
}: {
  question: Extract<TrilhaQuestion, { type: 'order' }>;
  onDone: (correct: boolean, feedback: string) => void;
}) {
  const [orderedItems, setOrderedItems] = useState(() =>
    [...question.items].sort(() => Math.random() - 0.5)
  );
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const { playClick, playInvestirConfirmacao, playQuestaoErrada } = useSound();

  const handleTap = (index: number) => {
    if (selectedIndex === null) {
      playClick();
      setSelectedIndex(index);
    } else if (selectedIndex === index) {
      setSelectedIndex(null);
    } else {
      const next = [...orderedItems];
      [next[selectedIndex], next[index]] = [next[index], next[selectedIndex]];
      setOrderedItems(next);
      setSelectedIndex(null);
      playClick();
    }
  };

  const handleConfirm = () => {
    const correct = orderedItems.every((item, i) => item.id === question.correctOrder[i]);
    if (correct) playInvestirConfirmacao(); else playQuestaoErrada();
    onDone(correct, correct ? question.feedbackCorrect : question.feedbackWrong);
  };

  return (
    <>
      <View style={styles.questionCard}>
        <MaterialIcons name="format-list-numbered" size={20} color={Accent.primary} />
        <Text style={styles.questionText}>{question.instruction}</Text>
      </View>

      <Text style={styles.matchHint}>
        Toque em dois itens para trocar de posição.
      </Text>

      <View style={styles.orderList}>
        {orderedItems.map((item, i) => {
          const isSelected = selectedIndex === i;
          return (
            <Pressable key={item.id} onPress={() => handleTap(i)}>
              <View style={[styles.orderRow, isSelected && styles.orderRowSelected]}>
                <View style={[styles.orderNum, isSelected && styles.orderNumSelected]}>
                  <Text style={[styles.orderNumText, isSelected && styles.orderNumTextSelected]}>{i + 1}</Text>
                </View>
                <Text style={[styles.orderText, isSelected && styles.orderTextSelected]}>
                  {item.text}
                </Text>
                {isSelected && (
                  <MaterialIcons name="open-with" size={16} color={Accent.primary} />
                )}
              </View>
            </Pressable>
          );
        })}
      </View>

      <Pressable onPress={handleConfirm} style={{ alignSelf: 'stretch' }}>
        <LinearGradient colors={Gradients.primary as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.actionBtn}>
          <Text style={styles.actionBtnText}>Confirmar ordem</Text>
        </LinearGradient>
      </Pressable>
    </>
  );
}

// ─── Feedback phase ───────────────────────────────────────────────────────────
function FeedbackPhase({
  isCorrect,
  text,
  onContinue,
  isLast,
}: {
  isCorrect: boolean;
  text: string;
  onContinue: () => void;
  isLast: boolean;
}) {
  return (
    <View style={styles.phaseContainer}>
      <View style={[styles.feedbackIcon, isCorrect ? styles.feedbackIconCorrect : styles.feedbackIconWrong]}>
        <MaterialIcons name={isCorrect ? 'check' : 'close'} size={48} color="#fff" />
      </View>

      <Text style={[styles.feedbackTitle, isCorrect ? styles.feedbackTitleCorrect : styles.feedbackTitleWrong]}>
        {isCorrect ? 'Correto!' : 'Quase...'}
      </Text>

      <View style={[styles.feedbackCard, isCorrect ? styles.feedbackCardCorrect : styles.feedbackCardWrong]}>
        <Text style={styles.feedbackText}>{text}</Text>
      </View>

      <Pressable onPress={onContinue} style={{ alignSelf: 'stretch' }}>
        <LinearGradient
          colors={isCorrect ? Gradients.primary as any : ['hsl(260,20%,25%)', 'hsl(260,20%,20%)'] as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.actionBtn}
        >
          <Text style={styles.actionBtnText}>{isLast ? 'Ver resultado' : 'Continuar'}</Text>
          <MaterialIcons name="arrow-forward" size={18} color="#fff" />
        </LinearGradient>
      </Pressable>
    </View>
  );
}

// ─── Complete phase ───────────────────────────────────────────────────────────
function CompletePhase({ lesson, onDone }: { lesson: TrilhaLesson; onDone: () => void }) {
  return (
    <View style={styles.phaseContainer}>
      <LinearGradient colors={Gradients.primary as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.completeBadge}>
        <MaterialIcons name="emoji-events" size={48} color="#fff" />
      </LinearGradient>

      <Text style={styles.completeXp}>+{lesson.xp} XP</Text>
      <Text style={styles.completeTitle}>Lição concluída!</Text>
      <Text style={styles.completeMessage}>{lesson.completionMessage}</Text>

      {lesson.id === 5 && (
        <View style={styles.finalBadge}>
          <MaterialIcons name="workspace-premium" size={20} color={Accent.gold} />
          <Text style={styles.finalBadgeText}>Badge desbloqueado: Porquinho Iniciante</Text>
        </View>
      )}

      <Pressable onPress={onDone} style={{ alignSelf: 'stretch' }}>
        <LinearGradient colors={Gradients.primary as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.actionBtn}>
          <Text style={styles.actionBtnText}>{lesson.id < 5 ? 'Próxima lição' : 'Concluir trilha'}</Text>
          <MaterialIcons name={lesson.id < 5 ? 'arrow-forward' : 'check'} size={18} color="#fff" />
        </LinearGradient>
      </Pressable>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[4],
    gap: 12,
    backgroundColor: Colors.background,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.muted,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: Accent.primary,
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.muted,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexShrink: 0,
  },
  xpText: {
    fontSize: FontSize.label,
    fontFamily: Font.black,
    color: Colors.foreground,
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing[6],
    paddingTop: Spacing[6],
    paddingBottom: 120,
    gap: Spacing[4],
    flexGrow: 1,
  },

  // Phase container
  phaseContainer: {
    flex: 1,
    gap: Spacing[4],
    alignItems: 'center',
  },

  // Intro
  introBigIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  introMeta: {
    alignItems: 'center',
    gap: 4,
  },
  lessonLabel: {
    fontSize: FontSize.label,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
  },
  lessonTitle: {
    fontSize: FontSize.heading,
    fontFamily: Font.black,
    color: Colors.foreground,
    textAlign: 'center',
  },
  lessonSubtitle: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
  },
  introCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[4],
    alignSelf: 'stretch',
  },
  introText: {
    fontSize: FontSize.body,
    fontFamily: Font.semiBold,
    color: Colors.foreground,
    lineHeight: 26,
  },
  introStats: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.muted,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statText: {
    fontSize: FontSize.label,
    fontFamily: Font.bold,
    color: Colors.mutedForeground,
  },

  // Question header
  questionHeader: {
    alignSelf: 'stretch',
    gap: 8,
  },
  questionCounter: {
    fontSize: FontSize.label,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
  },
  questionDots: {
    flexDirection: 'row',
    gap: 6,
  },
  questionDot: {
    width: 28,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.muted,
  },
  questionDotActive: {
    backgroundColor: Accent.primary,
  },

  // Question card
  questionCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[4],
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  questionText: {
    flex: 1,
    fontSize: FontSize.body,
    fontFamily: Font.black,
    color: Colors.foreground,
    lineHeight: 24,
  },

  // MC options
  optionsList: {
    alignSelf: 'stretch',
    gap: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
  },
  optionRowSelected: {
    borderColor: Accent.primary,
    backgroundColor: 'rgba(244,52,180,0.1)',
  },
  optionBullet: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  optionBulletSelected: {
    backgroundColor: Accent.primary,
  },
  optionBulletText: {
    fontSize: FontSize.label,
    fontFamily: Font.black,
    color: Colors.mutedForeground,
  },
  optionBulletTextSelected: {
    color: '#fff',
  },
  optionText: {
    flex: 1,
    fontSize: FontSize.bodySmall,
    fontFamily: Font.semiBold,
    color: Colors.foreground,
    lineHeight: 20,
  },
  optionTextSelected: {
    color: Accent.primary,
    fontFamily: Font.bold,
  },

  // T/F
  tfStatement: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[6],
    alignSelf: 'stretch',
  },
  tfStatementText: {
    fontSize: FontSize.subheading,
    fontFamily: Font.bold,
    color: Colors.foreground,
    textAlign: 'center',
    lineHeight: 28,
  },
  tfButtons: {
    flexDirection: 'row',
    gap: 12,
    alignSelf: 'stretch',
  },
  tfBtn: {
    height: 64,
    borderRadius: Radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  tfBtnText: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.black,
    color: '#fff',
  },

  // Match
  matchHint: {
    fontSize: FontSize.label,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
    textAlign: 'center',
    alignSelf: 'stretch',
  },
  matchColumns: {
    flexDirection: 'row',
    gap: 10,
    alignSelf: 'stretch',
  },
  matchCol: {
    flex: 1,
    gap: 8,
  },
  matchCell: {
    backgroundColor: Colors.card,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 10,
    minHeight: 52,
    justifyContent: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  matchCellLeft: {},
  matchCellText: {
    flex: 1,
    fontSize: FontSize.label,
    fontFamily: Font.bold,
    color: Colors.foreground,
    lineHeight: 18,
  },
  matchDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },

  // Order
  orderList: {
    alignSelf: 'stretch',
    gap: 8,
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
  },
  orderRowSelected: {
    borderColor: Accent.primary,
    backgroundColor: 'rgba(244,52,180,0.1)',
  },
  orderNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  orderNumSelected: {
    backgroundColor: Accent.primary,
  },
  orderNumText: {
    fontSize: FontSize.label,
    fontFamily: Font.black,
    color: Colors.mutedForeground,
  },
  orderNumTextSelected: {
    color: '#fff',
  },
  orderText: {
    flex: 1,
    fontSize: FontSize.bodySmall,
    fontFamily: Font.semiBold,
    color: Colors.foreground,
    lineHeight: 20,
  },
  orderTextSelected: {
    color: Accent.primary,
  },

  // Feedback
  feedbackIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing[8],
  },
  feedbackIconCorrect: {
    backgroundColor: Accent.success,
  },
  feedbackIconWrong: {
    backgroundColor: Accent.destructive,
  },
  feedbackTitle: {
    fontSize: FontSize.heading,
    fontFamily: Font.black,
  },
  feedbackTitleCorrect: {
    color: Accent.success,
  },
  feedbackTitleWrong: {
    color: Accent.destructive,
  },
  feedbackCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing[4],
    alignSelf: 'stretch',
  },
  feedbackCardCorrect: {
    backgroundColor: 'rgba(72,207,120,0.1)',
    borderColor: 'rgba(72,207,120,0.3)',
  },
  feedbackCardWrong: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderColor: 'rgba(239,68,68,0.3)',
  },
  feedbackText: {
    fontSize: FontSize.body,
    fontFamily: Font.semiBold,
    color: Colors.foreground,
    lineHeight: 24,
    textAlign: 'center',
  },

  // Complete
  completeBadge: {
    width: 112,
    height: 112,
    borderRadius: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing[8],
  },
  completeXp: {
    fontSize: 42,
    fontFamily: Font.black,
    color: Accent.primary,
    letterSpacing: -1,
  },
  completeTitle: {
    fontSize: FontSize.heading,
    fontFamily: Font.black,
    color: Colors.foreground,
  },
  completeMessage: {
    fontSize: FontSize.body,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 24,
  },
  finalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,196,0,0.12)',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing[4],
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,196,0,0.3)',
  },
  finalBadgeText: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.black,
    color: Accent.gold,
  },

  // Shared
  actionBtn: {
    height: 54,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  actionBtnDisabled: {
    opacity: 0.35,
  },
  actionBtnText: {
    fontSize: FontSize.body,
    fontFamily: Font.black,
    color: '#fff',
  },
});
