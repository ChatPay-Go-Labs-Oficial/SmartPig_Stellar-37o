import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { V2Colors, V2Font } from '@/constants/theme-v2';
import { useAccent } from '@/hooks/use-accent';
import { Button3D } from '../Button3D';
import { LessonBody, LessonEyebrow, LessonStepBody, LessonTitle } from './LessonText';

interface WelcomeStepProps {
  /** Título do módulo ("Introdução ao PigFi"). */
  moduleTitle: string;
  /** Texto das boas-vindas, do backend. */
  text: string;
  /** As cinco lições, na ordem. */
  lessons: readonly { key: string; title: string }[];
  onStart: () => void;
}

/**
 * Boas-vindas do módulo (Figma 35o), uma vez, antes da L1-T01: o texto do
 * backend com a pergunta final como título ("Vamos por partes?") e as cinco
 * lições numeradas. "Começar" leva à primeira tela.
 */
function WelcomeStepView({ moduleTitle, text, lessons, onStart }: WelcomeStepProps) {
  const accent = useAccent();
  const { heading, body } = splitWelcome(text);

  return (
    <LessonStepBody actions={<Button3D label="Começar" onPress={onStart} />}>
      <LessonEyebrow>{moduleTitle}</LessonEyebrow>
      {heading ? <LessonTitle>{heading}</LessonTitle> : null}
      <LessonBody text={body} />
      <View style={styles.card} accessibilityRole="list">
        {lessons.map((lesson, index) => (
          <View key={lesson.key} style={styles.row} accessibilityLabel={`Lição ${index + 1}: ${lesson.title}`}>
            <View
              style={[styles.number, { backgroundColor: accent.alpha(0.14), borderColor: accent.alpha(0.32) }]}
            >
              <Text style={[styles.numberText, { color: accent.light }]}>{index + 1}</Text>
            </View>
            <Text style={styles.title}>{lesson.title}</Text>
          </View>
        ))}
      </View>
    </LessonStepBody>
  );
}

export const WelcomeStep = memo(WelcomeStepView);

/**
 * O 35o mostra a última frase do texto, quando é uma pergunta, como título
 * acima do parágrafo (ponto 32 do plano). Sem pergunta no fim, o texto todo
 * fica no parágrafo.
 */
function splitWelcome(text: string): { heading: string | null; body: string } {
  const match = text.trim().match(/^([\s\S]*[.!])\s+([^.!?]+\?)$/);
  return match ? { heading: match[2], body: match[1] } : { heading: null, body: text };
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  number: {
    width: 28,
    height: 28,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    fontFamily: V2Font.black,
    fontSize: 13,
  },
  title: {
    flex: 1,
    fontFamily: V2Font.extraBold,
    fontSize: 14.5,
    lineHeight: 14.5 * 1.25,
    color: V2Colors.text,
  },
});
