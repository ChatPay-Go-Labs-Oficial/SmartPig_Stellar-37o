import { StyleSheet, Text, View } from 'react-native';
import { V2Colors, V2Font } from '@/constants/theme-v2';
import { useTerms } from '@/hooks/use-terms';
import { Button3D, V2Sheet } from '@/components/v2';

interface SwapSoonSheetProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Troca ainda não disponível. Mesmo sheet do Figma 17f (troca bloqueada), mas
 * sem requisitos de nível: a troca ainda não existe para ninguém.
 */
export function SwapSoonSheet({ visible, onClose }: SwapSoonSheetProps) {
  const { t } = useTerms();
  return (
    <V2Sheet visible={visible} onClose={onClose} title={t('carteira.swap.title')} icon="refresh-cw">
      <View style={styles.body}>
        <Text style={styles.text}>{t('carteira.swap.soon')}</Text>
        <View style={styles.soonChip}>
          <Text style={styles.soonText}>Em breve</Text>
        </View>
        <Button3D label="Entendi" onPress={onClose} />
      </View>
    </V2Sheet>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: 14,
  },
  text: {
    fontFamily: V2Font.medium,
    fontSize: 14,
    lineHeight: 21,
    color: V2Colors.textSecondary,
  },
  soonChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: V2Colors.chip,
  },
  soonText: {
    fontFamily: V2Font.extraBold,
    fontSize: 12,
    color: V2Colors.textSecondary,
  },
});
