import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { BackHandler, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import type { AssetLogoId } from '@/components/v2';
import {
  ExitLessonSheet,
  LessonComplete,
  LessonSheet,
  LessonState,
  QuestionStep,
  ReflectionStep,
  ScreenStep,
  WelcomeStep,
  screenVisual,
  type AnsweredQuestion,
  type LessonUnlock,
} from '@/components/v2/lesson';
import { TRAIL_MILESTONES, lessonIcon } from '@/constants/learning-trail';
import { hasApiErrorCode } from '@/lib/api/errors';
import type {
  LearningAnswerResult,
  LearningQuestionStep,
  LearningStep,
  LearningWelcomeItem,
} from '@/lib/api/learning';
import { useExperienceProfile } from '@/lib/queries/experience.queries';
import {
  useAnswerLearningQuestion,
  useLearningContent,
  useLearningModule,
  useLearningModules,
  useSaveLearningStep,
} from '@/lib/queries/learning.queries';
import { useVaults } from '@/lib/queries/vaults.queries';
import { useLevelUpStore } from '@/lib/stores/level-up.store';
import { usePiggyUnlockStore } from '@/lib/stores/piggy-unlock.store';

type Phase = 'welcome' | 'steps' | 'complete';

/** Tela aberta para rever ("Rever explicação" ou opção da reflexão) e o passo de volta. */
interface Review {
  screenKey: string;
  returnTo: string;
}

/**
 * Lição da Trilha (Figma "Trilha · Lição", 35a a 35p), por cima das abas.
 *
 * - Abre no passo salvo; sem passo, no primeiro. Na primeira lição, antes de
 *   qualquer passo, as boas-vindas do módulo (35o).
 * - Um passo por tela, na ordem de `steps`. Cada passo é salvo ao abrir, sem
 *   travar a lição: se falhar, o próximo salva de novo.
 * - A lição só conclui com as perguntas acertadas; o backend diz quando, com
 *   o XP e as liberações, que a conclusão mostra depois da reflexão.
 * - Concluir nunca troca, guarda nem escolhe porquinho: os botões só navegam.
 */
export default function LessonScreen() {
  const { moduleKey = '' } = useLocalSearchParams<{ moduleKey: string }>();
  const lesson = useLearningModule(moduleKey);
  const content = useLearningContent();
  const modules = useLearningModules();
  const experience = useExperienceProfile();
  const vaults = useVaults();
  const celebrateLevel = useLevelUpStore((s) => s.celebrate);
  const celebrateUnlock = usePiggyUnlockStore((s) => s.celebrate);
  const { mutate: saveStep } = useSaveLearningStep();
  const { mutateAsync: sendAnswer } = useAnswerLearningQuestion();

  const data = lesson.data;
  const pro = data?.presentationMode === 'PRO';
  const steps = useMemo(() => data?.steps ?? [], [data]);
  const completedBefore = !!data?.progress?.completedAt;
  const welcome = content.data?.items.find(
    (item): item is LearningWelcomeItem => item.type === 'INTRODUCTION',
  );
  // Boas-vindas uma vez: na primeira lição, enquanto nenhum passo foi salvo.
  const welcomeEligible = !!data && data.displayOrder === 1 && !data.progress;

  const [phase, setPhase] = useState<Phase | null>(null);
  const [stepKey, setStepKey] = useState<string | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [completion, setCompletion] = useState<LearningAnswerResult | null>(null);
  // Acertos desta abertura: a pergunta volta respondida se a pessoa voltar a ela.
  const [answered, setAnswered] = useState<Readonly<Record<string, AnsweredQuestion>>>({});
  const [updatedKey, setUpdatedKey] = useState<string | null>(null);
  const [exitOpen, setExitOpen] = useState(false);

  // Primeira leitura da lição: decide onde abrir. Lição já concluída abre do
  // começo (é uma revisão); com as boas-vindas, espera o texto delas. A cópia
  // em cache de uma abertura anterior fica velha depois das respostas: espera
  // a releitura para não abrir no passo ou na conclusão de antes.
  const refreshing = lesson.isFetching;
  useEffect(() => {
    if (phase || !data || refreshing) return;
    if (welcomeEligible && content.isPending) return;
    const saved = completedBefore ? null : data.progress?.lastContentItemKey;
    setStepKey(steps.find((step) => step.key === saved)?.key ?? steps[0]?.key ?? null);
    setPhase(welcomeEligible && welcome ? 'welcome' : 'steps');
  }, [completedBefore, content.isPending, data, phase, refreshing, steps, welcome, welcomeEligible]);

  // Retomada: o passo aberto vai para o backend. A tela aberta para rever não
  // conta como avanço.
  const reviewing = review !== null;
  useEffect(() => {
    if (phase !== 'steps' || !stepKey || reviewing) return;
    saveStep({ moduleKey, stepKey });
  }, [moduleKey, phase, reviewing, saveStep, stepKey]);

  const index = steps.findIndex((step) => step.key === stepKey);
  const step: LearningStep | undefined = steps[index];

  const isCorrect = useCallback(
    (item: LearningStep) =>
      item.type !== 'question' || item.key in answered || !!item.content.progress?.firstCorrectAt,
    [answered],
  );

  const goTo = useCallback((key: string) => {
    setStepKey(key);
    setUpdatedKey(null);
  }, []);

  // Fim dos passos: a conclusão, se todas as perguntas foram acertadas; senão,
  // a primeira que falta (ler as telas não conclui a lição).
  const finish = useCallback(() => {
    const pending = steps.find((item) => !isCorrect(item));
    if (pending && !completion && !completedBefore) goTo(pending.key);
    else setPhase('complete');
  }, [completedBefore, completion, goTo, isCorrect, steps]);

  const next = useCallback(() => {
    if (index >= 0 && index < steps.length - 1) goTo(steps[index + 1].key);
    else finish();
  }, [finish, goTo, index, steps]);

  const back = useCallback(() => {
    if (index > 0) goTo(steps[index - 1].key);
  }, [goTo, index, steps]);

  const answer = useCallback(
    async (question: LearningQuestionStep, optionKey: string) => {
      try {
        const result = await sendAnswer({
          moduleKey,
          questionKey: question.key,
          optionId: optionKey,
          contentVersion: question.content.contentVersion,
        });
        if (result.correct) {
          setAnswered((current) => ({
            ...current,
            [question.key]: { optionKey, feedback: result.feedback },
          }));
        }
        if (result.lessonCompleted) setCompletion(result);
        return result;
      } catch (error) {
        // A lição é relida (useAnswerLearningQuestion) e a pergunta volta com o aviso.
        if (hasApiErrorCode(error, 'LEARNING_CONTENT_VERSION_STALE')) setUpdatedKey(question.key);
        throw error;
      }
    },
    [moduleKey, sendAnswer],
  );

  const close = useCallback(() => router.back(), []);

  // No meio da lição, sair pede confirmação (35i); nas boas-vindas, na
  // conclusão e nos estados, fecha direto.
  const requestClose = useCallback(() => {
    if (phase === 'steps') setExitOpen(true);
    else close();
  }, [close, phase]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (phase !== 'steps') return false;
      if (review) setReview(null);
      else setExitOpen(true);
      return true;
    });
    return () => subscription.remove();
  }, [phase, review]);

  // Da lição (por cima das abas) para uma aba: dismissTo volta às abas que já
  // estão embaixo e troca de aba, sem abrir outra cópia delas. O porquinho
  // acabou de ser liberado: a aba Guardar abre nele, com a cena 11b por cima.
  const openPiggy = useCallback(
    (asset: AssetLogoId) => {
      const vault = vaults.data?.find((item) => item.assetSymbol.toUpperCase() === asset);
      router.dismissTo(
        vault ? { pathname: '/(tabs)/vaults', params: { vault: vault.id } } : '/(tabs)/vaults',
      );
      if (vault) celebrateUnlock(vault.id);
    },
    [celebrateUnlock, vaults.data],
  );

  const openLevel = useCallback(() => router.dismissTo('/learn/level'), []);

  // Quando a lição subiu o nível, "Voltar para a trilha" passa pela cena da
  // subida (35n → 37a): ela abre por cima e a lição fecha embaixo. O X, o card
  // do nível e o porquinho saem sem a cena, como no protótipo.
  const backToTrail = useCallback(() => {
    if (completion && completion.levelAfter > completion.levelBefore) {
      celebrateLevel(completion.profile);
    }
    close();
  }, [celebrateLevel, close, completion]);

  // Avanço: telas e perguntas; a reflexão e a conclusão enchem a barra.
  const required = steps.filter((item) => item.type !== 'reflection');
  const anchor = review?.returnTo ?? stepKey;
  const anchorStep = steps.find((item) => item.key === anchor);
  const progress =
    phase === 'complete' || anchorStep?.type === 'reflection'
      ? 1
      : required.length
        ? (required.findIndex((item) => item.key === anchor) + 1) / required.length
        : 0;

  let body: ReactNode;
  let sheetProgress: number | null = 0;
  let sheetXp: number | null = null;
  let bodyKey = phase ?? 'state';

  if (!data || !phase) {
    // Depois de um erro a consulta segue "com erro" enquanto tenta de novo.
    body = lesson.isError && !lesson.isFetching ? (
      <LessonState kind="error" onRetry={() => lesson.refetch()} />
    ) : (
      <LessonState kind="loading" />
    );
  } else if (phase === 'welcome' && welcome) {
    sheetProgress = null;
    body = (
      <WelcomeStep
        moduleTitle={welcome.title ?? data.title}
        text={welcome.content.text}
        lessons={[...(modules.data ?? [])].sort((a, b) => a.displayOrder - b.displayOrder)}
        onStart={() => setPhase('steps')}
      />
    );
  } else if (phase === 'complete') {
    sheetProgress = 1;
    body = (
      <LessonComplete
        icon={lessonIcon(data.key)}
        lessonXp={completion?.lessonXpAwarded ?? 0}
        moduleXp={completion?.introModuleXpAwarded ?? 0}
        level={completion?.profile ?? experience.data ?? null}
        unlocks={pro ? [] : unlocksOf(completion)}
        onBackToTrail={backToTrail}
        onOpenPiggy={openPiggy}
        onOpenLevel={openLevel}
      />
    );
  } else {
    sheetProgress = progress;
    sheetXp = completedBefore ? null : data.completionXp;
    const reviewed = review ? steps.find((item) => item.key === review.screenKey) : undefined;
    if (reviewed?.type === 'screen') {
      bodyKey = `review:${reviewed.key}`;
      body = (
        <ScreenStep
          lessonTitle={data.title}
          item={reviewed.content}
          pro={pro}
          visual={screenVisual(reviewed.key)}
          onContinue={() => setReview(null)}
        />
      );
    } else if (step?.type === 'screen') {
      bodyKey = step.key;
      body = (
        <ScreenStep
          lessonTitle={data.title}
          item={step.content}
          pro={pro}
          visual={screenVisual(step.key)}
          onContinue={next}
          onBack={index > 0 ? back : undefined}
        />
      );
    } else if (step?.type === 'question') {
      bodyKey = `${step.key}:${step.content.contentVersion}`;
      const reviewKey = step.reviewScreenKey;
      body = (
        <QuestionStep
          lessonTitle={data.title}
          step={step}
          pro={pro}
          onAnswer={(optionKey) => answer(step, optionKey)}
          onContinue={next}
          onReview={reviewKey ? () => setReview({ screenKey: reviewKey, returnTo: step.key }) : null}
          updated={updatedKey === step.key}
          answered={answered[step.key]}
        />
      );
    } else if (step?.type === 'reflection') {
      bodyKey = step.key;
      body = (
        <ReflectionStep
          step={step}
          onOpenScreen={(screenKey) => setReview({ screenKey, returnTo: step.key })}
          onContinue={next}
        />
      );
    } else {
      body = <LessonState kind="error" onRetry={() => lesson.refetch()} />;
    }
  }

  return (
    <>
      <LessonSheet onClose={requestClose} progress={sheetProgress} xp={sheetXp}>
        <Animated.View key={bodyKey} entering={FadeIn.duration(180)} style={styles.body}>
          {body}
        </Animated.View>
      </LessonSheet>
      <ExitLessonSheet
        visible={exitOpen}
        onStay={() => setExitOpen(false)}
        onLeave={() => {
          setExitOpen(false);
          close();
        }}
      />
    </>
  );
}

/** Porquinhos liberados nesta resposta, com o nome dos marcos da Trilha. */
function unlocksOf(result: LearningAnswerResult | null): LessonUnlock[] {
  if (!result) return [];
  return result.newUnlocks.flatMap((symbol) => {
    const milestone = TRAIL_MILESTONES.find((item) => item.asset === symbol.toUpperCase());
    return milestone ? [{ asset: milestone.asset, name: milestone.name }] : [];
  });
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
  },
});
