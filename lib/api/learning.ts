import { apiClient } from './client';
import type { ExperienceLevel, ExperienceTier } from './experience';

// Trilha "Introdução ao PigFi": cinco lições (M1 a M5) em passos curtos. O
// conteúdo, o progresso e o XP vêm do backend; o gabarito nunca sai de lá.

/** Vocabulário que o backend já aplicou aos títulos, pelo modo da pessoa. */
export type PresentationMode = 'LITE' | 'PRO';

/** Termos técnicos do Pro. Só vem no Pro (no Lite é null). */
export interface ProVocabulary {
  dollarDigital: string;
  euroDigital: string;
  cryptocurrency: string;
  piggyBank: string;
  network: string;
  annualRate: string;
  exchange: string;
  withdrawal: string;
  pixRamp: string;
}

/** Tipo editorial do item (enum do backend). */
export type LearningContentType =
  | 'INTRODUCTION'
  | 'EXPLANATION'
  | 'EXAMPLE'
  | 'REFLECTION'
  | 'PRACTICE'
  | 'GLOSSARY';

// ─── Boas-vindas e dicionário (GET /learning/content) ───────────────────────

interface StandaloneItemBase {
  key: string;
  contentVersion: number;
  title: string | null;
  displayOrder: number;
}

/** Boas-vindas do módulo (35o), antes da primeira tela. */
export interface LearningWelcomeItem extends StandaloneItemBase {
  type: 'INTRODUCTION';
  content: { text: string };
}

export interface GlossaryEntry {
  term: string;
  explanation: string;
}

/** Dicionário (34k): as palavras do Lite e, no Pro, as a mais. */
export interface LearningGlossaryItem extends StandaloneItemBase {
  type: 'GLOSSARY';
  content: { lite: GlossaryEntry[]; proAdditional: GlossaryEntry[] };
}

export type LearningStandaloneItem = LearningWelcomeItem | LearningGlossaryItem;

export interface LearningContent {
  presentationMode: PresentationMode;
  proVocabulary: ProVocabulary | null;
  /** XP de concluir as cinco lições. */
  introModuleCompletionXp: number;
  items: LearningStandaloneItem[];
}

// ─── Lições (GET /learning/modules) ─────────────────────────────────────────

export interface LearningModuleSummary {
  /** 'M1' a 'M5'. */
  key: string;
  /** Já no vocabulário do modo: no Pro, o proTitle quando existe. */
  title: string;
  liteTitle: string;
  proTitle: string | null;
  description: string | null;
  displayOrder: number;
  contentVersion: number;
  /** XP de concluir a lição. */
  completionXp: number;
  presentationMode: PresentationMode;
  questionCount: number;
  completedAt: string | null;
  /** Último passo salvo (tela ou pergunta), para retomar. */
  lastContentItemKey: string | null;
}

// ─── Lição completa (GET /learning/modules/:moduleKey) ──────────────────────

/** Uma tela da lição. Campos de anotação interna do conteúdo ficam de fora. */
export interface LearningScreenContent {
  guide: string;
  /** Descrição do visual para o design; o desenho vem do Figma. */
  visual: string;
  explanation: string;
  /** Termo apresentado nesta tela (chip "Termo novo"). */
  newTerm?: string;
  /** Mostra o chip "Valores de exemplo". */
  valuesExample?: boolean;
  /** Complemento do Pro. Vem também no Lite; o app só mostra no Pro. */
  proAddition?: string;
}

/** Reflexão opcional, sem XP. */
export interface LearningReflectionContent {
  text: string;
  response: string;
}

interface LearningItemBase {
  key: string;
  type: LearningContentType;
  contentVersion: number;
  title: string | null;
  displayOrder: number;
  isRequired: boolean;
}

export interface LearningScreenItem extends LearningItemBase {
  content: LearningScreenContent;
}

export interface LearningReflectionItem extends LearningItemBase {
  content: LearningReflectionContent;
}

/** Situação da pergunta: em linha (`text`) ou em cartão (`card`, ex.: Antes/Agora). */
export interface LearningQuestionSituation {
  text?: string;
  card?: string[];
  valuesExample: boolean;
  /** Complemento do retorno de acerto, só no Pro. */
  proSuccessAddition?: string;
}

export interface LearningQuestionOption {
  key: string;
  text: string;
  displayOrder: number;
}

export interface LearningQuestionProgress {
  attempts: number;
  firstCorrectAt: string | null;
  lastAnsweredAt: string | null;
}

