import { useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Accent, Colors, Font, FontSize, Radius, Spacing } from '@/constants/theme';
import type { AnswerResult, LearningLesson } from '@/lib/api/learning';
import { useAnswerQuestion } from '@/lib/queries/learning.queries';

export function LearningLessonPlayer({ lesson, completedQuestionIds, onClose }: {
  lesson: LearningLesson; completedQuestionIds: string[]; onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [cardIndex, setCardIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [phase, setPhase] = useState<'cards' | 'questions' | 'complete'>('cards');
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [earned, setEarned] = useState(0);
  const busy = useRef(false);
  const answer = useAnswerQuestion();
  const question = lesson.questions[questionIndex];
  const card = lesson.cards[cardIndex];

  async function submit() {
    if (!selected || busy.current) return;
    busy.current = true;
    setError(null);
    try {
      const response = await answer.mutateAsync({ lessonId: lesson.id, questionId: question.id, optionId: selected, version: lesson.version });
      setResult(response);
      setEarned((value) => value + response.awardedPoints);
    } catch {
      setError('Não foi possível confirmar sua resposta. Tente novamente. Seus pontos já salvos continuam seguros.');
    } finally {
      busy.current = false;
    }
  }

  function next() {
    if (!result?.correct) {
      setResult(null);
      setSelected(null);
      return;
    }
    setResult(null);
    setSelected(null);
    if (questionIndex + 1 < lesson.questions.length) setQuestionIndex(questionIndex + 1);
    else setPhase('complete');
  }

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={[styles.screen, { paddingTop: insets.top + 12, paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          <Text style={styles.title}>{lesson.title}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Fechar lição" onPress={onClose} hitSlop={12}><Text style={styles.link}>Fechar</Text></Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          {phase === 'cards' && <>
            <Text style={styles.muted}>Aprenda primeiro · {cardIndex + 1} de {lesson.cards.length}</Text>
            <View style={styles.card}><Text style={styles.title}>{card.title}</Text><Text style={styles.body}>{card.content}</Text></View>
            <Pressable style={styles.button} onPress={() => cardIndex + 1 < lesson.cards.length ? setCardIndex(cardIndex + 1) : setPhase('questions')}><Text style={styles.buttonText}>{cardIndex + 1 < lesson.cards.length ? 'Próximo card' : 'Responder perguntas'}</Text></Pressable>
          </>}
          {phase === 'questions' && <>
            <Text style={styles.muted}>Pergunta {questionIndex + 1} de {lesson.questions.length} · {question.points} pontos por acerto</Text>
            {completedQuestionIds.includes(question.id) && <Text style={styles.muted}>Você já ganhou os pontos desta pergunta. Pode revisar à vontade.</Text>}
            <Text style={styles.title}>{question.question}</Text>
            {question.options.map((option) => <Pressable key={option.id} accessibilityRole="radio" accessibilityState={{ checked: selected === option.id, disabled: answer.isPending || !!result }} disabled={answer.isPending || !!result} onPress={() => setSelected(option.id)} style={[styles.option, selected === option.id && styles.selected]}><Text style={styles.body}>{option.text}</Text></Pressable>)}
            {error && <Text accessibilityRole="alert" style={styles.body}>{error}</Text>}
            {result ? <>
              <View style={styles.card}><Text style={styles.title}>{result.correct ? (result.awardedPoints ? `Acertou! +${result.awardedPoints} pontos` : 'Acertou! Pontos já registrados') : 'Vamos revisar'}</Text><Text style={styles.body}>{result.explanation}</Text></View>
              <Pressable style={styles.button} onPress={next}><Text style={styles.buttonText}>{result.correct ? 'Continuar' : 'Tentar novamente'}</Text></Pressable>
            </> : <Pressable disabled={!selected || answer.isPending} style={[styles.button, (!selected || answer.isPending) && styles.disabled]} onPress={submit}>{answer.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Confirmar resposta</Text>}</Pressable>}
          </>}
          {phase === 'complete' && <View style={styles.card}><Text style={styles.title}>Lição concluída!</Text><Text style={styles.body}>{earned > 0 ? `Você ganhou ${earned} pontos nesta revisão. Seu progresso foi salvo.` : 'Revisão concluída. Os pontos desta lição já estão salvos.'}</Text><Pressable style={styles.button} onPress={onClose}><Text style={styles.buttonText}>Voltar para a trilha</Text></Pressable></View>}
        </ScrollView>
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: { padding: Spacing[6], flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  content: { padding: Spacing[6], gap: Spacing[4], paddingBottom: 40 },
  title: { fontFamily: Font.extraBold, fontSize: FontSize.subheading, color: Colors.foreground, flexShrink: 1 },
  body: { fontFamily: Font.regular, fontSize: FontSize.body, lineHeight: 25, color: Colors.foreground },
  muted: { fontFamily: Font.semiBold, fontSize: FontSize.bodySmall, color: Colors.mutedForeground },
  link: { fontFamily: Font.bold, color: Accent.primary },
  card: { borderRadius: Radius.lg, padding: Spacing[6], gap: 16, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  option: { borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing[4] },
  selected: { borderColor: Accent.primary, backgroundColor: Colors.card },
  button: { backgroundColor: Accent.primary, borderRadius: Radius.md, padding: Spacing[4], alignItems: 'center' },
  buttonText: { color: '#fff', fontFamily: Font.bold, fontSize: FontSize.body },
  disabled: { opacity: 0.5 },
});
