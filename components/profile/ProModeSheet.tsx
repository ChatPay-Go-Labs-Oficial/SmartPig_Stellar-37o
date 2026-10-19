import { StyleSheet, Text, View } from 'react-native';
import { Button3D, SheetLink, V2Sheet } from '@/components/v2';
import { V2Colors, V2Font } from '@/constants/theme-v2';
import { useAccent } from '@/hooks/use-accent';

const PRO_ITEMS = [
  'O endereço completo da sua conta na rede',
  'O comprovante de cada transação',
  'Envio direto para outra conta, sem passar pelo Pix',
  'Números com precisão completa, e termos como APY e cotas',
  'Todas as moedas e a troca de moedas, sem esperar a liberação',
];

interface ProModeSheetProps {
  visible: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/** Pergunta antes de ligar o modo Pro pela primeira vez (Figma 26k). */
export function ProModeSheet({ visible, onConfirm, onClose }: ProModeSheetProps) {
  const accent = useAccent();
  return (
    <V2Sheet visible={visible} onClose={onClose} title="Ativar o modo Pro?">
      <View style={styles.body}>
        <Text style={styles.intro}>
          O modo Pro mostra a engrenagem por trás do PigFi. Você passa a ver:
        </Text>
        <View style={styles.list}>
          {PRO_ITEMS.map((item) => (
            <View key={item} style={styles.item}>
              {/* Figma "alinha": ponto do tema na altura da primeira linha. */}
              <View style={styles.bulletSlot}>
                <View style={[styles.bullet, { backgroundColor: accent.base }]} />
              </View>
              <Text style={styles.itemText}>{item}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.footnote}>
          Nada muda no seu dinheiro nem na sua conta, só no que aparece e no que fica
          disponível. Você pode voltar para o modo simples quando quiser, aqui no Perfil.
        </Text>
        <View style={styles.actions}>
          <Button3D label="Ativar modo Pro" onPress={onConfirm} />
          <SheetLink label="Agora não" onPress={onClose} />
        </View>
      </View>
    </V2Sheet>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: 12,
  },
  intro: {
    fontFamily: V2Font.medium,
    fontSize: 14,
    lineHeight: 21,
    color: V2Colors.textSecondary,
  },
  list: {
    gap: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  // Altura da primeira linha (13,5 × 1,4): o ponto fica centrado nela.
  bulletSlot: {
    height: 19,
    justifyContent: 'center',
  },
  bullet: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  itemText: {
    flex: 1,
    fontFamily: V2Font.medium,
    fontSize: 13.5,
    lineHeight: 19,
    color: V2Colors.textSecondary,
  },
  footnote: {
    fontFamily: V2Font.medium,
    fontSize: 13,
    lineHeight: 19,
    color: V2Colors.textSecondary,
  },
  actions: {
    gap: 8,
    paddingTop: 6,
  },
});