export interface LearningQuestion {
  key: string;
  /** Vai na resposta: se o texto mudou no meio, o backend recusa (409). */
  contentVersion: number;
  title: string | null;
  situation: LearningQuestionSituation | null;
  prompt: string;
  reviewContentItemKey: string | null;
  isRequired: boolean;
  displayOrder: number;
  options: LearningQuestionOption[];
  /** null enquanto a pessoa não respondeu. */
  progress: LearningQuestionProgress | null;
}

export interface LearningScreenStep {
  type: 'screen';
  key: string;
  displayOrder: number;
  content: LearningScreenItem;
}

export interface LearningReflectionStep {
  type: 'reflection';
  key: string;
  displayOrder: number;
  content: LearningReflectionItem;
}

export interface LearningQuestionStep {
  type: 'question';
  key: string;
  displayOrder: number;
  /** A tela que a pergunta checa ("Rever explicação"). */
  reviewScreenKey: string | null;
  content: LearningQuestion;
}

export type LearningStep = LearningScreenStep | LearningReflectionStep | LearningQuestionStep;

export interface LearningModuleProgress {
  startedAt: string;
  completedAt: string | null;
  lastContentItemKey: string | null;
}

export interface LearningModule {
  key: string;
  title: string;
  liteTitle: string;
  proTitle: string | null;
  description: string | null;
  displayOrder: number;
  contentVersion: number;
  completionXp: number;
  presentationMode: PresentationMode;
  proVocabulary: ProVocabulary | null;
  /** Telas, perguntas e reflexão, já na ordem de exibição. */
  steps: LearningStep[];
  /** null antes do primeiro passo salvo ou respondido. */
  progress: LearningModuleProgress | null;
}

// ─── Progresso e respostas ──────────────────────────────────────────────────

export interface LearningResume {
  /** Chave da lição ('M3'). */
  moduleId: string;
  /** null quando a lição começou por uma resposta, sem passo salvo. */
  stepKey: string | null;
}

/** GET /learning/progress. */
export interface LearningProgress {
  profile: ExperienceLevel;
  modules: LearningModuleSummary[];
  completedQuestionIds: string[];
  resume: LearningResume | null;
}

/** PATCH /learning/modules/:moduleKey/progress. */
export interface SavedLearningStep {
  lastContentItemKey: string | null;
  startedAt: string;
  completedAt: string | null;
}

export interface LearningAnswerBody {
  optionId: string;
  /** A versão que a tela mostrou (LearningQuestion.contentVersion). */
  contentVersion: number;
}

/** Retorno da resposta: tudo de que a conclusão precisa. */
export interface LearningAnswerResult {
  correct: boolean;
  /** Retorno de acerto ou de nova tentativa. */
  feedback: string;
  firstCorrect: boolean;
  /** A lição concluiu nesta resposta. */
  lessonCompleted: boolean;
  /** As cinco lições concluíram nesta resposta. */
  moduleCompleted: boolean;
  xpAwarded: number;
  lessonXpAwarded: number;
  introModuleXpAwarded: number;
  totalXp: number;
  levelBefore: number;
  levelAfter: number;
  tierAfter: ExperienceTier;
  progress: { correctRequired: number; required: number };
  profile: ExperienceLevel;
  /** Liberações permanentes conquistadas nesta resposta (ex.: ['EURC']). */
  newUnlocks: string[];
}

export const getLearningContent = async (): Promise<LearningContent> => {
  const { data } = await apiClient.get('/learning/content');
  return data;
};

export const getLearningModules = async (): Promise<LearningModuleSummary[]> => {
  const { data } = await apiClient.get('/learning/modules');
  return data;
};

export const getLearningModule = async (moduleKey: string): Promise<LearningModule> => {
  const { data } = await apiClient.get(`/learning/modules/${moduleKey}`);
  return data;
};

export const getLearningProgress = async (): Promise<LearningProgress> => {
  const { data } = await apiClient.get('/learning/progress');
  return data;
};

/** Salva o passo atual (tela ou pergunta) para retomar em outro aparelho. */
export const saveLearningStep = async (
  moduleKey: string,
  contentItemKey: string,
): Promise<SavedLearningStep> => {
  const { data } = await apiClient.patch(`/learning/modules/${moduleKey}/progress`, {
    contentItemKey,
  });
  return data;
};

export const answerLearningQuestion = async (
  questionKey: string,
  body: LearningAnswerBody,
): Promise<LearningAnswerResult> => {
  const { data } = await apiClient.post(`/learning/questions/${questionKey}/answer`, body);
  return data;
};
