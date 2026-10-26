import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { V2Colors, V2Font } from '@/constants/theme-v2';
import { useAccent } from '@/hooks/use-accent';
import type { LearningReflectionStep } from '@/lib/api/learning';
import { Button3D } from '../Button3D';
import { V2Icon, type V2IconName } from '../V2Icon';
import { LessonBody, LessonEyebrow, LessonStepBody, LessonTitle } from './LessonText';

export interface ReflectionOption {
  label: string;
  icon: V2IconName;
  /** A tela que a opção abre para rever. */
  screenKey: string;
}

/**
 * Opções da reflexão que leva de volta às explicações (35f, L3-A01): cada
 * passo do caminho de volta a reais abre a tela que o explica.
 */
export const REFLECTION_OPTIONS: Readonly<Record<string, readonly ReflectionOption[]>> = {
  'L3-A01': [
    { label: 'Tirar do porquinho', icon: 'arrow-up', screenKey: 'L3-T05' },
    { label: 'Trocar a moeda', icon: 'refresh-cw', screenKey: 'L3-T03' },
    { label: 'Sacar pelo Pix', icon: 'pix', screenKey: 'L3-T06' },
  ],
};

interface ReflectionStepProps {
  step: LearningReflectionStep;
  /** Abre uma tela para rever e volta para a reflexão. */
  onOpenScreen: (screenKey: string) => void;
  onContinue: () => void;
}

/**
 * Reflexão opcional no fim da lição (Figma 35f): sem resposta certa e sem XP;
 * "Continuar" segue para a conclusão. A L3-A01 tem as opções que abrem as
 * explicações; as demais mostram o texto e o retorno do conteúdo.
 */
function ReflectionStepView({ step, onOpenScreen, onContinue }: ReflectionStepProps) {
  const accent = useAccent();
  const { text, response } = step.content.content;
  const options = REFLECTION_OPTIONS[step.key];

  return (
    <LessonStepBody actions={<Button3D label="Continuar" onPress={onContinue} />}>
      <LessonEyebrow muted>Para pensar · opcional</LessonEyebrow>
      {step.content.title ? <LessonTitle compact>{step.content.title}</LessonTitle> : null}
      {options ? (
        <>
          <Text style={styles.subtitle}>{response}</Text>
          <View style={styles.options}>
            {options.map((option) => (
              <Pressable
                key={option.screenKey}
                onPress={() => onOpenScreen(option.screenKey)}
                style={styles.option}
                accessibilityRole="button"
                accessibilityLabel={option.label}
                accessibilityHint="Abre a explicação"
              >
                <View
                  style={[styles.seal, { backgroundColor: accent.alpha(0.14), borderColor: accent.alpha(0.32) }]}
                >
                  <V2Icon name={option.icon} size={18} color={accent.light} />
                </View>
                <Text style={styles.optionLabel}>{option.label}</Text>
                <V2Icon name="chevron-right" size={18} color={V2Colors.textTertiary} />
              </Pressable>
            ))}
          </View>
        </>
      ) : (
        <>
          <LessonBody text={text} />
          <View style={styles.response}>
            <Text style={styles.responseText}>{response}</Text>
          </View>
        </>
      )}
    </LessonStepBody>
  );
}

export const ReflectionStep = memo(ReflectionStepView);

const styles = StyleSheet.create({
  subtitle: {
    fontFamily: V2Font.medium,
    fontSize: 15,
    color: V2Colors.textSecondary,
  },
  options: {
    gap: 10,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  seal: {
    width: 36,
    height: 36,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabel: {
    flex: 1,
    fontFamily: V2Font.bold,
    fontSize: 15,
    color: V2Colors.text,
  },
  response: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  responseText: {
    fontFamily: V2Font.medium,
    fontSize: 14.5,
    lineHeight: 14.5 * 1.4,
    color: 'rgba(255,255,255,0.9)',
  },
});
