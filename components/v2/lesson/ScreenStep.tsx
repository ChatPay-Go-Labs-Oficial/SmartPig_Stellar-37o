import { memo, type ReactNode } from 'react';
import type { LearningScreenItem } from '@/lib/api/learning';
import { Button3D } from '../Button3D';
import {
  LessonBody,
  LessonEyebrow,
  LessonLink,
  LessonStepBody,
  LessonTitle,
  NewTermChip,
  ValuesExampleChip,
} from './LessonText';

interface ScreenStepProps {
  /** Título da lição, acima do título da tela. */
  lessonTitle: string;
  item: LearningScreenItem;
  pro: boolean;
  /** Desenho da tela, do registro por chave (visuals/). */
  visual: ReactNode;
  onContinue: () => void;
  /** "Voltar" ao passo anterior; sem ele (primeiro passo), o link some. */
  onBack?: () => void;
}

/**
 * Tela da lição (Figma 35a, 35b e 35m): guia, visual e explicação. O chip
 * "Valores de exemplo" vem antes do visual; o "Termo novo", no fim, com o
 * termo em destaque no texto. O complemento do Pro fecha a explicação.
 */
function ScreenStepView({ lessonTitle, item, pro, visual, onContinue, onBack }: ScreenStepProps) {
  const { guide, explanation, newTerm, valuesExample, proAddition } = item.content;
  const text = pro && proAddition ? `${explanation} ${proAddition}` : explanation;

  return (
    <LessonStepBody
      actions={
        <>
          <Button3D label="Continuar" onPress={onContinue} />
          {onBack ? <LessonLink label="Voltar" onPress={onBack} /> : null}
        </>
      }
    >
      <LessonEyebrow>{lessonTitle}</LessonEyebrow>
      {item.title ? <LessonTitle>{item.title}</LessonTitle> : null}
      <LessonBody text={guide} />
      {valuesExample ? <ValuesExampleChip /> : null}
      {visual}
      {/* O termo novo em destaque na explicação, quando ela o cita (35b; a L5-T02 não). */}
      <LessonBody text={text} highlight={newTerm} />
      {newTerm ? <NewTermChip term={newTerm} /> : null}
    </LessonStepBody>
  );
}

export const ScreenStep = memo(ScreenStepView);
