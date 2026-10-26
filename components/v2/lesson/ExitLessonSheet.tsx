import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { V2Colors, V2Font } from '@/constants/theme-v2';
import { Button3D } from '../Button3D';
import { V2Sheet } from '../V2Sheet';

interface ExitLessonSheetProps {
  visible: boolean;
  /** "Continuar a lição", o X e o toque fora. */
  onStay: () => void;
  onLeave: () => void;
}

/**
 * Sair no meio da lição (Figma 35i): o progresso fica salvo e a lição volta
 * de onde parou.
 */
function ExitLessonSheetView({ visible, onStay, onLeave }: ExitLessonSheetProps) {
  return (
    <V2Sheet visible={visible} onClose={onStay} icon="logout" title="Sair da lição?">
      <View style={styles.body}>
        <Text style={styles.text}>
          Seu progresso fica salvo. Você continua de onde parou quando voltar.
        </Text>
        <View style={styles.actions}>
          <Button3D label="Continuar a lição" onPress={onStay} />
          <Button3D label="Sair" variant="glass" onPress={onLeave} />
        </View>
      </View>
    </V2Sheet>
  );
}

export const ExitLessonSheet = memo(ExitLessonSheetView);

const styles = StyleSheet.create({
  body: {
    gap: 14,
  },
  text: {
    fontFamily: V2Font.medium,
    fontSize: 14,
    lineHeight: 14 * 1.45,
    color: V2Colors.textSecondary,
  },
  actions: {
    gap: 10,
  },
});
