import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { IconSymbol } from './icon-symbol';
import { Colors, Spacing } from '@/constants/theme';
import { PressableScale } from './PressableScale';
import { ConfirmModal } from './ConfirmModal';

interface OnboardingStepHeaderProps {
  /** Volta pro passo anterior do fluxo (preenchido), sem sair do cadastro. */
  onBack: () => void;
}

/**
 * Cabeçalho dos passos de KYC com dois controles distintos: voltar um passo
 * (corrige um dado já preenchido sem perder o resto do progresso) e fechar
 * (sai do cadastro de fato, com confirmação — o rascunho fica salvo mesmo assim).
 */
export function OnboardingStepHeader({ onBack }: OnboardingStepHeaderProps) {
  const [confirmingExit, setConfirmingExit] = useState(false);

  return (
    <View style={styles.row}>
      <PressableScale onPress={onBack} hitSlop={8}>
        <View style={styles.circleBtn}>
          <IconSymbol
            name="chevron.right"
            size={24}
            color={Colors.foreground}
            style={{ transform: [{ rotate: '180deg' }] }}
          />
        </View>
      </PressableScale>

      <PressableScale onPress={() => setConfirmingExit(true)} hitSlop={8}>
        <View style={styles.circleBtn}>
          <MaterialIcons name="close" size={20} color={Colors.foreground} />
        </View>
      </PressableScale>

      <ConfirmModal
        visible={confirmingExit}
        title="Sair do cadastro?"
        description="Seu progresso fica salvo — quando voltar, você continua de onde parou."
        confirmLabel="Sair"
        cancelLabel="Continuar preenchendo"
        variant="destructive"
        onConfirm={() => {
          setConfirmingExit(false);
          router.replace('/(tabs)' as any);
        }}
        onCancel={() => setConfirmingExit(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing[6],
  },
  circleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface2,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
