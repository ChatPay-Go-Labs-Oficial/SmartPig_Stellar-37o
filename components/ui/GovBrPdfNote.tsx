import { View, Text, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors, Font, FontSize, Radius, Spacing } from '@/constants/theme';

export function GovBrPdfNote() {
  return (
    <View style={styles.wrap}>
      <MaterialIcons name="picture-as-pdf" size={16} color={Colors.mutedForeground} />
      <Text style={styles.text}>
        Também aceitamos o PDF exportado do app Gov.br (Carteira de
        Identidade Digital ou CNH Digital). Nesse caso, envie o mesmo
        arquivo tanto na etapa da frente quanto na do verso.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Colors.muted,
    borderRadius: Radius.sm,
    padding: 12,
    marginBottom: Spacing[6],
  },
  text: {
    flex: 1,
    fontSize: FontSize.label,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
    lineHeight: 17,
  },
});
