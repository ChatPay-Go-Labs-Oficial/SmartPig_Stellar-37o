import { View, Text, StyleSheet } from 'react-native';
import { Colors, Font, FontSize, Gradients, Spacing } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

export default function ModalScreen() {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={Gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerBanner}
      >
        <Text style={styles.title}>Modal</Text>
      </LinearGradient>
      <View style={styles.body}>
        <Text style={styles.text}>Conteúdo do modal</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerBanner: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 28,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  title: {
    fontSize: FontSize.displaySm,
    fontFamily: Font.black,
    color: '#fff',
  },
  body: {
    padding: Spacing[6],
  },
  text: {
    fontSize: FontSize.body,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
  },
});
