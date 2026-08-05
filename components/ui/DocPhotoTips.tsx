import { View, Text, StyleSheet } from 'react-native';
import { Colors, Font, FontSize, Spacing } from '@/constants/theme';

const TIPS = [
  'Coloque o documento sobre uma superfície plana e com boa iluminação',
  'Não aproxime demais a câmera: deixe um pequeno espaço entre as bordas do documento e as bordas da foto',
  'Evite sombras, reflexos e brilhos sobre o documento',
  'Certifique-se de que todo o texto esteja nítido e legível',
];

export function DocPhotoTips() {
  return (
    <View style={styles.wrap}>
      {TIPS.map((tip) => (
        <View key={tip} style={styles.row}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.text}>{tip}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
    marginBottom: Spacing[6],
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  bullet: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
  },
  text: {
    flex: 1,
    fontSize: FontSize.bodySmall,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
    lineHeight: 20,
  },
});
