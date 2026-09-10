import { StyleSheet, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Accent, Colors, Font, FontSize, Spacing } from '@/constants/theme';

const STEPS = ['Verificação', 'O que acontece', 'Confirmar'] as const;

interface DeletionStepperProps {
  step: 1 | 2 | 3;
}

/**
 * Os três passos ficam visíveis o tempo todo: num fluxo irreversível o usuário
 * precisa ver o caminho inteiro antes de entrar nele, não só quanto falta.
 */
export function DeletionStepper({ step }: DeletionStepperProps) {
  return (
    <View style={styles.container}>
      {STEPS.map((label, index) => {
        const position = index + 1;
        const isDone = position < step;
        const isCurrent = position === step;
        const isLast = position === STEPS.length;

        return (
          <View key={label} style={styles.item}>
            <View style={styles.trackRow}>
              <View
                style={[
                  styles.dot,
                  isDone && styles.dotDone,
                  isCurrent && styles.dotCurrent,
                ]}
              >
                {isDone && (
                  <MaterialIcons name="check" size={10} color="#fff" />
                )}
              </View>
              {!isLast && (
                <View style={[styles.line, isDone && styles.lineDone]} />
              )}
            </View>

            <Text
              style={[styles.label, isCurrent && styles.labelCurrent]}
              numberOfLines={2}
            >
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const DOT = 16;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginBottom: Spacing[4],
  },
  item: {
    flex: 1,
    gap: 6,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  dotDone: {
    borderColor: Accent.destructive,
    backgroundColor: Accent.destructive,
  },
  dotCurrent: {
    borderColor: Accent.destructive,
    backgroundColor: 'rgba(239,68,68,0.25)',
  },
  line: {
    flex: 1,
    height: 2,
    borderRadius: 1,
    backgroundColor: Colors.border,
  },
  lineDone: {
    backgroundColor: Accent.destructive,
  },
  label: {
    paddingRight: Spacing[2],
    fontSize: FontSize.label,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
  },
  labelCurrent: {
    fontFamily: Font.black,
    color: Accent.destructive,
  },
});
